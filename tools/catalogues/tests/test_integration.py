"""Synthetic end-to-end contract test; no fixture offers are published."""
import json
import sys
import tempfile
import unittest
from datetime import datetime,timedelta,timezone
from pathlib import Path
from unittest.mock import patch
HERE=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(HERE))
import pipeline as p

class IntegrationTests(unittest.TestCase):
    def test_run_joins_cards_dates_region_and_resumes_without_refetching_image(self):
        today=datetime.now(timezone.utc).date()
        first=(today-timedelta(days=2)).strftime('%d-%m-%Y')
        last=(today+timedelta(days=3)).strftime('%d-%m-%Y')
        base=p.BASE
        viewer=base+'/view/offers/coles-catalogue-1'
        script='https://img.offers-cdn.net/booklet/folder-viewer.123abc.js'
        image='https://img.offers-cdn.net/assets/uploads/flyers/2/large/fixture.jpeg'
        listing='<a href="/stores/coles/specials"></a><a href="/view/offers/coles-catalogue-1"></a>'
        special='''<a class="js-offer-link-item" data-offer-id="10" href="/view/offers/coles-catalogue-1?offer=10#page=1"><h3 class="product__name">Fixture product</h3><div class="product__price-offer">$2.50</div><div class="product__image"><img src="https://img.offers-cdn.net/assets/uploads/offers/au/10/fixture.webp"></div></a>'''
        html=('<meta name="description" content="valid from '+first+' until '+last+'">'
              '<script>let storeUrl="/stores/coles/catalogues-specials";'
              'let cdnDomain="https://img.offers-cdn.net";'
              'let flyerPages=[{"page":"/assets/uploads/flyers/2/%s/fixture.jpeg"}];</script>'
              '<script src="'+script+'"></script>')
        responses={base+'/stores':'<a href="/stores/coles/catalogues-specials"></a>',
                   base+'/stores/coles/catalogues-specials':listing,base+'/stores/coles/specials':special,
                   viewer:html,script:(HERE/'fixtures/viewer-recipe.js').read_text(),image:b'fixture-image'}
        class Client:
            limit=20;byte_limit=40000000
            def __init__(self):self.requests=0;self.bytes=0;self.urls=[]
            def get(self,url):
                self.urls.append(url);self.requests+=1
                value=responses[url]
                value=value.encode() if isinstance(value,str) else value
                self.bytes+=len(value);return value
        with tempfile.TemporaryDirectory() as tmp, patch.object(p,'targets',return_value=['Coles']), patch.object(p,'ocr_file',return_value='level\ttext\n5\tFP-VIC-METRO-1111\n') as ocr:
            one=Client();p.run(HERE.parents[1],Path(tmp),one,1,1,1)
            feed=json.loads((Path(tmp)/'website-feed.json').read_text())
            self.assertEqual(len(feed['ads']),1)
            self.assertEqual(feed['ads'][0]['advertised_price'],'2.50')
            self.assertEqual(feed['ads'][0]['region'],'VIC')
            self.assertFalse(feed['ads'][0]['eligible_for_verified_deals'])
            first_state=json.loads((Path(tmp)/'checkpoints.json').read_text())
            two=Client();p.run(HERE.parents[1],Path(tmp),two,1,0,1)
            self.assertNotIn(image,two.urls)
            self.assertEqual(ocr.call_count,1)
            second_state=json.loads((Path(tmp)/'checkpoints.json').read_text())
            self.assertEqual(first_state[image]['downloaded_at'],second_state[image]['downloaded_at'])
