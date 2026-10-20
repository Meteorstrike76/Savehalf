import test from 'node:test';
import assert from 'node:assert/strict';
import {buildDeal,absolutize,STORES} from '../src/lib/normalize.mjs';
import target from '../src/adapters/target.mjs';
test('Target exists in catalogue and collector',()=>{assert.ok(STORES.includes('Target'));assert.equal(target.store,'Target');});
test('unsafe URL schemes are rejected',()=>{assert.equal(absolutize('javascript:alert(1)','https://www.target.com.au'),'');assert.equal(absolutize('data:text/html,hello','https://www.target.com.au'),'');});
test('authorised catalogue permits regular price but not fabricated savings',()=>{const row=buildDeal({store:'Target',title:'Cotton towel',price:10,base:'https://www.target.com.au',url:'/p/towel',allowNoWas:true});assert.equal(row.original_price,null);assert.equal(row.discount_price,10);});
test('unsupported stores cannot be written',()=>{assert.equal(buildDeal({store:'Fake',title:'Cotton towel',price:10,was:20}),null);});
