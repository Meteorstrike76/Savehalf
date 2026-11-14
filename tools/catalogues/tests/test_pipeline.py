import importlib.util
import json
import tempfile
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

HERE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(HERE))
spec = importlib.util.spec_from_file_location('pipeline', HERE / 'pipeline.py')
p = importlib.util.module_from_spec(spec)
spec.loader.exec_module(p)

class PipelineTests(unittest.TestCase):
    def test_real_coles_listing_dates_and_no_false_offers(self):
        result = p.extract(p.Page((HERE/'fixtures/coles-listing.html').read_text()), p.BASE, 'Coles')
        self.assertGreaterEqual(len(result['catalogues']), 1)
        first = result['catalogues'][0]
        self.assertEqual(first['valid_from_date'], '2026-11-11')
        self.assertEqual(first['valid_through_date'], '2026-11-17')
        self.assertFalse(first['publishable'])
        self.assertEqual(result['products'], [])
    def test_real_viewer_extracts_explicit_images_without_template_guessing(self):
        result = p.extract(p.Page((HERE/'fixtures/coles-viewer.html').read_text()), p.BASE, 'Coles')
        self.assertEqual(len(result['page_images']), 2)
        self.assertNotIn('%s', ''.join(result['page_images']))
        self.assertIn('/3900091/', result['page_images'][0])
    def test_all_actual_site_retailers_targeted(self):
        names = p.targets(HERE.parents[1])
        for name in ['Coles', 'Best & Less', 'Chemist Warehouse', "Hungry Jack's", 'JB Hi-Fi', 'Bunnings']:
            self.assertIn(name, names)
        self.assertEqual(len(names), len(set(names)))
    def test_discovery_does_not_guess_endpoints(self):
        page = p.Page('<a href="/stores/coles/catalogues-specials">x</a>')
        self.assertEqual(p.discover_store_links(page, ['Coles','Woolworths']), {'Coles':p.BASE+'/stores/coles/catalogues-specials'})
    def test_observed_sitemap_aliases(self):
        page=p.Page('<a href="/stores/best-less/catalogues-specials"></a><a href="/stores/bunnings-warehouse/catalogues-specials"></a><a href="/stores/domino-s-pizza/catalogues-specials"></a>')
        result=p.discover_store_links(page,['Best & Less','Bunnings',"Domino's"])
        self.assertEqual(set(result),{'Best & Less','Bunnings',"Domino's"})
        self.assertEqual(p.discover_store_links(p.Page(''),['Bunnings']),{})
    def test_host_and_query_guards(self):
        for url in ['http://www.catalogueoffers.com.au/', 'https://evil.test/',
                    'https://www.catalogueoffers.com.au@evil.test/',
                    'https://www.catalogueoffers.com.au:444/',
                    '/stores/coles?token=x', '//127.0.0.1/foo']:
            with self.subTest(url=url), self.assertRaises(ValueError):
                p.safe_url(url)
    def test_empty_ocr_is_not_success(self):
        self.assertFalse(p.ocr_has_words('level\ttext\n5\t \n'))
        self.assertTrue(p.ocr_has_words('level\ttext\n5\tColes\n'))
    def test_null_schema_type_is_held(self):
        page=p.Page('<script type="application/ld+json">{"@type":null}</script>')
        self.assertEqual(p.extract(page,p.BASE,'Coles')['products'],[])
    def test_absolute_sitemap_links(self):
        page=p.Page('')
        page.links=[(p.BASE+'/stores/coles/catalogues-specials','')]
        self.assertIn('Coles',p.discover_store_links(page,['Coles']))
    def test_request_cap_before_network(self):
        client = p.Client(requests=0, delay=0)
        with patch.object(client.opener, 'open') as opener:
            with self.assertRaisesRegex(ValueError, 'request_budget'):
                client.raw(p.BASE)
            opener.assert_not_called()
    def test_no_redirect_following(self):
        self.assertIsNone(p.NoRedirect().redirect_request(None,None,301,'m',{},p.BASE))
    def test_robots_denial_no_listing_request(self):
        client = p.Client(delay=0)
        with patch.object(client,'raw',return_value=b'User-agent: *\nDisallow: /stores/') as raw:
            with self.assertRaisesRegex(ValueError,'robots_denied'):
                client.get(p.BASE+'/stores/coles/catalogues-specials')
            self.assertEqual(raw.call_count,1)
    def test_malformed_schema_empty_parse(self):
        result = p.extract(p.Page('<script type="application/ld+json">{</script>'),p.BASE,'Coles')
        self.assertEqual(result['catalogues'],[])
        self.assertEqual(result['products'],[])
    def test_no_product_price_normalisation(self):
        evidence = {'@type':'Product','name':'Fixture only','offers':{'price':'12.30','priceCurrency':'AUD'}}
        page = p.Page('<script type="application/ld+json">'+json.dumps(evidence)+'</script>')
        row = p.extract(page,p.BASE,'Coles')['products'][0]
        self.assertEqual(row['evidence'],evidence)
        self.assertFalse(row['publishable'])
    def test_bounded_run_reports_missing_and_drift_and_never_publishes(self):
        class Fake:
            requests=0; bytes=0; limit=4; byte_limit=4000
            def get(self,url):
                self.requests+=1
                return (b'<a href="/stores/coles/catalogues-specials"></a>' if url.endswith('/stores') else b'<html>changed</html>')
        with tempfile.TemporaryDirectory() as tmp:
            result=p.run(HERE.parents[1],Path(tmp),Fake(),0,0)
            self.assertEqual(result['publishable_offers'],[])
            coles=next(x for x in result['stores'] if x['store']=='Coles')
            woolies=next(x for x in result['stores'] if x['store']=='Woolworths')
            self.assertEqual(coles['status'],'parser_drift')
            self.assertEqual(woolies['status'],'not_discovered')
            self.assertFalse(result['complete'])
            self.assertTrue((Path(tmp)/'manifest.json').exists())
    def test_ocr_uses_bounded_subprocess_without_shell(self):
        with patch.object(p.subprocess,'run') as run:
            run.return_value.stdout=b'level\ttext\n'
            self.assertEqual(p.ocr_file(Path('/tmp/page.img')),'level\ttext\n')
            self.assertEqual(run.call_args.kwargs['timeout'],45)
            self.assertNotIn('shell',run.call_args.kwargs)

if __name__=='__main__':
    unittest.main()
