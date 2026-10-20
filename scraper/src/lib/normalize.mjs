import {imageUrl} from './images.mjs';
export const STORES = ['Coles', 'Woolworths', 'Aldi', 'Big W', 'Kmart', 'Target', 'Best & Less'];

export const MIN_DISCOUNT_PCT = Number(process.env.MIN_DISCOUNT_PCT ?? 20);

export function parsePrice(v) {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number') return Number.isFinite(v) && v > 0 ? round2(v) : null;
  if (typeof v === 'string') {
    const m = v.replace(/,/g, '').match(/\d+(?:\.\d+)?/);
    if (!m) return null;
    const n = parseFloat(m[0]);
    return n > 0 ? round2(n) : null;
  }
  return null;
}

const round2 = (n) => Math.round(n * 100) / 100;

const WORDS = {
  Electronics: /\b(tv|television|headphone|earbud|speaker|laptop|tablet|phone|charger|cable|camera|console|playstation|xbox|nintendo|monitor|router|smart ?watch|bluetooth|usb|power ?bank|air ?fryer|vacuum|kettle|toaster|blender|printer|keyboard|mouse|drone)s?\b/i,
  Fashion: /\b(shirt|t-?shirt|tee|dress|jeans|shorts|pants|trousers|jacket|hoodie|jumper|sweater|cardigan|skirt|socks?|underwear|bra|leggings|pyjamas?|pjs|shoes?|sneakers?|boots?|sandals?|thongs|hat|cap|beanie|scarf|swimwear|bikini|bag|backpack|wallet|sunglasses)\b/i,
  Home: /\b(towel|sheet|pillow|quilt|doona|duvet|cushion|candle|pan|pot|cookware|storage|basket|lamp|rug|curtain|mat|vase|frame|mug|plate|bowl|cutlery|glassware|organiser|organizer|bin|hanger|mirror|clock|planter|bedding|throw|blanket)s?\b/i,
  Groceries: /\b(chicken|beef|lamb|pork|mince|sausage|bacon|ham|fish|salmon|prawn|milk|cheese|yoghurt|yogurt|butter|egg|bread|cereal|pasta|rice|sauce|chips|biscuit|chocolate|lolly|ice ?cream|juice|water|coffee|tea|wine|beer|cider|vodka|gin|apple|banana|berries|grapes|avocado|tomato|potato|onion|salad|vegetable|fruit|nuts?|oil|flour|sugar|soup|noodle|snack|nappies|toilet paper|laundry|detergent|shampoo|toothpaste)\b/i,
};

export function classify(title, fallback = 'Clearance') {
  if (fallback === 'Groceries') return 'Groceries';
  if (WORDS.Electronics.test(title)) return 'Electronics';
  if (WORDS.Fashion.test(title)) return 'Fashion';
  if (WORDS.Home.test(title)) return 'Home & Living';
  if (WORDS.Groceries.test(title)) return 'Groceries';
  return fallback;
}

export function absolutize(url, base) {
  if (!url || typeof url !== 'string') return '';
  try { const parsed = new URL(url, base); return parsed.protocol === 'https:' ? parsed.toString() : ''; } catch { return ''; }
}

export function slugify(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

/**
 * Build a DB row from loosely-typed scraped values, or return null if it isn't a real deal.
 */
export function buildDeal({ store, externalId, title, price, was, image, url, base, defaultCategory = 'Clearance', allowNoWas = false, minDiscount = MIN_DISCOUNT_PCT }) {
  if (!STORES.includes(store)) return null;
  const t = typeof title === 'string' ? title.replace(/\s+/g, ' ').trim() : '';
  const now = parsePrice(price);
  let orig = parsePrice(was);
  if (!t || t.length < 3 || t.length > 200 || !now || now > 5000) return null;
  if (orig !== null && orig <= now) orig = null;
  if (orig !== null && orig > 20000) return null;
  if (orig === null && !allowNoWas) return null;
  if (orig !== null && Math.round((1 - now / orig) * 100) < minDiscount) return null;

  const id = String(externalId ?? '').trim() || `${slugify(t)}-${now}`;
  return {
    store_category: store,
    external_id: id.slice(0, 120),
    title: t,
    original_price: orig,
    discount_price: now,
    category: classify(t, defaultCategory),
    image_url: imageUrl(image, base),
    deal_url: absolutize(url, base) || base || '',
    source_feed: 'scraper',
  };
}

export const pct = (r) => (r.original_price ? Math.round((1 - r.discount_price / r.original_price) * 100) : 0);
