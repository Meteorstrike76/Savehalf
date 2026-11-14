import sys
import unittest
from pathlib import Path
HERE=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(HERE))
from pipeline import Page, safe_url
from viewer import asset_recipe, viewer_assets, viewer_script_url

class ViewerTests(unittest.TestCase):
    def setUp(self):
        self.html=(HERE/'fixtures/coles-viewer-recipe.html').read_text()
        self.js=(HERE/'fixtures/viewer-recipe.js').read_text()
        self.listing='https://www.catalogueoffers.com.au/stores/coles/catalogues-specials'
    def test_full_resolution_from_source_recipe(self):
        result=viewer_assets(Page(self.html),self.js,self.listing,safe_url)
        self.assertEqual(result['total_pages'],2)
        self.assertEqual(result['assets'][0]['page_number'],1)
        self.assertIn('/3900091/large/',result['assets'][0]['url'])
        self.assertNotIn('260x270',str(result))
    def test_changed_variable_name(self):
        self.assertEqual(asset_recipe(self.js.replace('I','resolvedSize'))['size'],'large')
    def test_changed_recipe_is_drift(self):
        with self.assertRaisesRegex(ValueError,'recipe_drift'):
            asset_recipe(self.js.replace('large','unknownResolution'))
    def test_no_evaluation_of_page_script(self):
        bad=self.html.replace('let flyerPages = [','let flyerPages = executeAndReturn([')
        with self.assertRaisesRegex(ValueError,'literal_missing'):
            viewer_assets(Page(bad),self.js,self.listing,safe_url)
    def test_wrong_store_held(self):
        with self.assertRaisesRegex(ValueError,'store_mismatch'):
            viewer_assets(Page(self.html),self.js,self.listing.replace('coles','woolworths'),safe_url)
    def test_path_traversal_held(self):
        bad=self.html.replace('/%s/','/../%s/')
        with self.assertRaisesRegex(ValueError,'template_drift'):
            viewer_assets(Page(bad),self.js,self.listing,safe_url)
    def test_script_must_be_observed(self):
        self.assertIn('/booklet/folder-viewer.',viewer_script_url(Page(self.html),safe_url))
        with self.assertRaisesRegex(ValueError,'script_missing'):
            viewer_script_url(Page(''),safe_url)
