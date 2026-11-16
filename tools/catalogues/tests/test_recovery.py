import sys,unittest
from pathlib import Path
from urllib.error import HTTPError
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from recovery import challenge_headers,decision
from diagnostics import failure
from unittest.mock import Mock
from pipeline import Client,BASE

class RecoveryTests(unittest.TestCase):
    def test_markers_are_allowlisted_without_secrets(self):
        self.assertEqual(challenge_headers({'X-Amzn-Waf-Action':'challenge','Set-Cookie':'secret','Authorization':'secret'}),{'x-amzn-waf-action':'challenge'})
        self.assertEqual(challenge_headers({'cf-mitigated':'secret'}),{})
    def test_202_alone_is_not_a_confirmed_challenge(self):
        self.assertEqual(failure(HTTPError('https://example.test',202,'',{},None),'listing')['kind'],'upstream')
    def test_challenge_marker_blocks_even_a_200_before_body_parsing(self):
        response=Mock(status=200,headers={'cf-mitigated':'challenge'})
        response.__enter__=Mock(return_value=response)
        response.__exit__=Mock(return_value=False)
        client=Client(delay=0);client.opener=Mock()
        client.opener.open.return_value=response
        with self.assertRaises(HTTPError) as caught:client.raw(BASE+'/stores')
        self.assertEqual(failure(caught.exception,'listing')['kind'],'verification_required')
        response.read.assert_not_called()
    def test_explicit_challenge_stops_instead_of_retries(self):
        for headers in [{'x-amzn-waf-action':'challenge'},{'x-amzn-waf-action':'captcha'},{'cf-mitigated':'challenge'}]:
            d=failure(HTTPError('https://example.test',202,'secret',headers,None),'listing')
            self.assertEqual(d['kind'],'verification_required')
            self.assertEqual(decision(d)['action'],'pause_source_request_supported_access')
            self.assertNotIn('secret',str(d))
    def test_transient_failure_has_only_one_retry(self):
        for d in [{'kind':'timeout'},{'http_status':503}]:
            self.assertEqual(decision(d,0)['action'],'one_budgeted_retry')
            self.assertEqual(decision(d,1)['action'],'pause_source')
    def test_all_recovery_decisions_deny_publication_and_switching(self):
        for d in [{'http_status':403},{'http_status':429},{'kind':'budget'},{'kind':'parser_drift'},{'http_status':202},{}]:
            r=decision(d);self.assertFalse(r['publish_allowed']);self.assertFalse(r['automatic_source_switch'])

if __name__=='__main__':unittest.main()
