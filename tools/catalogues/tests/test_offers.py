import sys
import unittest
from pathlib import Path
HERE=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(HERE))
from offers import exact_price, offer_cards
from pipeline import safe_url

class OfferTests(unittest.TestCase):
    def setUp(self):
        self.html=(HERE/'fixtures/coles-offers.html').read_text()
        self.url='https://www.catalogueoffers.com.au/stores/coles/specials'
    def test_observed_fields_remain_exact(self):
        result=offer_cards(self.html,'Coles',self.url,safe_url)
        self.assertEqual(len(result['offers']),2)
        first=result['offers'][0]
        self.assertEqual(first['offer_id'],'70526406')
        self.assertEqual(first['name'],'Botter Prosecco DOC')
        self.assertEqual(first['advertised_price'],'15.00')
        self.assertEqual(first['reference_price_text'],'$22.00')
        self.assertIn('/70526406/',first['image_url'])
        self.assertIsNone(first['conditions'])
        self.assertFalse(first['publishable'])
    def test_units_and_multibuy_not_parsed_as_single_price(self):
        for value in ['$2.50 per 100g','2 for $5.00','$12.345','from $2.00','$5','$0.00 OFF']:
            with self.subTest(value=value):self.assertIsNone(exact_price(value))
    def test_cannot_substitute_reference_price(self):
        result=offer_cards(self.html.replace('product__price-offer','unknown-price'),'Coles',self.url,safe_url)
        self.assertEqual(result['offers'],[])
        self.assertTrue(result['rejected'])
    def test_wrong_store_offer_is_rejected(self):
        result=offer_cards(self.html.replace('/view/offers/coles-','/view/offers/woolworths-'),'Coles',self.url,safe_url)
        self.assertEqual(result['offers'],[])
    def test_image_must_have_same_offer_id(self):
        result=offer_cards(self.html.replace('/au/70526406/','/au/999/'),'Coles',self.url,safe_url)
        self.assertIsNone(result['offers'][0]['image_url'])
    def test_maximum_records_and_explicit_partial_result(self):
        result=offer_cards(self.html,'Coles',self.url,safe_url,maximum=1)
        self.assertEqual(len(result['offers']),1)
        self.assertTrue(result['partial'])
    def test_duplicate_ids_do_not_publish_twice(self):
        result=offer_cards(self.html+self.html,'Coles',self.url,safe_url)
        self.assertEqual(len(result['offers']),2)
        self.assertEqual(len(result['rejected']),2)

class WoolworthsTests(unittest.TestCase):
    def test_actual_second_retailer_fixture(self):
        html=(HERE/'fixtures/woolworths-offers.html').read_text()
        result=offer_cards(html,'Woolworths','https://www.catalogueoffers.com.au/stores/woolworths/specials',safe_url)
        self.assertEqual(len(result['offers']),2)
        self.assertEqual(result['offers'][0]['store'],'Woolworths')
        self.assertFalse(result['rejected'])
        for row in result['offers']:
            self.assertIn('/'+row['offer_id']+'/',row['image_url'])
            self.assertIn('?offer='+row['offer_id'],row['source_url'])
