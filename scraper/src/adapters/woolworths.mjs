import { sleep } from '../lib/browser.mjs';
import { buildDeal, slugify } from '../lib/normalize.mjs';
import { browserListingAdapter } from './browserListing.mjs';

const BASE = 'https://www.woolworths.com.au';
const MAX_PAGES = Number(process.env.WOOLWORTHS_PAGES ?? 12);

export function mapProduct(p) {
  return buildDeal({
    store: 'Woolworths', base: BASE, defaultCategory: 'Groceries',
    externalId: p.Stockcode,
    title: p.Brand && !String(p.Name).toLowerCase().startsWith(String(p.Brand).toLowerCase()) ? `${p.Brand} ${p.Name}` : p.Name ?? p.DisplayName,
    price: p.Price, was: p.WasPrice,
    image: p.MediumImageFile || p.SmallImageFile,
    url: `/shop/productdetails/${p.Stockcode}/${p.UrlFriendlyName ?? slugify(p.Name ?? '')}`,
  });
}

const fallback = browserListingAdapter({
  store: 'Woolworths', base: BASE, envVar: 'WOOLWORTHS_URLS',
  urls: [{ url: `${BASE}/shop/browse/specials`, defaultCategory: 'Groceries' }],
});

export default {
  store: 'Woolworths',
  async run(context, log) {
    const rows = [];
    try {
      // Visit the site first so the browser context receives the session cookies the JSON API expects.
      const page = await context.newPage();
      await page.goto(`${BASE}/shop/browse/specials`, { waitUntil: 'domcontentloaded', timeout: 45_000 });
      await sleep(2500);
      await page.close();

      for (let n = 1; n <= MAX_PAGES; n++) {
        const res = await context.request.post(`${BASE}/apis/ui/browse/category`, {
          data: {
            categoryId: 'specials', pageNumber: n, pageSize: 36, sortType: 'TraderRelevance',
            url: '/shop/browse/specials', location: '/shop/browse/specials',
            formatObject: '{"name":"Specials"}', isSpecial: true, isBundle: false, isMobile: false,
            filters: [], token: '', gpBoost: 0, isHideUnavailableProducts: false, isRegisteredRewardCardPromotion: false,
            categoryVersion: 'v2',
          },
          headers: { 'Content-Type': 'application/json', Referer: `${BASE}/shop/browse/specials` },
          timeout: 30_000,
        });
        if (!res.ok()) throw new Error(`browse API HTTP ${res.status()}`);
        const json = await res.json();
        const products = (json.Bundles ?? []).flatMap((b) => b.Products ?? []);
        if (!products.length) break;
        for (const p of products) { const r = mapProduct(p); if (r) rows.push(r); }
        log(`Woolworths: page ${n} -> ${products.length} products (${rows.length} deals so far)`);
        await sleep(1200 + Math.random() * 800);
      }
    } catch (e) {
      log(`Woolworths API path failed (${e.message}); trying page capture`);
    }
    return rows.length ? rows : fallback.run(context, log);
  },
};
