"""Export attributed catalogue advertisements with fail-closed date windows."""
import json
import re
from datetime import datetime, timedelta, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

ZONES = {'NSW':'Australia/Sydney','VIC':'Australia/Melbourne','ACT':'Australia/Sydney',
         'QLD':'Australia/Brisbane','TAS':'Australia/Hobart','SA':'Australia/Adelaide',
         'NT':'Australia/Darwin','WA':'Australia/Perth'}


def window(validity, region=None):
    if not isinstance(validity, dict):
        raise ValueError('missing_absolute_dates')
    start = datetime.strptime(validity['valid_from_date'], '%Y-%m-%d')
    end = datetime.strptime(validity['valid_through_date'], '%Y-%m-%d') + timedelta(days=1)
    if not start < end or (end-start).days > 370:
        raise ValueError('invalid_date_window')
    if region in ZONES:
        start = start.replace(tzinfo=ZoneInfo(ZONES[region]))
        end = end.replace(tzinfo=ZoneInfo(ZONES[region]))
    else:
        # Dates remain source facts. Unknown geography never becomes 'Australia-wide'.
        # Intersect all civil timezone windows: activate late and expire early,
        # so unknown-region advertisements cannot outlive their calendar dates.
        start = start.replace(tzinfo=timezone(timedelta(hours=-12)))
        end = end.replace(tzinfo=timezone(timedelta(hours=14)))
    return start.astimezone(timezone.utc).isoformat(), end.astimezone(timezone.utc).isoformat()


def region_evidence(tsv):
    # Specific printer-edition code seen in Coles footers, not arbitrary OCR 'WA'.
    found = set(re.findall(r'\bFP-(NSW|VIC|ACT|QLD|TAS|SA|NT|WA)-', tsv))
    return next(iter(found)) if len(found)==1 else None


def export_feed(report, now=None):
    now = now or datetime.now(timezone.utc)
    ads, held, seen = [], [], set()
    captured = datetime.fromisoformat(report['captured_at'])
    if captured.tzinfo is None or captured > now or now-captured > timedelta(hours=24):
        raise ValueError('stale_or_future_capture')
    for store in report['stores']:
        viewers = {v['source_url']:v for v in store.get('viewers', [])}
        for offer in store.get('offer_cards', {}).get('offers', []):
            identity = offer['store'] + ':' + offer['offer_id']
            if identity in seen:
                continue
            viewer = viewers.get(offer['catalogue_url'], {})
            if not viewer.get('validity'):
                identity_match=re.search(r'-(\d+)$',offer['catalogue_url'])
                if identity_match:
                    for catalogue in store.get('catalogues',[]):
                        cover_match=re.search(r'/flyers/(\d+)/',catalogue.get('cover_url',''))
                        if cover_match and cover_match[1]==identity_match[1]:
                            viewer={'validity':{k:catalogue[k] for k in ['valid_from_date','valid_through_date']}}
                            break
            try:
                valid_from, expires_at = window(viewer.get('validity'), viewer.get('region'))
                if not datetime.fromisoformat(valid_from) <= now < datetime.fromisoformat(expires_at):
                    raise ValueError('not_current')
                checked = store.get('source_checked_at')
                check_time = datetime.fromisoformat(checked) if checked else None
                if not check_time or check_time.tzinfo is None or check_time > now or now-check_time > timedelta(hours=24):
                    raise ValueError('missing_or_stale_source_check')
                if not re.fullmatch(r'\d{1,5}\.\d{2}',offer['advertised_price']) or float(offer['advertised_price']) <= 0:
                    raise ValueError('invalid_price')
            except (ValueError, KeyError, TypeError):
                held.append({'id':identity,'reason':'missing_current_dates_or_verified_source_check'})
                continue
            seen.add(identity)
            ads.append({**{k:v for k,v in offer.items() if k not in ['publishable','status']}, 'id':identity, 'status':'source_advertisement',
                        'eligible_for_verified_deals':False, 'region':viewer.get('region'),
                        'valid_from_date':viewer['validity']['valid_from_date'],
                        'valid_through_date':viewer['validity']['valid_through_date'],
                        'visible_from':valid_from, 'expires_at':expires_at,
                        'checked_at':checked,
                        'notice':'Advertised catalogue price. Region, pack size, membership and purchase conditions must be checked at the source. Confirm the price at checkout.'})
    return {'schema_version':1,'generated_at':report['captured_at'],
            'source':'CatalogueOffers','complete':False,'ads':ads,'held':held}


def atomic_json(path, data):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix+'.tmp')
    temporary.write_text(json.dumps(data,indent=2))
    temporary.replace(path)


def merge_feed(previous, current, now=None):
    now=now or datetime.now(timezone.utc)
    if not isinstance(previous,dict) or previous.get('schema_version')!=1 or not isinstance(previous.get('ads'),list) or len(previous['ads'])>700:
        return current
    current_ids={p['id'] for p in current['ads']} | {p['id'] for p in current['held']}
    kept=[]
    for ad in previous['ads']:
        try:
            if ad['id'] in current_ids:
                continue
            start,end,checked=[datetime.fromisoformat(ad[k]) for k in ['visible_from','expires_at','checked_at']]
            if all(t.tzinfo is not None for t in [start,end,checked]) and start<=now<end and checked<=now and now-checked<timedelta(hours=24):
                kept.append(ad)
                current_ids.add(ad['id'])
        except (KeyError,TypeError,ValueError):
            continue
    return {**current,'ads':(current['ads']+kept)[:700]}
