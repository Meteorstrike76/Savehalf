import sys,unittest
from pathlib import Path
HERE=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(HERE))
from source_inventory import inventory,markdown
class CoverageTests(unittest.TestCase):
    def test_observed_link_does_not_claim_product_extraction(self):
        report={'captured_at':'2026-11-14T00:00:00+00:00','requests':2,'body_bytes':123,'stores':[
            {'store':'Coles','listing_url':'https://www.catalogueoffers.com.au/stores/coles/catalogues-specials','specials_url':'https://www.catalogueoffers.com.au/stores/coles/specials','catalogues':[{'valid_from_date':'2026-11-11','valid_through_date':'2026-11-17'}]},
            {'store':'Missing'}]}
        data=inventory(report)
        self.assertEqual(data['outcomes'],{'metadata_checked':1,'not_discovered':1})
        self.assertEqual(data['stores'][0]['offers_extracted'],0)
        self.assertEqual(data['stores'][0]['current_catalogues'],1)
        self.assertIn('| No |',markdown(data))
    def test_failed_listing_stays_failed(self):
        data=inventory({'captured_at':'2026-11-14T00:00:00+00:00','stores':[{'store':'Coles','listing_url':'url','failure':'HTTPError'}]})
        self.assertEqual(data['stores'][0]['outcome'],'failed')
