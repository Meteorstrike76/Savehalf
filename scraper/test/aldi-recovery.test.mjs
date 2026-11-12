import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {aldiProducts} from '../src/lib/aldi-html.mjs';
import {collect,getResource} from '../src/lib/http-collect.mjs';
import * as governance from '../../supabase/functions/catalogue-collect/governance.mjs';
import {CollectionError,diagnostic} from '../../supabase/functions/catalogue-collect/recovery.mjs';
import * as edgeHttp from '../../supabase/functions/catalogue-collect/http-collect.mjs';
import * as nodeHttp from '../src/lib/http-collect.mjs';
import * as nodeGovernance from '../src/lib/governance.mjs';
import * as nodeRecovery from '../src/lib/recovery.mjs';
import * as edgeAldi from '../../supabase/functions/catalogue-collect/aldi-html.mjs';

const fixture=name=>readFileSync(new URL(`./fixtures/aldi-2026-11-12/${name}`,import.meta.url),'utf8');
const redirect=JSON.parse(fixture('redirect.json'));
const current=fixture('new-low.html'),savers=fixture('savers.html');
const robots=fixture('robots.txt');

test('scraper mirror executes the identical Edge implementations',()=>{
 assert.equal(aldiProducts,edgeAldi.aldiProducts);
 for(const name of Object.keys(edgeHttp))assert.equal(nodeHttp[name],edgeHttp[name]);
 for(const name of Object.keys(governance))assert.equal(nodeGovernance[name],governance[name]);
 assert.equal(nodeRecovery.diagnostic,diagnostic);assert.equal(nodeRecovery.CollectionError,CollectionError);
});

test('captured public Nuxt product shape still parses without changing prices',()=>{
 assert.equal(aldiProducts(current).length,18);
 assert.equal(aldiProducts(savers).length,6);
 assert.equal(aldiProducts(current)[0].discount_price,7.49);
});
test('observed ALDI 301 does not poison a run: use verified canonical path, do not follow redirects',async()=>{
 const calls=[];
 const result=await collect('Aldi',async u=>{
  const path=new URL(u).pathname;calls.push(path);
  if(path==='/robots.txt')return robots;
  if(path===redirect.path)throw new CollectionError('Redirect rejected','transport');
  return path.includes('super-savers')?savers:current;
 });
 assert(!calls.includes(redirect.path));
 assert(calls.includes(new URL(redirect.location).pathname));
 assert.equal(calls.length,13);
 assert(result.rows.length>0);
});
test('essential ALDI page keeps its real kind, HTTP status, stage and safe path',async()=>{
 await assert.rejects(collect('Aldi',async u=>{
  if(u.endsWith('robots.txt'))return robots;
  if(u.includes('super-savers'))throw new CollectionError('Denied','access',403);
  return current;
 }),e=>e.kind==='access'&&e.httpStatus===403&&e.diagnostics.some(d=>d.stage==='listing'&&d.path.includes('super-savers')&&d.http_status===403));
});
test('zero-row ALDI HTML is parser drift at parse stage, never healthy empty or upstream',async()=>{
 await assert.rejects(collect('Aldi',async u=>u.endsWith('robots.txt')?robots:'<html>changed listing</html>'),e=>{
  const d=diagnostic(e,'fetch','/');
  return d.kind==='parser'&&d.stage==='parse'&&d.path.includes('/products/');
 });
});
test('all ALDI request failures retain transport diagnostics instead of generic upstream',async()=>{
 await assert.rejects(collect('Aldi',async u=>{
  if(u.endsWith('robots.txt'))return robots;
  const e=new CollectionError('Network unavailable','transport');e.transportReason='dns';throw e;
 }),e=>e.kind==='transport'&&e.diagnostics.every(d=>d.transport_reason==='dns'&&d.path!=='/'));
});
test('circuit opens after three consecutive zero-row failures, not isolated or partial runs',()=>{
 const zero={status:'failed',rows:0};
 assert.equal(governance.zeroRowCircuitOpen([zero,zero,zero]),true);
 for(const h of [[zero,zero],[zero,{status:'ok',rows:20},zero],[{status:'quarantined',rows:10},zero,zero],[{status:'probe_ok',rows:18},zero,zero]])assert.equal(governance.zeroRowCircuitOpen(h),false);
});
test('open ALDI circuit performs robots plus one listing only, with no importable rows',async()=>{
 const calls=[];
 const result=await collect('Aldi',async u=>{calls.push(u);return u.endsWith('robots.txt')?robots:current;},{probe:true});
 assert.equal(calls.length,2);assert(calls[0].endsWith('/robots.txt'));
 assert.equal(result.probeRecovered,true);assert.equal(result.probeRows,18);assert.deepEqual(result.rows,[]);
});
test('open circuit never resumes after an empty probe or robots refusal',async()=>{
 let calls=0;
 await assert.rejects(collect('Aldi',async u=>{calls++;return u.endsWith('robots.txt')?robots:'<html/>';},{probe:true}),e=>e.kind==='parser');assert.equal(calls,2);
 calls=0;await assert.rejects(collect('Aldi',async()=>{calls++;return 'User-agent: *\nDisallow: /';},{probe:true}),e=>e.kind==='policy');assert.equal(calls,1);
});
test('body cap after bytes retains budget kind, HTTP 200 and read-body stage',async()=>{
 const before=global.fetch;global.fetch=async()=>new Response('abcd');
 try{await assert.rejects(getResource('https://www.aldi.com.au/products/test',{used:0,limit:3}),e=>{
  const d=diagnostic(e,'fetch','/');return d.kind==='budget'&&d.http_status===200&&d.stage==='read_body';
 });}finally{global.fetch=before;}
});
