import { sleep } from '../lib/browser.mjs';
import { buildDeal, slugify } from '../lib/normalize.mjs';
import { browserListingAdapter } from './browserListing.mjs';

const BASE = 'https://www.coles.com.au';
const MAX_PAGES = Number(process.env.COLES_PAGES ?? 12);

export function mapProduct(p) {
  if (p._type && p._type !== 'PRODUCT') return null;
  const pricing = p.pricing ?? {};
  const img = p.imageUris?.[0]?.uri;
  const title = [p.brand, p.name, p.size].filter(Boolean).join(' ');
  return buildDeal({
    store: 'Coles', base: BASE, defaultCategory: 'Groceries',
    externalId: p.id, title, price: pricing.now, was: pricing.was,
    image: img ? `https://productimages.coles.com.au/productimages${img}` : undefined,
    url: `/product/${slugify(`${p.brand ?? ''} ${p.name ?? ''} ${p.size ?? ''}`)}-${p.id}`,
  });
}

const fallback = browserListingAdapter({
  store: 'Coles', base: BASE, envVar: 'COLES_URLS',
  urls: [{ url: `${BASE}/on-special`, defaultCategory: 'Groceries' }],
});

export default {
  store: 'Coles',
  async run(context, log) {
    const rows = [];
    try {
      const page = await context.newPage();
      await page.goto(`${BASE}/on-special`, { waitUntil: 'domcontentloaded', timeout: 45_000 });
      const nextData = await page.evaluate(() => {
        const el = document.getElementById('__NEXT_DATA__');
        return el ? JSON.parse(el.textContent || '{}') : null;
      });
      await page.close();
      const buildId = nextData?.buildId;
      if (!buildId) throw new Error('no Next.js buildId on page (blocked?)');

      for (let n = 1; n <= MAX_PAGES; n++) {
        const res = await context.request.get(`${BASE}/_next/data/${buildId}/en/on-special.json?page=${n}`, {
          headers: { Accept: 'application/json', Referer: `${BASE}/on-special` }, timeout: 30_000,
        });
        if (!res.ok()) throw new Error(`data API HTTP ${res.status()}`);
        const json = await res.json();
        const results = json?.pageProps?.searchResults?.results ?? [];
        if (!results.length) break;
        for (const p of results) { const r = mapProduct(p); if (r) rows.push(r); }
        log(`Coles: page ${n} -> ${results.length} products (${rows.length} deals so far)`);
        await sleep(1200 + Math.random() * 800);
      }
    } catch (e) {
      log(`Coles data path failed (${e.message}); trying page capture`);
    }
    return rows.length ? rows : fallback.run(context, log);
  },
};
