import { captureJson } from '../lib/browser.mjs';
import { findProducts } from '../lib/extract.mjs';
import { buildDeal } from '../lib/normalize.mjs';

/**
 * Generic adapter: open listing pages in a real browser, capture whatever JSON the page loads,
 * and pull out priced products. Used for sites where we don't rely on a private API.
 * `urls` can be overridden with an env var (comma separated) if a retailer moves its pages.
 */
export function browserListingAdapter({ store, base, urls, envVar }) {
  const override = process.env[envVar]?.split(',').map((u) => u.trim()).filter(Boolean);
  const targets = override?.length ? override.map((url) => ({ url, defaultCategory: 'Clearance' })) : urls;

  return {
    store,
    async run(context, log) {
      const rows = [];
      for (const { url, defaultCategory } of targets) {
        try {
          const payloads = await captureJson(context, url);
          const found = payloads.flatMap((p) => findProducts(p));
          log(`${store}: ${url} -> ${payloads.length} JSON payloads, ${found.length} priced items`);
          for (const p of found) {
            const row = buildDeal({
              store, base, defaultCategory,
              externalId: p.id, title: p.title, price: p.price, was: p.was, image: p.image, url: p.url,
            });
            if (row) rows.push(row);
          }
        } catch (e) {
          log(`${store}: ${url} failed: ${e.message}`);
        }
      }
      return rows;
    },
  };
}
