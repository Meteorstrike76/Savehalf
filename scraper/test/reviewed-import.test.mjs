import test from 'node:test';import assert from 'node:assert/strict';
import {validateReviewed} from '../src/lib/reviewed-import.mjs';
const now=Date.parse('2026-10-14T00:00:00Z');
const p={store:'Coles',externalId:'real-reference',title:'Coffee 200g',price:5,was:10,url:'https://www.coles.com.au/product/coffee-real-reference',base:'https://www.coles.com.au',sourceUrl:'https://www.coles.com.au/catalogues/view',region:'NSW',checkedAt:'2026-10-13T23:00:00Z',promotionEndsAt:'2026-10-20T12:59:59Z',reviewed:true};
test('review preview preserves region, source, published prices and verified expiry',()=>{
 const [r]=validateReviewed([p],now);assert.equal(r.observed_region,'NSW');assert.equal(r.promotion_ends_at,p.promotionEndsAt.replace('Z','.000Z'));assert.equal(r.source_feed,'direct');assert.equal(r.original_price,10);assert.equal(r.last_seen_at,'2026-10-13T23:00:00.000Z');
});
test('review import rejects old checks, unreviewed rows, external sources and duplicate variants',()=>{
 for(const extra of [{checkedAt:'2026-10-01T00:00:00Z'},{reviewed:false},{sourceUrl:'https://other.test'},{promotionEndsAt:'2026-10-13T00:00:00Z'},{region:''}])assert.throws(()=>validateReviewed([{...p,...extra}],now));
 assert.throws(()=>validateReviewed([p,p],now));
});
