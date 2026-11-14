"""Bounded public catalogue discovery and offline extraction. No private APIs or writes."""
import argparse
import csv
import io
import hashlib
import json
import re
import subprocess
import time
import urllib.error
import urllib.parse
import urllib.request
import urllib.robotparser
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
from viewer import viewer_assets, viewer_script_url, asset_recipe
from offers import offer_cards
from feed import atomic_json, export_feed, region_evidence, merge_feed
from checkpoints import load as load_checkpoints, bounded as bound_checkpoints
from http_cache import SnapshotCache, validator
from source_inventory import inventory, markdown as coverage_markdown
from diagnostics import failure as failure_details

BASE = 'https://www.catalogueoffers.com.au'
HOSTS = {'www.catalogueoffers.com.au', 'img.offers-cdn.net'}
UA = 'SaveHalfCatalogue/1.0'
# Exact aliases verified in the public stores sitemap, not generated endpoints.
STORE_SLUG_ALIASES = {'best-less':'Best & Less', 'bunnings-warehouse':'Bunnings', 'domino-s-pizza':"Domino's"}

class Page(HTMLParser):
    def __init__(self, text):
        super().__init__(convert_charrefs=True)
        self.links, self.images, self.schemas = [], [], []
        self.inline_scripts, self.script_urls = [], []
        self.script_kind = None
        self.meta = {}
        self.recording = False
        self.script = ''
        self.feed(text)
    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == 'a' and a.get('href'):
            self.links.append((a['href'], a.get('title', '')))
        if tag == 'meta':
            self.meta[a.get('name') or a.get('property')] = a.get('content', '')
        if tag == 'img':
            self.images.append(a.get('src', ''))
        if tag == 'script':
            if a.get('src'):
                self.script_urls.append(a['src'])
            self.script_kind = a.get('type')
            self.recording, self.script = True, ''
    def handle_data(self, data):
        if self.recording:
            self.script += data
    def handle_endtag(self, tag):
        if tag == 'script' and self.recording:
            if self.script_kind == 'application/ld+json':
                try:
                    self.schemas.append(json.loads(self.script))
                except ValueError:
                    pass
            elif self.script_kind in (None, 'text/javascript', 'module'):
                self.inline_scripts.append(self.script)
            self.recording = False

def objects(value):
    if isinstance(value, dict):
        yield value
        for child in value.values():
            yield from objects(child)
    elif isinstance(value, list):
        for child in value:
            yield from objects(child)

def safe_url(url, base=BASE):
    u = urllib.parse.urlsplit(urllib.parse.urljoin(base, url))
    if u.scheme != 'https' or u.hostname not in HOSTS or u.username or u.password or u.port not in (None, 443):
        raise ValueError('unapproved_url')
    if u.query or u.fragment:
        raise ValueError('query_or_fragment_not_admitted')
    return urllib.parse.urlunsplit(u)

class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        return None

class Client:
    def __init__(self, requests=80, body_bytes=40_000_000, delay=1.0):
        self.limit, self.byte_limit, self.delay = requests, body_bytes, delay
        self.requests, self.bytes, self.last = 0, 0, 0
        self.robots = {}
        self.last_status, self.last_headers = None, {}
        self.opener = urllib.request.build_opener(NoRedirect)
    def raw(self, url, conditions=None):
        url = safe_url(url)
        if self.requests >= self.limit:
            raise ValueError('request_budget')
        time.sleep(max(0, self.delay - (time.monotonic() - self.last)))
        self.requests += 1
        self.last = time.monotonic()
        headers={'User-Agent':UA,'Accept-Encoding':'identity'}
        headers.update({k:v for k,v in (conditions or {}).items() if k in ['If-None-Match','If-Modified-Since'] and validator(v)})
        request = urllib.request.Request(url, headers=headers)
        try:
            response=self.opener.open(request, timeout=20)
        except urllib.error.HTTPError as error:
            if error.code!=304:raise
            self.last_status=304
            self.last_headers={k.lower():v for k,v in error.headers.items() if k.lower() in ['etag','last-modified'] and validator(v)}
            error.close()
            return b''
        with response:
            self.last_status=getattr(response,'status',200)
            self.last_headers={k.lower():v for k,v in response.headers.items() if k.lower() in ['etag','last-modified'] and validator(v)}
            chunks, size = [], 0
            started = time.monotonic()
            while True:
                chunk = response.read(65536)
                if not chunk:
                    break
                size += len(chunk)
                self.bytes += len(chunk)
                if size > 4_000_000 or self.bytes > self.byte_limit:
                    raise ValueError('byte_budget')
                if time.monotonic() - started > 30:
                    raise ValueError('body_timeout')
                chunks.append(chunk)
            return b''.join(chunks)
    def get(self, url, conditions=None):
        url = safe_url(url)
        origin = 'https://' + urllib.parse.urlsplit(url).netloc
        if origin not in self.robots:
            robot = urllib.robotparser.RobotFileParser()
            robot.parse(self.raw(origin + '/robots.txt').decode('utf-8').splitlines())
            self.robots[origin] = robot
        robot = self.robots[origin]
        if not robot.can_fetch(UA, url):
            raise ValueError('robots_denied')
        self.delay = max(self.delay, robot.crawl_delay(UA) or 0)
        return self.raw(url, conditions)
    def get_conditional(self,url,conditions):
        return self.get(url,conditions)

def targets(root):
    """Read the website's actual lists, including directory-only retailers."""
    main = (root / 'src/lib/stores.ts').read_text()
    primary = re.search(r'STORE_IDS\s*=\s*\[(.*?)\]', main, re.S).group(1)
    names = re.findall(r"'([^']+)'", primary)
    directory = (root / 'src/lib/moreRetailers.ts').read_text().split('// These are discovery')[0]
    names += [a or b for a, b in re.findall(r'''name:\s*(?:'([^']+)'|"([^"]+)")''', directory)]
    return list(dict.fromkeys(names))

def key(name):
    return re.sub(r'[^a-z0-9]', '', name.casefold().replace('&', 'and'))

def discover_store_links(page, names):
    result = {}
    for href, title in page.links:
        match = re.fullmatch(r'/stores/([^/]+)/catalogues-specials', urllib.parse.urlsplit(href).path)
        if not match:
            continue
        for name in names:
            if key(match[1]) == key(name) or STORE_SLUG_ALIASES.get(match[1]) == name or (title and key(title) == key(name)):
                try:
                    result[name] = safe_url(href)
                except ValueError:
                    pass
    return result

def extract(page, source, store):
    catalogues, products = [], []
    for schema in page.schemas:
        for obj in objects(schema):
            kind = obj.get('@type', [])
            kind = [kind] if isinstance(kind, str) else kind if isinstance(kind, list) else []
            if 'ImageObject' in kind and '/flyers/' in str(obj.get('url', '')):
                caption = obj.get('caption') or obj.get('name', '')
                dates = re.search(r'Valid:\s*(\d{2}/\d{2}/\d{4}) until (\d{2}/\d{2}/\d{4})', caption)
                if dates:
                    catalogues.append({'source_url': source, 'store': store,
                        'valid_from_date': datetime.strptime(dates[1], '%d/%m/%Y').date().isoformat(),
                        'valid_through_date': datetime.strptime(dates[2], '%d/%m/%Y').date().isoformat(),
                        'cover_url': obj['url'], 'caption': caption,
                        'status': 'needs_region_and_timezone', 'publishable': False})
            if 'Product' in kind:
                # Preserve source values. Product JSON-LD alone cannot establish
                # regional applicability, multibuy conditions or an image licence.
                products.append({'store': store, 'source_url': source,
                    'evidence': obj, 'status': 'needs_offer_validation', 'publishable': False})
    links = []
    for href, _ in page.links:
        if href.startswith('/view/offers/'):
            try:
                links.append(safe_url(href))
            except ValueError:
                pass
    assets = []
    for url in page.images:
        if '/assets/uploads/flyers/' in url and '/thumbnail' not in url:
            try:
                assets.append(safe_url(url))
            except ValueError:
                pass
    # Viewer metadata exposes absolute dates; never convert relative '3 days'
    # badges into timestamps.
    description = page.meta.get('description', '')
    dates = re.search(r'valid from (\d{2}-\d{2}-\d{4}) until (\d{2}-\d{2}-\d{4})', description, re.I)
    validity = None
    if dates:
        validity = {'valid_from_date': datetime.strptime(dates[1], '%d-%m-%Y').date().isoformat(),
                    'valid_through_date': datetime.strptime(dates[2], '%d-%m-%Y').date().isoformat()}
    return {'validity': validity, 'catalogues': catalogues, 'products': products,
            'viewer_links': list(dict.fromkeys(links)), 'page_images': list(dict.fromkeys(assets))}

def ocr_file(path):
    # No shell, no AI provider, no account, no network. Layout coordinates retained.
    result = subprocess.run(['tesseract', str(path), 'stdout', 'tsv'],
                            capture_output=True, timeout=45, check=True)
    return result.stdout.decode('utf-8')

def ocr_has_words(tsv):
    return any(row.get('level') == '5' and row.get('text', '').strip()
               for row in csv.DictReader(io.StringIO(tsv), delimiter='\t', quoting=csv.QUOTE_NONE))


def run(root, output, client, max_viewers=4, max_images=5, max_specials=8, stores=None):
    output.mkdir(parents=True, exist_ok=True)
    previous_feed = {}
    try:
        feed_path = output / 'website-feed.json'
        if feed_path.stat().st_size <= 2_000_000:
            previous_feed = json.loads(feed_path.read_text())
    except (OSError, ValueError):
        pass
    snapshots = SnapshotCache(output / 'snapshots.json')
    checkpoint_path = output / 'checkpoints.json'
    checkpoints = load_checkpoints(checkpoint_path)
    names = targets(root)
    if stores is not None:
        if not stores or not set(stores).issubset(names):
            raise ValueError('unknown_requested_store')
        names = [n for n in names if n in stores]
    report = {'captured_at': datetime.now(timezone.utc).isoformat(),
              'complete': False, 'stores': [], 'publishable_offers': [],
              'limits': {'requests': client.limit, 'bytes': client.byte_limit,
                         'viewers': max_viewers, 'images': max_images, 'specials': max_specials}}
    # Discovery is from links actually returned by the public store index.
    try:
        index = Page(client.get(BASE + '/stores').decode('utf-8'))
        found = discover_store_links(index, names)
        # Follow only sitemap locations advertised by robots and its index.
        robot = client.robots.get(BASE) if hasattr(client, 'robots') else None
        for sitemap in (robot.site_maps() or [])[:1] if robot else []:
            xml = ET.fromstring(client.get(safe_url(sitemap)))
            locations = [x.text for x in xml.iter() if x.tag.endswith('}loc') and x.text]
            store_maps = [u for u in locations if urllib.parse.urlsplit(u).path == '/stores-sitemap.xml']
            for store_map in store_maps[:1]:
                store_xml = ET.fromstring(client.get(safe_url(store_map)))
                links = [(x.text, '') for x in store_xml.iter() if x.tag.endswith('}loc') and x.text]
                proxy = Page('')
                proxy.links = links
                found.update(discover_store_links(proxy, names))
    except (ValueError, OSError, TimeoutError, ET.ParseError) as error:
        report['discovery_failure'] = type(error).__name__
        found = locals().get('found', {})
    # Rotate priority each UTC day so bounded runs do not always favour Coles.
    offset = (int(datetime.now(timezone.utc).timestamp() // 43200) * max(1, max_specials)) % len(names)
    names = names[offset:] + names[:offset]
    # Persisted HTTP snapshots carry successful check times even for zero-card
    # results. Oldest/never checked sources get the next bounded specials slots.
    def priority(name):
        listing=snapshots.rows.get('listing-v1:'+found.get(name,''),{}).get('payload',{})
        links=listing.get('specials_links',[]) if isinstance(listing,dict) else []
        checked=snapshots.rows.get('offers-v1:'+next(iter(links),''),{}).get('checked_at','')
        return checked
    names=sorted(names,key=priority)
    viewers_used, images_used, specials_used = 0, 0, 0
    scripts = {}
    per_store_viewer_limit = max(1, max_viewers // len(names))
    for store in names:
        row = {'store': store, 'status': 'not_discovered', 'catalogues': [], 'products': [], 'viewers': [], 'requests':0, 'body_bytes':0}
        request_start, byte_start = client.requests, client.bytes
        stage='listing'
        active_url=found.get(store,'')
        report['stores'].append(row)
        if store not in found:
            continue
        try:
            url = found[store]
            row['listing_url']=url
            def parse_listing(text):
                page=Page(text)
                parsed=extract(page,url,store)
                slug=urllib.parse.urlsplit(url).path.split('/')[2]
                observed=[]
                for href,_ in page.links:
                    parts=urllib.parse.urlsplit(href)
                    if parts.path=='/stores/'+slug+'/specials' and not parts.query:
                        try:observed.append(safe_url(href))
                        except ValueError:pass
                return {'data':parsed,'specials_links':list(dict.fromkeys(observed))}
            listing, listing_check = snapshots.fetch(client,url,'listing-v1',parse_listing)
            data=listing['data']
            row['listing_checked_at']=listing_check['checked_at']
            row['specials_url']=next(iter(listing['specials_links']),None)
            row.update(data)
            row['status'] = 'metadata_only' if data['catalogues'] else 'parser_drift'
            # Only viewer links from this retailer's listing. No related-store crawl.
            slug = urllib.parse.urlsplit(url).path.split('/')[2]
            row['offer_cards'] = {'offers': [], 'rejected': [], 'observed_cards': 0}
            if specials_used < max_specials:
                if row['specials_url']:
                    specials_url=row['specials_url']
                    specials_used+=1
                    stage='specials'
                    active_url=specials_url
                    cards, check=snapshots.fetch(client,specials_url,'offers-v1',lambda text:offer_cards(text,store,specials_url,safe_url))
                    row['offer_cards']=cards
                    row['source_checked_at']=check['checked_at']
                    row['source_first_observed_at']=check['first_observed_at']
                    row['source_unchanged']=check['unchanged']
            # Prefer catalogues actually referenced by extracted offers.
            offer_viewers = [o['catalogue_url'] for o in row['offer_cards']['offers']]
            candidate_viewers = list(dict.fromkeys(offer_viewers + data['viewer_links']))
            store_viewers_used = 0
            for viewer in candidate_viewers:
                if not urllib.parse.urlsplit(viewer).path.startswith('/view/offers/' + slug + '-'):
                    continue
                if viewers_used >= max_viewers or store_viewers_used >= per_store_viewer_limit:
                    row['status'] = 'partial_budget'
                    break
                viewers_used += 1
                store_viewers_used += 1
                stage='viewer'
                active_url=viewer
                page = Page(client.get(viewer).decode('utf-8'))
                parsed = extract(page, viewer, store)
                item = {'source_url': viewer, 'products': parsed['products'], 'images': [], 'status': 'staged', 'validity': parsed['validity']}
                row['viewers'].append(item)
                script_url = viewer_script_url(page, safe_url)
                item['script_url']=script_url
                active_url=script_url
                if script_url not in scripts:
                    scripts[script_url],_=snapshots.fetch(client,script_url,'viewer-recipe-v1',asset_recipe)
                plan = viewer_assets(page, scripts[script_url], url, safe_url)
                item.update({'total_pages': plan['total_pages'], 'recipe': plan['recipe'], 'script_url': script_url, 'validity': parsed['validity']})
                for asset in plan['assets']:
                    image = asset['url']
                    previous = checkpoints.get(image)
                    if previous:
                        item['images'].append({'page_number':asset['page_number'], 'url':image,
                                               **previous, 'cached':True, 'publishable':False})
                        if asset['page_number']==1:
                            item['region']=previous.get('region')
                        continue
                    if images_used >= max_images:
                        item['status'] = 'partial_image_budget'
                        break
                    images_used += 1
                    identity = hashlib.sha256(image.encode()).hexdigest()
                    path = output / (identity + '.img')
                    stage='page_image'
                    active_url=image
                    path.write_bytes(client.get(image))
                    try:
                        tsv = ocr_file(path)
                        (output / (identity + '.tsv')).write_text(tsv)
                        status = 'ocr_evidence_only' if ocr_has_words(tsv) else 'ocr_empty'
                        if asset['page_number'] == 1:
                            item['region'] = region_evidence(tsv)
                    except (OSError, subprocess.SubprocessError):
                        status = 'ocr_failed'
                    evidence = {'downloaded_at':datetime.now(timezone.utc).isoformat(),
                                'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),
                                'status':status, 'region':item.get('region') if asset['page_number']==1 else None}
                    item['images'].append({'page_number':asset['page_number'], 'url':image, **evidence,
                                           'file':path.name, 'cached':False, 'publishable':False})
                    if status in ['ocr_empty','ocr_evidence_only']:
                        checkpoints[image]=evidence
                        atomic_json(checkpoint_path, bound_checkpoints(checkpoints))
        except (ValueError, OSError, TimeoutError) as error:
            # Never record response bodies, headers, cookies, signed URLs or exception text.
            row['status'] = 'failed'
            row['failure'] = type(error).__name__
            row['diagnostic'] = failure_details(error,stage)
            parts=urllib.parse.urlsplit(active_url)
            row['diagnostic'].update(host=parts.hostname,path=parts.path)
        row['requests'],row['body_bytes']=client.requests-request_start,client.bytes-byte_start
        report['requests'], report['body_bytes'] = client.requests, client.bytes
        atomic_json(output / 'manifest.json', report)
        atomic_json(output / 'website-feed.json',merge_feed(previous_feed,export_feed(report)))
    report['requests'], report['body_bytes'] = client.requests, client.bytes
    report['http_cache']=snapshots.metrics
    atomic_json(output / 'manifest.json', report)
    atomic_json(output / 'website-feed.json', merge_feed(previous_feed, export_feed(report)))
    coverage=inventory(report)
    atomic_json(output / 'coverage.json',coverage)
    (output / 'coverage.md').write_text(coverage_markdown(coverage))
    return report

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--output', type=Path, default=Path('catalogue-artifacts'))
    parser.add_argument('--requests', type=int, default=40)
    parser.add_argument('--viewers', type=int, default=4)
    parser.add_argument('--images', type=int, default=5)
    parser.add_argument('--specials', type=int, default=8)
    parser.add_argument('--stores', help='Comma-separated exact website retailer names; default: all')
    parser.add_argument('--website-feed', type=Path)
    parser.add_argument('--audit-only',action='store_true',help='Metadata inventory only; no specials, viewer or image downloads')
    args = parser.parse_args()
    if not (1 <= args.requests <= 80 and 0 <= args.viewers <= 10 and 0 <= args.images <= 25 and 0 <= args.specials <= 28):
        parser.error('limits exceed admitted maximum')
    if args.audit_only:
        args.viewers=args.images=args.specials=0
        if args.website_feed:parser.error('Audit-only mode cannot write a website feed')
    root = Path(__file__).resolve().parents[2]
    report = run(root, args.output, Client(args.requests), args.viewers, args.images, args.specials, args.stores.split(',') if args.stores else None)
    if args.website_feed:
        atomic_json(args.website_feed, json.loads((args.output / 'website-feed.json').read_text()))
    print(json.dumps({'stores': len(report['stores']), 'requests': report['requests'],
                      'body_bytes': report['body_bytes'], 'published': 0}))

if __name__ == '__main__':
    main()
