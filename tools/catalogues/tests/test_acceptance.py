import copy,sys,unittest
from pathlib import Path
from datetime import datetime,timezone,timedelta
HERE=Path(__file__).resolve().parents[1];sys.path.insert(0,str(HERE))
from acceptance import assess
from feed import export_feed
NOW=datetime(2026,11,15,0,tzinfo=timezone.utc)
class AcceptanceTests(unittest.TestCase):
    def setUp(self):
        rows=[]
        for store in ['Coles','Woolworths']:
            catalogue='https://www.catalogueoffers.com.au/view/offers/'+store.lower()+'-catalogue-1'
            rows.append({'store':store,'source_checked_at':NOW.isoformat(),'viewers':[{'source_url':catalogue,'validity':{'valid_from_date':'2026-11-11','valid_through_date':'2026-11-17'},'images':[]}],
                'offer_cards':{'offers':[{'store':store,'offer_id':'123','name':'Synthetic test fixture','advertised_price':'2.50','price_text':'$2.50','source_url':catalogue+'?offer=123#page=1','catalogue_url':catalogue,'image_url':'https://img.offers-cdn.net/assets/uploads/offers/au/123/fixture.webp'}]}})
        self.report={'captured_at':NOW.isoformat(),'requests':16,'body_bytes':1000,'limits':{'requests':20,'viewers':2,'images':2,'specials':2},'stores':rows}
        self.feed=export_feed(self.report,NOW)
    def test_complete_pilot_passes_without_promoting_prices_to_verified(self):
        self.assertTrue(assess(self.report,self.feed,NOW)['accepted'])
    def test_old_capture_and_future_capture_fail(self):
        for age in [timedelta(hours=2),timedelta(hours=-1)]:
            r=copy.deepcopy(self.report);r['captured_at']=(NOW-age).isoformat()
            self.assertFalse(assess(r,self.feed,NOW)['accepted'])
    def test_larger_run_cannot_claim_pilot_acceptance(self):
        for key,value in [('requests',21),('body_bytes',40_000_001)]:
            r=copy.deepcopy(self.report);r[key]=value
            self.assertFalse(assess(r,self.feed,NOW)['accepted'])
    def test_missing_or_failed_store_fails(self):
        r=copy.deepcopy(self.report);r['stores'][0]['failure']='HTTPError'
        self.assertFalse(assess(r,self.feed,NOW)['accepted'])
        f=copy.deepcopy(self.feed);f['ads']=f['ads'][:1]
        self.assertFalse(assess(self.report,f,NOW)['accepted'])
    def test_changed_price_or_cached_old_feed_is_rejected(self):
        for patch in [{'advertised_price':'3.00'},{'checked_at':(NOW-timedelta(minutes=10)).isoformat()}]:
            f=copy.deepcopy(self.feed);f['ads'][0].update(patch)
            self.assertFalse(assess(self.report,f,NOW)['accepted'])
    def test_cross_mode_records_cannot_leak_into_pilot(self):
        f=copy.deepcopy(self.feed);f['ads'].append({**f['ads'][0],'id':'Aldi:123','store':'Aldi'})
        self.assertFalse(assess(self.report,f,NOW)['accepted'])
    def test_mismatched_image_rejected_even_if_present_in_manifest(self):
        r=copy.deepcopy(self.report);r['stores'][0]['offer_cards']['offers'][0]['image_url']='https://img.offers-cdn.net/assets/uploads/offers/au/999/other.webp'
        self.assertFalse(assess(r,export_feed(r,NOW),NOW)['accepted'])
    def test_duplicate_and_malformed_evidence_fail_closed(self):
        f=copy.deepcopy(self.feed);f['ads'].append(f['ads'][0])
        self.assertFalse(assess(self.report,f,NOW)['accepted'])
        self.assertFalse(assess({}, {},NOW)['accepted'])
    def test_expiry_at_boundary_cannot_pass(self):
        end=datetime.fromisoformat(self.feed['ads'][0]['expires_at'])
        self.assertFalse(assess(self.report,self.feed,end)['accepted'])

    def test_missing_display_field_does_not_pass_a_blank_browser_feed(self):
        r=copy.deepcopy(self.report);del r['stores'][0]['offer_cards']['offers'][0]['price_text']
        self.assertFalse(assess(r,export_feed(r,NOW),NOW)['accepted'])

    def test_invalid_fields_are_not_echoed_in_acceptance_logs(self):
        r=copy.deepcopy(self.report);r['requests']='must-not-leak'
        result=assess(r,self.feed,NOW)
        self.assertFalse(result['accepted']);self.assertNotIn('must-not-leak',str(result))
