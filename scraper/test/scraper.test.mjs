import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDeal, parsePrice, classify } from '../src/lib/normalize.mjs';
import { findProducts } from '../src/lib/extract.mjs';
import { selectTop } from '../src/lib/db.mjs';
import { mapProduct as mapWoolies } from '../src/adapters/woolworths.mjs';
import { mapProduct as mapColes } from '../src/adapters/coles.mjs';

test('parsePrice handles strings, numbers and junk', () => {
  assert.equal(parsePrice('$1,299.50'), 1299.5);
  assert.equal(parsePrice(4), 4);
  assert.equal(parsePrice(0), null);
  assert.equal(parsePrice('free'), null);
  assert.equal(parsePrice(null), null);
});

test('buildDeal rejects non-deals and tiny discounts', () => {
  const base = { store: 'Kmart', title: 'Air Fryer 5L', base: 'https://www.kmart.com.au' };
  assert.equal(buildDeal({ ...base, price: 50, was: 50 }), null);
  assert.equal(buildDeal({ ...base, price: 50 }), null);
  assert.equal(buildDeal({ ...base, price: 48, was: 50 }), null); // 4% < 20%
  const ok = buildDeal({ ...base, price: 30, was: 60, url: '/p/1', image: '//cdn.x/y.jpg' });
  assert.equal(ok.original_price, 60);
  assert.equal(ok.category, 'Electronics');
  assert.equal(ok.deal_url, 'https://www.kmart.com.au/p/1');
  assert.equal(ok.image_url, 'https://cdn.x/y.jpg');
});

test('classify', () => {
  assert.equal(classify('Cotton Bath Towel 4 Pack'), 'Home & Living');
  assert.equal(classify('Womens Knit Jumper'), 'Fashion');
  assert.equal(classify('Lego Brick Box'), 'Clearance');
  assert.equal(classify('Anything', 'Groceries'), 'Groceries');
});

test('findProducts digs priced items out of unknown JSON shapes', () => {
  const json = {
    data: { hits: [
      { name: 'Wireless Headphones', sku: 'A1', price: { current: 20, was: 50 }, image: { url: 'https://i/x.jpg' } },
      { title: 'Not a product', count: 3 },
      { productName: 'Ld+json style', offers: { price: '9.99' }, url: '/x' },
    ] },
    nested: [[{ name: 'Toaster', pricing: { now: 15, was: 30 }, id: 77 }]],
  };
  const found = findProducts(json);
  assert.equal(found.length, 3);
  assert.deepEqual(found[0], { title: 'Wireless Headphones', price: 20, was: 50, id: 'A1', url: undefined, image: 'https://i/x.jpg' });
  assert.equal(found[2].id, 77);
});

test('Woolworths mapper', () => {
  const r = mapWoolies({ Stockcode: 123, Name: 'Beef Rump Steak 500g', Brand: 'Woolworths', Price: 8, WasPrice: 16, MediumImageFile: 'https://cdn/x.jpg', UrlFriendlyName: 'beef-rump' });
  assert.equal(r.store_category, 'Woolworths');
  assert.equal(r.external_id, '123');
  assert.equal(r.deal_url, 'https://www.woolworths.com.au/shop/productdetails/123/beef-rump');
  assert.equal(r.category, 'Groceries');
  assert.equal(mapWoolies({ Stockcode: 1, Name: 'Milk', Price: 3, WasPrice: null }), null);
});

test('Coles mapper', () => {
  const r = mapColes({ _type: 'PRODUCT', id: '555', name: 'Choc Block', brand: 'Cadbury', size: '180g', pricing: { now: 3.25, was: 6.5 }, imageUris: [{ uri: '/5/555.jpg' }] });
  assert.equal(r.title, 'Cadbury Choc Block 180g');
  assert.equal(r.image_url, 'https://productimages.coles.com.au/productimages/5/555.jpg');
  assert.match(r.deal_url, /\/product\/cadbury-choc-block-180g-555$/);
  assert.equal(mapColes({ _type: 'SPONSORED', id: '1' }), null);
});

test('selectTop dedupes and caps by discount depth', () => {
  const mk = (id, now, was) => ({ external_id: id, discount_price: now, original_price: was });
  const out = selectTop([mk('a', 5, 10), mk('a', 4, 10), mk('b', 9, 10), mk('c', 1, 10)], 2);
  assert.deepEqual(out.map((r) => r.external_id), ['c', 'a']);
  assert.equal(out[1].discount_price, 4);
});
