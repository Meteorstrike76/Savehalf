"""Offline pilot acceptance. A completed process alone is not collection success."""
import argparse,json,re
from datetime import datetime,timedelta,timezone
from pathlib import Path
from urllib.parse import urlsplit
from feed import export_feed

PILOT={'Coles','Woolworths'}


def assess(report,feed,now=None):
    now=now or datetime.now(timezone.utc)
    errors=[]
    def check(ok,code):
        if not ok:errors.append(code)
    try:
        captured=datetime.fromisoformat(report['captured_at'])
        check(captured.tzinfo is not None and captured<=now and now-captured<=timedelta(hours=1),'capture_not_recent')
        limits=report['limits']
        for field,cap in [('requests',20),('viewers',2),('images',2),('specials',2)]:
            check(type(limits.get(field)) is int and 0<=limits[field]<=cap,'invalid_'+field+'_limit')
        check(type(report.get('requests')) is int and 0<report['requests']<=20,'request_budget')
        check(type(report.get('body_bytes')) is int and 0<=report['body_bytes']<=40_000_000,'byte_budget')
        stores=report['stores']
        check(len(stores)==2 and {r['store'] for r in stores}==PILOT,'pilot_store_scope')
        viewers=images=0
        for row in stores:
            check(not row.get('failure'),'store_failure')
            checked=datetime.fromisoformat(row['source_checked_at'])
            check(checked.tzinfo is not None and captured<=checked<=now,'invalid_source_check_time')
            for offer in row['offer_cards']['offers']:
                check(offer['store']==row['store'],'source_store_mismatch')
            viewers+=len(row.get('viewers',[]))
            images+=sum(not image.get('cached',False) for viewer in row.get('viewers',[]) for image in viewer.get('images',[]))
        check(viewers<=2 and images<=2,'viewer_or_image_budget')
        expected=export_feed(report,now)
        ads=feed['ads']
        check(feed.get('schema_version')==1 and feed.get('source')=='CatalogueOffers','feed_contract')
        check(len(ads)<=50,'feed_row_budget')
        check(sorted(ads,key=lambda p:p['id'])==sorted(expected['ads'],key=lambda p:p['id']),'feed_not_grounded_in_this_run')
        check({p['store'] for p in ads}==PILOT,'missing_pilot_store_offers')
        ids=set()
        for ad in ads:
            check(ad['id'] not in ids,'duplicate_offer');ids.add(ad['id'])
            check(ad.get('eligible_for_verified_deals') is False and ad.get('status')=='source_advertisement','unsupported_verified_claim')
            check(isinstance(ad.get('name'),str) and 2<=len(ad['name'])<=250 and ad.get('price_text')=='$'+ad['advertised_price'],'display_contract')
            source=urlsplit(ad['source_url'])
            identity=ad['offer_id']
            check(isinstance(identity,str) and identity.isdigit() and ad['id']==ad['store']+':'+identity,'offer_identity')
            check(source.scheme=='https' and source.hostname=='www.catalogueoffers.com.au' and not source.username and not source.password and source.port in [None,443] and source.query=='offer='+identity and bool(re.fullmatch(r'page=\d+',source.fragment)),'source_provenance')
            check(ad['catalogue_url']=='https://www.catalogueoffers.com.au'+source.path,'catalogue_identity')
            if ad.get('image_url'):
                image=urlsplit(ad['image_url'])
                check(image.scheme=='https' and image.hostname=='img.offers-cdn.net' and not image.username and not image.password and image.port in [None,443] and not image.query and not image.fragment and image.path.startswith('/assets/uploads/offers/au/'+identity+'/'),'image_identity')
        return {'schema_version':1,'accepted':not errors,'checks_failed':sorted(set(errors)),
                'stores_with_ads':sorted({p['store'] for p in ads}),'advertisements':len(ads),
                'requests':report['requests'],'body_bytes':report['body_bytes'],
                'scope':'pilot source advertisements; not verified local prices, stock or complete coverage'}
    except (ValueError,KeyError,TypeError,AttributeError,OverflowError):
        # Never echo malformed fields or exception payloads into logs.
        return {'schema_version':1,'accepted':False,'checks_failed':sorted(set(errors+['malformed_or_unverifiable_evidence']))}


def read(path):
    if path.stat().st_size>2_000_000:raise ValueError('oversized_evidence')
    return json.loads(path.read_text())


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--directory',type=Path,default=Path('catalogue-artifacts'))
    args=parser.parse_args()
    try:result=assess(read(args.directory/'manifest.json'),read(args.directory/'website-feed.json'))
    except (OSError,ValueError):result={'accepted':False,'checks_failed':['missing_or_unreadable_evidence']}
    path=args.directory/'pilot-acceptance.json';path.parent.mkdir(parents=True,exist_ok=True)
    path.write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result,indent=2))
    if not result['accepted']:raise SystemExit(2)

if __name__=='__main__':main()
