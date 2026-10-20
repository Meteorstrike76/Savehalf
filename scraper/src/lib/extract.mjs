import {imageUrl} from './images.mjs';
import { parsePrice } from './normalize.mjs';

const NAME_KEYS = ['name', 'title', 'productName', 'displayName', 'product_name'];
const NOW_KEYS = ['price', 'salePrice', 'sale_price', 'currentPrice', 'current', 'now', 'nowPrice', 'priceNow', 'specialPrice', 'discountPrice', 'finalPrice', 'amount', 'value'];
const WAS_KEYS = ['wasPrice', 'was', 'WasPrice', 'priceWas', 'originalPrice', 'regularPrice', 'compareAtPrice', 'compareAt', 'listPrice', 'previousPrice', 'rrp', 'strikethroughPrice', 'normalPrice'];
const NESTED = ['price', 'prices', 'pricing', 'offers', 'offer', 'priceInfo', 'pricingInfo'];
const ID_KEYS = ['id', 'sku', 'SKU', 'stockcode', 'Stockcode', 'productId', 'product_id', 'articleNumber', 'partNumber', 'itemId', 'gtin'];
const URL_KEYS = ['url', 'productUrl', 'productURL', 'link', 'href', 'canonicalUrl', 'pdpUrl', 'path'];
const IMG_KEYS = ['image', 'imageUrl', 'imageURL', 'image_url', 'thumbnail', 'thumbnailUrl', 'primaryImage', 'img', 'mediumImage', 'largeImage'];

const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);

function firstKey(o, keys) {
  for (const k of keys) if (o[k] !== undefined && o[k] !== null && o[k] !== '') return o[k];
  return undefined;
}

function firstPrice(o, keys) {
  for (const k of keys) {
    const p = parsePrice(o[k]);
    if (p) return p;
  }
  return null;
}

function imageOf(o) {
  const candidates=IMG_KEYS.map(k=>o[k]).concat([o.images,o.imageUris]);
  // Keep relative paths until the adapter supplies its retailer base URL.
  const absolute=imageUrl(candidates,o.url??o.productUrl);
  if(absolute)return absolute;
  const relative=(value,depth=0)=>{if(depth>6)return undefined;if(typeof value==='string'&&/^(?:\/|\.\.?\/)/.test(value))return value;if(Array.isArray(value)){for(const v of value){const r=relative(v,depth+1);if(r)return r;}}else if(value&&typeof value==='object'){for(const k of ['url','contentUrl','src','uri','image']){const r=relative(value[k],depth+1);if(r)return r;}}};
  return relative(candidates);
}

/** Pull {title, price, was, id, url, image} out of one candidate object, or null. */
export function readProduct(o) {
  const title = firstKey(o, NAME_KEYS);
  if (typeof title !== 'string') return null;

  let price = null;
  let was = firstPrice(o, WAS_KEYS);
  for (const nk of NESTED) {
    const n = Array.isArray(o[nk]) ? o[nk][0] : o[nk];
    if (isObj(n)) {
      price = price ?? firstPrice(n, NOW_KEYS);
      was = was ?? firstPrice(n, WAS_KEYS);
    }
  }
  // top-level numeric price (only keys that clearly mean "price")
  price = price ?? firstPrice(o, ['price', 'salePrice', 'sale_price', 'currentPrice', 'nowPrice', 'specialPrice', 'discountPrice']);
  if (!price) return null;

  return { title, price, was, id: firstKey(o, ID_KEYS), url: firstKey(o, URL_KEYS), image: imageOf(o) };
}

/** Depth-first walk over arbitrary JSON, collecting anything that looks like a priced product. */
export function findProducts(root, { maxDepth = 14 } = {}) {
  const out = [];
  const seen = new WeakSet();
  (function walk(node, depth) {
    if (!node || typeof node !== 'object' || depth > maxDepth || seen.has(node)) return;
    seen.add(node);
    if (Array.isArray(node)) { for (const x of node) walk(x, depth + 1); return; }
    const p = readProduct(node);
    if (p) { out.push(p); return; }
    for (const v of Object.values(node)) walk(v, depth + 1);
  })(root, 0);
  return out;
}
