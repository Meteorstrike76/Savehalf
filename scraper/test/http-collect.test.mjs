import test from 'node:test';
import assert from 'node:assert/strict';
import {collect} from '../src/lib/http-collect.mjs';
function fixture(page){
 const flat=[['ShallowReactive']];
 const encode=v=>{const index=flat.length;flat.push(null);flat[index]=Array.isArray(v)?v.map(encode):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).map(([k,x])=>[k,encode(x)])):v;return index;};
 for(let n=0;n<30;n++)encode({sku:`${page}-${n}`,name:`Bread ${n}`,urlSlugText:`bread-${n}`,price:{amount:250,currencyCode:'AUD'},categories:[{name:'Bakery'}]});
 return `<script type="application/json">${JSON.stringify(flat)}</script>`;
}
test('expanded ALDI coverage stays within row and concurrency limits',async()=>{
 let requests=0,active=0,maxActive=0;
 const result=await collect('Aldi',async u=>{if(u.endsWith('/robots.txt')){requests++;return 'User-agent: *\nAllow: /';}const page=requests++;maxActive=Math.max(maxActive,++active);await new Promise(r=>setTimeout(r,1));active--;return fixture(page);});
 assert.equal(requests,13);assert.equal(result.attempted,13);assert.equal(result.rows.length,250);assert.equal(result.sales,0);assert(maxActive<=3);
 assert.equal(new Set(result.rows.map(r=>r.external_id)).size,250);
 assert(result.rows.every(r=>r.original_price===null));
});
test('ALDI total upstream failure is reported instead of an empty success',async()=>{
 await assert.rejects(collect('Aldi',async()=>{throw Error('blocked');}),/blocked|All ALDI category requests failed/);
});
