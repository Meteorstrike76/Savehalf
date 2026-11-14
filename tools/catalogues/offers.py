"""Extract source-labelled offer cards; never infer prices from page proximity."""
import re
from html.parser import HTMLParser
from urllib.parse import urljoin, urlsplit

VOID = {'img', 'input', 'br', 'hr', 'meta', 'link', 'source', 'wbr', 'area', 'embed', 'param', 'col', 'base', 'track'}

class Node:
    def __init__(self, tag='', attrs=None):
        self.tag, self.attrs, self.children = tag, attrs or {}, []
    def walk(self):
        yield self
        for child in self.children:
            if isinstance(child, Node):
                yield from child.walk()
    def text(self):
        return ' '.join(' '.join(c.text() if isinstance(c, Node) else c for c in self.children).split())
    def has_class(self, cls):
        return cls in self.attrs.get('class', '').split()
    def find_class(self, cls):
        return [n for n in self.walk() if n.has_class(cls)]

class Tree(HTMLParser):
    def __init__(self, text):
        super().__init__(convert_charrefs=True)
        self.root = Node()
        self.stack = [self.root]
        self.feed(text)
    def handle_starttag(self, tag, attrs):
        node = Node(tag, dict(attrs))
        self.stack[-1].children.append(node)
        if tag not in VOID:
            self.stack.append(node)
    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        if tag not in VOID:
            self.handle_endtag(tag)
    def handle_endtag(self, tag):
        for index in range(len(self.stack)-1, 0, -1):
            if self.stack[index].tag == tag:
                del self.stack[index:]
                break
    def handle_data(self, data):
        self.stack[-1].children.append(data)


def exact_price(text):
    # No rounding, multi-buy interpretation, dollar/cents reconstruction or
    # substitution of unit/reference prices for the advertised selling price.
    match = re.fullmatch(r'\$(\d{1,5}\.\d{2})', text)
    return match[1] if match else None


def offer_cards(text, store, listing_url, safe_url, maximum=25):
    tree = Tree(text)
    cards = [n for n in tree.root.walk() if n.tag == 'a' and n.has_class('js-offer-link-item')]
    accepted, rejected, seen = [], [], set()
    for card in cards[:maximum]:
        identity = card.attrs.get('data-offer-id', '')
        names, prices = card.find_class('product__name'), card.find_class('product__price-offer')
        images = card.find_class('product__image')
        reason = None
        if not identity.isdigit() or identity in seen:
            reason = 'missing_or_duplicate_offer_id'
        elif len(names) != 1 or len(prices) != 1 or not exact_price(prices[0].text()):
            reason = 'name_or_exact_price_drift'
        else:
            seen.add(identity)
            source = urlsplit(urljoin(listing_url, card.attrs.get('href', '')))
            listing_slug = urlsplit(listing_url).path.split('/')[2]
            if source.scheme!='https' or source.username or source.password or source.port not in (None,443) or source.hostname != 'www.catalogueoffers.com.au' or not source.path.startswith('/view/offers/'+listing_slug+'-') or source.query != 'offer='+identity or not re.fullmatch(r'page=\d+', source.fragment):
                reason = 'offer_provenance_drift'
        if reason:
            rejected.append({'offer_id': identity, 'reason': reason})
            continue
        image_urls = [n.attrs.get('src', '') for group in images for n in group.walk() if n.tag == 'img']
        try:
            image = safe_url(image_urls[0]) if len(image_urls) == 1 else None
            if image and '/assets/uploads/offers/au/'+identity+'/' not in image:
                image = None
            catalogue_url = safe_url(source.path)
        except ValueError:
            rejected.append({'offer_id': identity, 'reason': 'asset_or_catalogue_url_drift'})
            continue
        references = card.find_class('product__price-normal')
        accepted.append({'offer_id': identity, 'store': store, 'name': names[0].text(),
            'advertised_price': exact_price(prices[0].text()), 'price_text': prices[0].text(),
            'reference_price_text': references[0].text() if len(references)==1 else None,
            'image_url': image, 'source_url': urljoin(listing_url, card.attrs['href']),
            'catalogue_url': catalogue_url, 'page_number': int(source.fragment.split('=')[1]),
            'pack_size': None, 'conditions': None, 'region': None,
            'status': 'needs_catalogue_dates', 'publishable': False})
    return {'offers': accepted, 'rejected': rejected,
            'observed_cards': len(cards), 'partial': len(cards) > maximum}
