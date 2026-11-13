import test from 'node:test';
import assert from 'node:assert/strict';
import {planProviderRefresh} from '../src/lib/provider-refresh-plan.mjs';
const now=Date.parse('2026-11-14T01:00:00Z'),iso=ms=>new Date(ms).toISOString();
const labels=['Coles','Woolworths','Big W','Kmart','Chemist Warehouse','Priceline'];
const state=(provider,credits=173)=>({health:{checked_at:iso(now),provider},balance:{checked_at:iso(now),credits_remaining:credits}});
const fresh=hours=>labels.map(store=>({store,fresh_records:25,oldest_fresh_retrieval:iso(now-hours*3600000),oldest_fresh_source_update:iso(now-hours*3600000)}));
test('healthy recent stores consume no proposed credits and never claim a reservation',()=>{
 const p=planProviderRefresh(state(fresh(1)),now);assert.equal(p.pages.length,0);assert.equal(p.reserved_credits,0);assert.equal(p.ready_for_execution,false);
});
test('empty coverage is prioritised within three pages, using documented per-store listings',()=>{
 const p=planProviderRefresh(state(fresh(30).map(r=>r.store==='Priceline'?{store:r.store,fresh_records:0}:r)),now);
 assert.equal(p.pages.length,3);assert.equal(p.pages[0].store,'priceline');assert.equal(p.pages[0].args.category,'health-beauty');
 assert(p.pages.every(x=>x.maximum_products===25&&x.args.page===1&&x.tool==='list_specials'));
 assert.equal(p.remaining_if_executed,170);assert.equal(p.deferred_due_stores.length,3);
});
test('credit reserve is never consumed and batches shrink to the available allowance',()=>{
 for(const [credits,count] of [[0,0],[59,0],[60,0],[61,1],[62,2],[63,3],[173,3]]){
  const p=planProviderRefresh(state([],credits),now);assert.equal(p.pages.length,count);assert.equal(p.proposed_credits,count);assert(p.remaining_if_executed>=Math.min(credits,60));
 }
});
test('stale or future balances and unverifiable dates fail closed',()=>{
 for(const input of [state([],NaN),{...state([]),balance:{checked_at:iso(now-60001),credits_remaining:173}},{...state([]),balance:{checked_at:iso(now+1),credits_remaining:173}},state([{store:'Coles',fresh_records:25}])])assert.throws(()=>planProviderRefresh(input,now));
});
test('source expiry is considered independently of a recent retrieval',()=>{
 const rows=fresh(1);rows[0].oldest_fresh_source_update=iso(now-6.5*86400000);
 const p=planProviderRefresh(state(rows),now);assert.deepEqual(p.pages.map(x=>x.store),['coles']);assert.match(p.pages[0].reason,/Source/);
});
test('equal-priority failed stores rotate so all six get a turn over two daily batches',()=>{
 const first=planProviderRefresh(state([]),now),next=now+86400000;
 const input={health:{checked_at:iso(next),provider:[]},balance:{checked_at:iso(next),credits_remaining:170}};
 const second=planProviderRefresh(input,next);
 assert.equal(new Set([...first.pages,...second.pages].map(p=>p.store)).size,6);
});
