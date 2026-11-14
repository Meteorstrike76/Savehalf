"""A source inventory, explicitly separate from verified product coverage."""
from collections import Counter
from datetime import datetime, timezone
from feed import window


def inventory(report):
    now=datetime.fromisoformat(report['captured_at'])
    rows=[]
    for row in report['stores']:
        current=future=expired=unknown=0
        for catalogue in row.get('catalogues',[]):
            try:
                start,end=window(catalogue)
                start,end=datetime.fromisoformat(start),datetime.fromisoformat(end)
                if now<start:future+=1
                elif now>=end:expired+=1
                else:current+=1
            except (KeyError,ValueError,TypeError):unknown+=1
        cards=row.get('offer_cards',{})
        outcome=('not_discovered' if not row.get('listing_url') else
                 'failed' if row.get('failure') else
                 'offers_checked' if row.get('source_checked_at') else 'metadata_checked')
        rows.append({'store':row['store'],'listing_url':row.get('listing_url'),
                     'specials_url':row.get('specials_url'),'outcome':outcome,
                     'current_catalogues':current,'future_catalogues':future,
                     'expired_catalogues':expired,'unknown_dates':unknown,
                     'cards_observed':cards.get('observed_cards',0),
                     'offers_extracted':len(cards.get('offers',[])),
                     'offers_rejected':len(cards.get('rejected',[])),
                     'partial':cards.get('partial',False) or row.get('status')=='partial_budget',
                     'source_checked_at':row.get('source_checked_at'),
                     'failure':row.get('failure'),'diagnostic':row.get('diagnostic'),
                     'requests':row.get('requests',0),'body_bytes':row.get('body_bytes',0),
                     'method':'source_cards_and_optional_page_OCR' if row.get('specials_url') else 'catalogue_metadata_only'})
    return {'captured_at':report['captured_at'],'scope':'observed source inventory; not retailer stock or complete product coverage',
            'requests':report.get('requests',0),'body_bytes':report.get('body_bytes',0),
            'outcomes':dict(Counter(r['outcome'] for r in rows)),
            'http_cache':report.get('http_cache',{}),'stores':sorted(rows,key=lambda r:r['store'].casefold())}


def markdown(data):
    lines=['# Catalogue source coverage audit','', 'Captured: '+data['captured_at'],'',
           data['scope']+'.','',
           f"Requests: {data['requests']}; body bytes: {data['body_bytes']}.",'',
           '| Store | Source listing | Current catalogues | Upcoming | Offer route | Extraction checked | Failure |',
           '|---|---|---:|---:|---|---|---|']
    for r in data['stores']:
        link='[Observed]('+r['listing_url']+')' if r['listing_url'] else 'Not discovered'
        route='[Observed link]('+r['specials_url']+')' if r['specials_url'] else 'No observed link'
        lines.append(f"| {r['store']} | {link} | {r['current_catalogues']} | {r['future_catalogues']} | {route} | {'Yes' if r['source_checked_at'] else 'No'} | {r['failure'] or '—'} |")
    lines+=['','Dates use the conservative unknown-region publication window. A missing catalogue or route is not evidence that the retailer has no offers. A metadata-only audit does not test product extraction.','']
    return '\n'.join(lines)
