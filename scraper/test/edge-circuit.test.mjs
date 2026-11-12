import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';

// Execute the actual handler with fake REST/upstream responses; no real database
// or retailer requests, credentials, clocks, cron dispatches or Deno runtime.
const entry=new URL('../../supabase/functions/catalogue-collect/index.ts',import.meta.url);
const code=stripTypeScriptTypes(readFileSync(entry,'utf8')).replace(/from '(\.\/[^']+)'/g,(_,p)=>`from '${new URL(p,entry).href}'`);
const html=readFileSync(new URL('./fixtures/aldi-2026-11-12/new-low.html',import.meta.url),'utf8');
const zero={status:'failed',rows:0};
let sequence=0;
async function run({store='Aldi',allowed=true,review=false,history=[zero,zero,zero],auditOk=true,empty=false,robotsDenied=false,priorSaved=0}={}){
 const previousFetch=global.fetch,previousDeno=globalThis.Deno,requests=[],writes=[];let handler;
 globalThis.Deno={serve:fn=>{handler=fn;},env:{get:n=>n==='SUPABASE_URL'?'https://db.invalid':'test-only'}};
 global.fetch=async(input,options={})=>{
  const u=new URL(String(input)),body=options.body?JSON.parse(options.body):null;
  requests.push({url:u.href,body});
  if(u.hostname==='www.aldi.com.au')return new Response(u.pathname==='/robots.txt'?`User-agent: *\n${robotsDenied?'Disallow':'Allow'}: /`:empty?'<html/>':html);
  assert.equal(u.hostname,'db.invalid');
  if(u.pathname.endsWith('start_catalogue_run'))return Response.json(allowed);
  if(u.pathname.endsWith('finish_catalogue_run'))return Response.json(true);
  if(u.pathname.endsWith('/collection_status')&&(!options.method||options.method==='GET'))return Response.json([{saved:priorSaved,review_required:review}]);
  if(u.pathname.endsWith('/collection_audit')&&(!options.method||options.method==='GET')){assert.equal(u.searchParams.get('limit'),'3');assert.equal(u.searchParams.get('order'),'at.desc,id.desc');return Response.json(history);}
  if(u.pathname.endsWith('/deals')&&(!options.method||options.method==='GET'))return Response.json([]);
  writes.push({path:u.pathname,body});
  if(u.pathname.endsWith('/collection_audit')&&body.status==='probe_ok'&&!auditOk)return new Response('unavailable',{status:503});
  return Response.json(null);
 };
 try{
  await import(`data:text/javascript;base64,${Buffer.from(code+'\n//'+sequence++).toString('base64')}`);
  const response=await handler(new Request('https://edge.invalid',{method:'POST',headers:{'x-collection-token':'test-only'},body:JSON.stringify({store})}));
  return {response,requests,writes,upstream:requests.filter(r=>new URL(r.url).hostname!=='db.invalid')};
 }finally{global.fetch=previousFetch;if(previousDeno===undefined)delete globalThis.Deno;else globalThis.Deno=previousDeno;}
}
test('open circuit probes only, preserves snapshot and budget finalisation, then permits next due full run',async()=>{
 const probe=await run();assert.equal(probe.response.status,200);assert.equal(probe.upstream.length,2);
 assert(!probe.writes.some(w=>w.path.endsWith('/deals')));
 const status=probe.writes.find(w=>w.path.endsWith('/collection_status')).body;
 assert(!('saved'in status));assert(!('last_success_at'in status));
 const audit=probe.writes.find(w=>w.path.endsWith('/collection_audit')).body;
 assert.equal(audit.status,'probe_ok');assert.equal(audit.requests,2);assert(audit.rows>0);
 assert(probe.requests.at(-1).url.includes('finish_catalogue_run'));assert(probe.requests.at(-1).body.p_bytes>0);
 const full=await run({history:[audit,zero,zero]});assert.equal(full.response.status,200);assert.equal(full.upstream.length,13);assert(full.writes.some(w=>w.path.endsWith('/deals')));
});
test('reservation denial, review stop and Big W permission pause make zero source requests',async()=>{
 for(const options of [{allowed:false},{review:true},{store:'Big W'}]){
  const r=await run(options);assert.equal(r.upstream.length,0);
  assert(!r.writes.some(w=>w.path.endsWith('/deals')));
  if(!options.allowed&&options.allowed!==undefined){assert.equal(r.requests.length,1);assert.equal(r.response.status,403);}
  else{assert(r.requests.at(-1).url.includes('finish_catalogue_run'));assert.equal(r.writes.find(w=>w.path.endsWith('/collection_status')).body.review_required,true);}
 }
});
test('empty probe pauses for parser review and robots refusal stops after one request',async()=>{
 for(const options of [{empty:true},{robotsDenied:true}]){
  const r=await run(options);assert.equal(r.response.status,502);assert.equal(r.upstream.length,options.empty?2:1);
  const status=r.writes.find(w=>w.path.endsWith('/collection_status')).body;
  assert.equal(status.review_required,true);assert.equal(status.failure_kind,options.empty?'parser':'policy');
  assert(!r.writes.some(w=>w.path.endsWith('/deals')));
 }
});
test('a failed probe audit is not recorded as successful recovery',async()=>{
 const r=await run({auditOk:false});assert.equal(r.response.status,502);
 assert.equal(r.writes.filter(w=>w.path.endsWith('/collection_audit')).at(-1).body.status,'failed');
 assert(!r.writes.some(w=>w.path.endsWith('/deals')));
});
test('existing row-drop quarantine still blocks product writes after full collection',async()=>{
 const r=await run({history:[],priorSaved:300});assert.equal(r.response.status,502);
 assert.equal(r.upstream.length,13);assert(!r.writes.some(w=>w.path.endsWith('/deals')));
 assert.equal(r.writes.find(w=>w.path.endsWith('/collection_status')).body.failure_kind,'parser');
});
