import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareProviderSnapshot,publishProviderSnapshot,boundedProviderFetch,MAX_CAPTURE_AGE_MS} from '../src/lib/provider-import.mjs';

const now=Date.parse('2026-11-14T01:00:00Z');
const product={id:'priceline_fixture',name:'Fixture shampoo',store:'priceline',price:4.5,currency:'AUD',out_of_stock:false,archived:false,url:'https://www.priceline.com.au/product/fixture',updated_at:'2026-11-13T00:00:00Z',price_stats:{average_30d:6}};
const snapshot=(patch={})=>({retrieved_at:'2026-11-14T00:30:00Z',pages:[{data:[product]}],...patch});
function database({count=999,existing=[],countError=null,lookupError=null,writeError=null}={}){
 const writes=[],calls=[];
 return {writes,calls,from(table){assert.equal(table,'provider_products');return {
  select(_columns,options){
   if(options?.head){calls.push('count');return Promise.resolve({count,error:countError});}
   return {in(_column,ids){assert(ids.length<=200);return {limit(limit){assert.equal(limit,200);calls.push('lookup');return Promise.resolve({data:existing.map(id=>({id})),error:lookupError});}};}};
  },
  async upsert(rows,options){calls.push('write');assert.deepEqual(options,{onConflict:'id'});writes.push(rows);return {error:writeError};}
 };}};
}
test('replaying a captured file preserves retrieval time, price and source date',async()=>{
 const db=database();const captured=snapshot();
 await publishProviderSnapshot(captured,db,now);
 await publishProviderSnapshot(captured,db,now+600000);
 assert.deepEqual(db.writes[0],db.writes[1]);
 assert.equal(db.writes[0][0].retrieved_at,'2026-11-14T00:30:00.000Z');
 assert.equal(db.writes[0][0].source_updated_at,'2026-11-13T00:00:00.000Z');
 assert.equal(db.writes[0][0].price,4.5);assert.equal(db.writes[0][0].original_price,undefined);
 assert.deepEqual(db.calls.slice(0,3),['count','lookup','write']);
});
test('missing, invalid, future and stale capture times fail before database calls',async()=>{
 for(const value of [[{data:[product]}],snapshot({retrieved_at:null}),snapshot({retrieved_at:'invalid'}),snapshot({retrieved_at:new Date(now+1).toISOString()}),snapshot({retrieved_at:new Date(now-MAX_CAPTURE_AGE_MS-1).toISOString()})]){
  const db=database();await assert.rejects(publishProviderSnapshot(value,db,now));assert.deepEqual(db.calls,[]);
 }
});
test('future-at-capture, expired, wrong-store and empty products cannot create an import',()=>{
 for(const patch of [{updated_at:'2026-11-14T00:45:00Z'},{updated_at:'2026-11-01T00:00:00Z'},{store:'target'},{out_of_stock:true},{currency:'USD'}])assert.throws(()=>prepareProviderSnapshot(snapshot({pages:[{data:[{...product,...patch}]}]}),now),/held for review/);
 assert.throws(()=>prepareProviderSnapshot(snapshot({pages:[]}),now),/held for review/);
});
test('partial valid pages report rejected/duplicate rows rather than claiming complete coverage',()=>{
 const result=prepareProviderSnapshot(snapshot({pages:[{data:[product,product,{...product,id:'priceline_other',out_of_stock:true}]}]}),now);
 assert.equal(result.received,3);assert.equal(result.accepted,1);assert.equal(result.rejected_or_duplicate,2);
});
test('prices that cannot be stored exactly as cents are rejected rather than rounded',async()=>{
 const db=database();const input=snapshot({pages:[{data:[{...product,price:4.555}]}]});
 await assert.rejects(publishProviderSnapshot(input,db,now),/held for review/);assert.deepEqual(db.calls,[]);
});
test('row budget allows idempotent updates but refuses new IDs at capacity',async()=>{
 const existing=database({count:1000,existing:[product.id]});await publishProviderSnapshot(snapshot(),existing,now);assert.equal(existing.writes.length,1);
 const full=database({count:1000});await assert.rejects(publishProviderSnapshot(snapshot(),full,now),/1000-row/);assert.equal(full.writes.length,0);
});
test('database failures stop subsequent calls and never report successful publication',async()=>{
 for(const config of [{count:null},{countError:{message:'private'}},{lookupError:{message:'private'}},{writeError:{message:'private'}}]){
  const db=database(config);await assert.rejects(publishProviderSnapshot(snapshot(),db,now),e=>!e.message.includes('private'));
  if(!config.writeError)assert.equal(db.writes.length,0);
 }
});
test('captures remain bounded to eight pages of at most 25 products',()=>{
 assert.throws(()=>prepareProviderSnapshot(snapshot({pages:Array.from({length:9},()=>({data:[]}))}),now),/eight/);
 assert.throws(()=>prepareProviderSnapshot(snapshot({pages:[{data:Array(26).fill(product)}]}),now),/25/);
});
test('database fetch preserves headers and caller cancellation, adding a timeout signal',async()=>{
 const controller=new AbortController();let called=0;
 const bounded=boundedProviderFetch(async(url,options)=>{called++;assert.equal(url,'https://db.invalid');assert.deepEqual(options.headers,{Accept:'application/json'});assert.notEqual(options.signal,controller.signal);controller.abort();assert.equal(options.signal.aborted,true);return new Response('ok');});
 await bounded('https://db.invalid',{headers:{Accept:'application/json'},signal:controller.signal});assert.equal(called,1);
});
test('Request-object cancellation is preserved when init has no signal',async()=>{
 const controller=new AbortController(),request=new Request('https://db.invalid',{signal:controller.signal});
 await boundedProviderFetch(async(input,options)=>{
  assert.equal(input,request);controller.abort();assert.equal(options.signal.aborted,true);return new Response('ok');
 })(request);
});
