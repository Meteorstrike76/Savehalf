import hashlib,json,sys,tempfile,unittest
from datetime import datetime,timezone
from pathlib import Path
from unittest.mock import patch
from urllib.error import HTTPError
from email.message import Message
HERE=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(HERE))
from http_cache import SnapshotCache,validator
from pipeline import Client

class CacheTests(unittest.TestCase):
    def test_304_skips_parse_and_preserves_original_observation(self):
        class Fake:
            def __init__(self):self.calls=[];self.last_headers={'etag':'"v1"'};self.last_status=200
            def get_conditional(self,url,headers):
                self.calls.append(headers)
                self.last_status=200 if len(self.calls)==1 else 304
                return b'{"price":"2.50"}' if self.last_status==200 else b''
        with tempfile.TemporaryDirectory() as tmp:
            path=Path(tmp)/'cache.json';cache=SnapshotCache(path);client=Fake()
            parse=unittest.mock.Mock(side_effect=json.loads)
            first,a=cache.fetch(client,'https://www.catalogueoffers.com.au/stores/coles/specials','offers-v1',parse)
            cache=SnapshotCache(path)
            second,b=cache.fetch(client,'https://www.catalogueoffers.com.au/stores/coles/specials','offers-v1',parse)
            self.assertEqual(first,second);self.assertEqual(parse.call_count,1)
            self.assertEqual(client.calls,[{}, {'If-None-Match':'"v1"'}])
            self.assertEqual(a['first_observed_at'],b['first_observed_at'])
            self.assertEqual(b['http_status'],304);self.assertTrue(b['unchanged'])
    def test_unconditional_304_cannot_invent_snapshot(self):
        class Fake:
            last_status=304;last_headers={}
            def get_conditional(self,*args):return b''
        with tempfile.TemporaryDirectory() as tmp:
            with self.assertRaisesRegex(ValueError,'unverified_304'):
                SnapshotCache(Path(tmp)/'cache.json').fetch(Fake(),'url','offers-v1',json.loads)
    def test_failed_fetch_keeps_previous_snapshot(self):
        class Fake:
            last_status=200;last_headers={}
            def get_conditional(self,*args):return b'{"ok":true}'
        with tempfile.TemporaryDirectory() as tmp:
            path=Path(tmp)/'cache.json';cache=SnapshotCache(path)
            cache.fetch(Fake(),'url','test',json.loads);original=path.read_text()
            with patch.object(Fake,'get_conditional',side_effect=TimeoutError),self.assertRaises(TimeoutError):
                cache.fetch(Fake(),'url','test',json.loads)
            self.assertEqual(path.read_text(),original)
    def test_corrupt_digest_not_reused(self):
        with tempfile.TemporaryDirectory() as tmp:
            path=Path(tmp)/'cache.json'
            now=datetime.now(timezone.utc).isoformat()
            path.write_text(json.dumps({'key':{'revision':1,'checked_at':now,'first_observed_at':now,'payload':{},'digest':'bad'}}))
            self.assertEqual(SnapshotCache(path).rows,{})
    def test_header_injection_and_large_validators_rejected(self):
        for value in ['x\r\nAuthorization: x','a'*513,None]:self.assertIsNone(validator(value))
    def test_transport_charges_304_request_without_body(self):
        client=Client(2,delay=0)
        headers=Message();headers['ETag']='"v1"'
        error=HTTPError('https://www.catalogueoffers.com.au/',304,'Not Modified',headers,None)
        with patch.object(client.opener,'open',side_effect=error):
            self.assertEqual(client.raw('https://www.catalogueoffers.com.au/',{'If-None-Match':'"v1"'}),b'')
        self.assertEqual(client.requests,1);self.assertEqual(client.bytes,0)
        self.assertEqual(client.last_status,304)
