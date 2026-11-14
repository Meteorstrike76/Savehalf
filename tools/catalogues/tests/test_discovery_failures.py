import sys,tempfile,unittest
from pathlib import Path
from unittest.mock import Mock,patch
from urllib.error import HTTPError
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import pipeline as p
from source_inventory import inventory


class DiscoveryFailureTests(unittest.TestCase):
    def response(self,status,body=b''):
        response=Mock(status=status,headers={})
        response.read.side_effect=[body,b''] if body else [b'']
        response.__enter__=Mock(return_value=response)
        response.__exit__=Mock(return_value=False)
        return response

    def test_non_200_success_status_is_not_an_empty_catalogue(self):
        for code in [202,204,206]:
            client=p.Client(delay=0); response=self.response(code)
            client.opener=Mock();client.opener.open.return_value=response
            with self.assertRaises(HTTPError) as caught:client.raw(p.BASE+'/stores')
            self.assertEqual(caught.exception.code,code)
            response.read.assert_not_called()
            self.assertEqual(client.requests,1)

    def test_empty_200_is_reported_instead_of_silent_no_stores(self):
        client=p.Client(delay=0);client.opener=Mock()
        client.opener.open.return_value=self.response(200)
        with self.assertRaisesRegex(ValueError,'empty_response'):client.raw(p.BASE+'/stores')
        self.assertEqual(client.last_status,200)

    def test_conditional_304_retains_existing_cache_semantics(self):
        client=p.Client(delay=0);client.opener=Mock()
        client.opener.open.side_effect=HTTPError(p.BASE+'/stores',304,'',{'ETag':'"fixture"'},None)
        self.assertEqual(client.raw(p.BASE+'/stores'),b'')
        self.assertEqual(client.last_status,304)

    def test_robots_challenge_stops_without_requesting_store_index(self):
        client=p.Client(delay=0);client.opener=Mock()
        client.opener.open.return_value=self.response(202)
        with self.assertRaises(HTTPError):client.get(p.BASE+'/stores')
        self.assertEqual(client.requests,1)
        self.assertEqual(client.last_url,p.BASE+'/robots.txt')

    def test_discovery_failure_reaches_manifest_and_store_inventory(self):
        client=p.Client(delay=0);client.opener=Mock()
        client.opener.open.return_value=self.response(202)
        with tempfile.TemporaryDirectory() as tmp,patch.object(p,'targets',return_value=['Coles','Woolworths']):
            report=p.run(Path('.'),Path(tmp),client,2,2,2)
        self.assertEqual(report['discovery_diagnostic'],dict(stage='discovery',kind='upstream',http_status=202,host='www.catalogueoffers.com.au',path='/robots.txt'))
        self.assertEqual(inventory(report)['outcomes'],{'failed':2})
        self.assertTrue(all(r['diagnostic']['http_status']==202 for r in report['stores']))
        self.assertEqual(report['requests'],1)


if __name__=='__main__':unittest.main()
