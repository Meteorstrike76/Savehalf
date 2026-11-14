import copy
import sys
import unittest
from datetime import datetime, timezone
from pathlib import Path
HERE=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(HERE))
from feed import export_feed, window, region_evidence

NOW=datetime(2026,11,14,12,tzinfo=timezone.utc)
class FeedTests(unittest.TestCase):
    def setUp(self):
        self.report={'captured_at':NOW.isoformat(),'stores':[{'source_checked_at':NOW.isoformat(),
          'viewers':[{'source_url':'catalogue','region':'VIC','validity':{'valid_from_date':'2026-11-11','valid_through_date':'2026-11-17'}}],
          'offer_cards':{'offers':[{'store':'Coles','offer_id':'1','advertised_price':'15.00','catalogue_url':'catalogue'}]}}]}
    def test_current_ad_keeps_price_and_region_and_cannot_become_verified_deal(self):
        result=export_feed(self.report,NOW)
        self.assertEqual(result['ads'][0]['advertised_price'],'15.00')
        self.assertEqual(result['ads'][0]['region'],'VIC')
        self.assertFalse(result['ads'][0]['eligible_for_verified_deals'])
        self.assertEqual(result['ads'][0]['expires_at'],'2026-11-17T13:00:00+00:00')
    def test_unknown_region_uses_conservative_date_window(self):
        start,end=window({'valid_from_date':'2026-11-11','valid_through_date':'2026-11-17'})
        self.assertEqual(start,'2026-11-11T12:00:00+00:00')
        self.assertEqual(end,'2026-11-17T10:00:00+00:00')
    def test_expired_and_future_catalogues_are_held(self):
        for dates in [{'valid_from_date':'2026-11-01','valid_through_date':'2026-11-13'},
                      {'valid_from_date':'2026-11-15','valid_through_date':'2026-11-17'}]:
            self.report['stores'][0]['viewers'][0]['validity']=dates
            self.assertEqual(export_feed(self.report,NOW)['ads'],[])
    def test_missing_metadata_is_held(self):
        self.report['stores'][0]['viewers']=[]
        self.assertEqual(export_feed(self.report,NOW)['ads'],[])
    def test_missing_source_timestamp_cannot_refresh_capture(self):
        del self.report['stores'][0]['source_checked_at']
        self.assertEqual(export_feed(self.report,NOW)['ads'],[])
    def test_replayed_old_manifest_cannot_be_refreshed(self):
        self.report['captured_at']='2026-11-01T12:00:00+00:00'
        with self.assertRaises(ValueError):export_feed(self.report,NOW)
    def test_expiry_boundary_excluded(self):
        now=datetime(2026,11,17,13,tzinfo=timezone.utc)
        self.report['captured_at']=now.isoformat()
        self.report['stores'][0]['source_checked_at']=now.isoformat()
        self.assertEqual(export_feed(self.report,now)['ads'],[])
    def test_region_requires_printer_code_not_product_word(self):
        self.assertEqual(region_evidence('FP-VIC-METRO-1111-26-873965'),'VIC')
        self.assertIsNone(region_evidence('WA SA VIC'))
        self.assertIsNone(region_evidence('FP-VIC-METRO FP-NSW-METRO'))
    def test_duplicate_offer_is_once_only(self):
        self.report['stores'][0]['offer_cards']['offers']*=2
        self.assertEqual(len(export_feed(self.report,NOW)['ads']),1)

class MergeTests(unittest.TestCase):
    def test_merge_preserves_source_check_time_and_expires_old_rows(self):
        from feed import merge_feed
        ad={'id':'Coles:1','visible_from':'2026-11-11T00:00:00+00:00','expires_at':'2026-11-17T00:00:00+00:00','checked_at':'2026-11-14T11:00:00+00:00'}
        current={'ads':[],'held':[]}
        result=merge_feed({'schema_version':1,'ads':[ad]},current,NOW)
        self.assertEqual(result['ads'][0]['checked_at'],ad['checked_at'])
        self.assertEqual(merge_feed({'schema_version':1,'ads':[ad]},current,datetime(2026,11,15,12,tzinfo=timezone.utc))['ads'],[])
    def test_quarantined_new_observation_removes_previous_ad(self):
        from feed import merge_feed
        old={'id':'Coles:1','visible_from':'2026-11-11T00:00:00+00:00','expires_at':'2026-11-17T00:00:00+00:00','checked_at':'2026-11-14T11:00:00+00:00'}
        self.assertEqual(merge_feed({'schema_version':1,'ads':[old]},{'ads':[],'held':[{'id':'Coles:1'}]},NOW)['ads'],[])
