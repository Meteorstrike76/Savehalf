"""Discovery evidence only. Never turns an empty page into 'no active catalogues'."""
import json
import os
from pathlib import Path
from urllib.parse import urljoin, urlparse
import scrapy
from scrapy.exceptions import CloseSpider

class CataloguesSpider(scrapy.Spider):
    name = 'catalogues'

    def start_requests(self):
        if os.getenv('STUDENT_PACK_FREE_PLAN_VERIFIED') != 'true':
            raise CloseSpider('student_free_plan_not_verified')
        manifest = json.loads((Path(__file__).parents[1] / 'sources.json').read_text())
        sources = [s for s in manifest if s.get('source_use_verified') is True][:4]
        if not sources:
            raise CloseSpider('no_reviewed_sources')
        for s in sources:
            u = urlparse(s['url'])
            if u.scheme != 'https' or u.hostname != 'www.catalogueoffers.com.au':
                raise CloseSpider('invalid_source')
            yield scrapy.Request(s['url'], callback=self.parse, errback=self.failed, cb_kwargs={'retailer': s['retailer']})

    async def start(self):
        for request in self.start_requests():
            yield request

    def parse(self, response, retailer):
        # Do not follow further links or invoke paid extraction/proxy services.
        paths = response.css('a::attr(href), img::attr(src)').getall()
        links = sorted({urljoin(response.url, p) for p in paths if p and any(x in p.lower() for x in ('.pdf', '/catalogue/', '/catalogues/'))})[:20]
        yield {'retailer': retailer, 'source_url': response.url, 'status': 'discovered_requires_validation' if links else 'extraction_incomplete', 'candidates': links, 'publishable': False, 'http_status': response.status}
        if not links:
            self.crawler.stats.inc_value('savehalf/incomplete_sources')

    def failed(self, failure):
        yield {'retailer': failure.request.cb_kwargs.get('retailer'), 'source_url': failure.request.url, 'status': 'fetch_failed', 'publishable': False, 'candidates': []}
