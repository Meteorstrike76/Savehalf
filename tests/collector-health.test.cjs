const {test}=require('node:test'),assert=require('node:assert/strict');
test('collector health fails on missing, failed, stale or empty required collectors',async()=>{
 const {assessHealth,healthPolicy}=await import('../tools/rollout/health-model.mjs');
 const now=Date.parse('2026-10-22T00:00:00Z'),row={store:'Aldi',status:'ok',last_success_at:'2026-10-21T23:00:00Z',saved:20};
 const check=r=>assessHealth({db_bytes:17000000,legacy_collectors:r},healthPolicy('Aldi'),now);
 assert.equal(check([row]).healthy,true);
 for(const r of [[],[{...row,status:'failed'}],[{...row,saved:0}],[{...row,last_success_at:'2026-10-19T00:00:00Z'}],[{...row,last_success_at:'2026-10-23T00:00:00Z'}]])assert.equal(check(r).healthy,false);
 assert.equal(check([row,{store:'Coles',review_required:true}]).healthy,true);
 assert.equal(check([row,{store:'Coles',review_required:true}]).reviews.length,1);
 assert.equal(check([{...row,review_required:true}]).healthy,false);
 assert.equal(assessHealth({},healthPolicy('Aldi'),now).healthy,false);
 assert.throws(()=>healthPolicy('Aldi,Aldi'));assert.throws(()=>healthPolicy('unknown'));assert.throws(()=>healthPolicy('Aldi','999'));
});

test('read-only diagnosis reads public health and preserves access-denial pauses',async()=>{
 const {diagnose}=await import('../tools/rollout/diagnose.mjs');let calls=0;
 const rows=await diagnose('https://test.supabase.co','public-test-key',async(url,options)=>{calls++;assert.equal(url.pathname,'/rest/v1/collection_status');assert.equal(options.headers.apikey,'public-test-key');assert.equal(options.method,undefined);return new Response(JSON.stringify([{store:'Kmart',status:'failed',failure_kind:'access',http_status:403,review_required:true,next_run_after:'2026-10-23'}]));});
 assert.equal(calls,1);assert.equal(rows[0].nextRetry,null);assert.match(rows[0].action,/Keep collection paused/);
 await assert.rejects(diagnose('https://evil.example','public-test-key',()=>{throw Error('must not fetch');}));
});

test('a failed collector prevents a success heartbeat in the actual health runner',()=>{
 const {mkdtempSync,readFileSync,rmSync}=require('node:fs'),{tmpdir}=require('node:os'),{join,resolve}=require('node:path'),{pathToFileURL}=require('node:url'),{spawnSync}=require('node:child_process');const dir=mkdtempSync(join(tmpdir(),'savehalf-health-'));
 try{const source=pathToFileURL(resolve('tools/rollout/health.mjs')).href;const code=`let calls=0;globalThis.fetch=async()=>{calls++;if(calls>1)throw Error('heartbeat must not be called');return new Response(JSON.stringify({db_bytes:17000000,legacy_collectors:[]}));};await import(${JSON.stringify(source)});if(calls!==1)throw Error('unexpected request count');`;
 const run=spawnSync(process.execPath,['--input-type=module','-e',code],{cwd:dir,env:{...process.env,SUPABASE_URL:'https://test.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'test-only-fixture',BETTERSTACK_HEARTBEAT_URL:'https://uptime.betterstack.com/api/v1/heartbeat/test-fixture',SAVEHALF_HEALTH_STORES:'Aldi',SAVEHALF_HEALTH_MAX_AGE_HOURS:'36'},encoding:'utf8'});
 assert.equal(run.status,1);assert.match(run.stderr,/collector telemetry missing/);assert.match(readFileSync(join(dir,'savehalf-health.md'),'utf8'),/"healthy": false/);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
