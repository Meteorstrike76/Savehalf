import test from 'node:test';
import assert from 'node:assert/strict';
import {parseReviewedCsv} from '../src/lib/reviewed-csv.mjs';
const header = 'store,externalId,title,price,was,url,sourceUrl,region,checkedAt,promotionEndsAt,reviewed';
const product = 'Coles,sku-123,"Coffee, 200g",5.00,10.00,https://www.coles.com.au/product/sku-123,https://www.coles.com.au/catalogues,NSW,2026-11-11T00:00:00Z,2026-11-17T12:59:00Z,true';
test('offline review CSV parses quoted commas and verified exact AUD prices', () => {
  const [row] = parseReviewedCsv('\uFEFF' + header + '\r\n' + product + '\r\n');
  assert.equal(row.title, 'Coffee, 200g');
  assert.equal(row.price, 5);
  assert.equal(row.was, 10);
  assert.equal(row.reviewed, true);
});
test('offline review CSV rejects ambiguous prices, unreviewed claims and invalid structure', () => {
  for (const changed of [
    product.replace('5.00,10.00', '$5.00,10.00'),
    product.replace('5.00,10.00', '5.00,4.00'),
    product.replace(',true', ',false'),
    product.replace('"Coffee, 200g"', '"Coffee, 200g'),
    product.replace('sku-123,"Coffee', 'sku-123,extra,"Coffee'),
  ]) assert.throws(() => parseReviewedCsv(header + '\n' + changed));
  assert.throws(() => parseReviewedCsv('store,store\nColes,Coles'));
  assert.throws(() => parseReviewedCsv(header));
});
test('offline review CSV preserves optional absent previous price without inventing savings', () => {
  const [row] = parseReviewedCsv(header + '\n' + product.replace('5.00,10.00', '5.00,'));
  assert.equal(row.was, undefined);
});
