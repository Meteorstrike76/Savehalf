import socket,ssl,sys,unittest
from pathlib import Path
from urllib.error import HTTPError,URLError
HERE=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(HERE))
from diagnostics import failure
class DiagnosticTests(unittest.TestCase):
    def test_transport_subtypes_and_no_error_payload(self):
        for reason,kind in [(socket.gaierror('private payload'),'dns'),(ssl.SSLError('private payload'),'tls'),(TimeoutError('private payload'),'timeout'),(ConnectionRefusedError('private payload'),'refused')]:
            result=failure(URLError(reason),'listing')
            self.assertEqual(result['kind'],kind)
            self.assertNotIn('private payload',str(result))
    def test_http_and_budget_honesty(self):
        result=failure(HTTPError('https://source.test',403,'private payload',{},None),'specials')
        self.assertEqual(result,{'stage':'specials','http_status':403,'kind':'access'})
        self.assertEqual(failure(ValueError('byte_budget'),'page_image')['kind'],'budget')
        self.assertEqual(failure(ValueError('viewer_asset_recipe_drift'),'viewer')['kind'],'parser_drift')
