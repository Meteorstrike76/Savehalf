/** Public HTML only. No browser contexts, authenticated sessions or private API fallbacks. */
import {createClient} from '@supabase/supabase-js';
import {collect,getHtml} from '../../supabase/functions/catalogue-collect/http-collect.mjs';
import {sourceLimits,parserDrift} from '../../supabase/functions/catalogue-collect/governance.mjs';
import {diagnostic,publicFailureMessage} from '../../supabase/functions/catalogue-collect/recovery.mjs';
const dry=process.argv.includes('--dry-run');
const key=process.env.SUPABASE_SERVICE_ROLE_KEY,url=process.env.SUPABASE_URL;
if(!dry&&(!key||!url))throw Error('Configure GitHub secrets SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
const sb=dry?null:createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:(input,init)=>fetch(input,{...init,signal:AbortSignal.timeout(15000)})}});
const canonical=['Aldi','Best & Less','Coles','Big W','Kmart','Target','Woolworths'];
const selected=process.argv.find(a=>a.startsWith('--store='))?.slice(8)||process.env.REQUESTED_STORES||'Aldi,Best & Less';
const stores=selected.split(',').map(s=>canonical.find(x=>x.toLowerCase().replaceAll(' ','')===s.trim().toLowerCase().replaceAll(' ','')));
if(stores.some(s=>!s))throw Error('Unsupported store; community-only retailers have no admitted direct adapter.');
if(stores.length>7||new Set(stores).size!==stores.length)throw Error('Invalid store selection');
let failed=false;
for(const store of stores){
 if(dry){try{if(store==='Woolworths')throw Error('Permission required');const limits=sourceLimits(store),budget={used:0,limit:limits.bytes};let calls=0;const result=await collect(store,async u=>{if(calls>=limits.requests)throw Error('Request budget reached');calls++;return getHtml(u,budget);});if(!result.rows.length)throw Error('No verified products');console.log(`${store}: dry run ${result.rows.length} rows, ${calls} requests, ${budget.used} bytes; no writes`);}catch{failed=true;console.error(`${store}: dry run failed`);}continue;}
 const {data:lease,error}=await sb.rpc('begin_public_scrape',{p_store:store});
 if(error||!lease?.allowed){console.error(`${store}: paused, not due or unavailable; no upstream request made`);failed=true;continue;}
 const limits=sourceLimits(store),budget={used:0,limit:limits.bytes,exceeded:false};let calls=0,added=0,updated=0,candidateRows=0,kind=null,retry=null,status='failed';
 try{
  // Woolworths terms prohibit automated retrieval; require a separately authorised adapter.
  if(store==='Woolworths')throw Object.assign(Error('Source permission requires review'),{kind:'policy'});
  const before=await sb.from('deals').select('external_id').eq('store_category',store).eq('is_active',true).gte('last_seen_at',new Date(Date.now()-72*3600000).toISOString()).limit(300);
  if(before.error)throw Error('Cannot read prior source state');
  const get=async u=>{if(calls>=limits.requests)throw Error('Source request budget reached');calls++;return getHtml(u,budget);};
  const result=await collect(store,get);candidateRows=result.rows.length;
  if(budget.exceeded||!result.rows.length||parserDrift(before.data.length,result.rows.length))throw Object.assign(Error('Empty or suspicious source result'),{kind:'parser'});
  const write=await sb.rpc('ingest_public_scrape',{p_run:lease.id,p_rows:result.rows});if(write.error)throw Error('Upsert failed');
  added=write.data.added;updated=write.data.updated;const rows=result.rows;
  status='ok';console.log(`${store}: ${rows.length} checked; ${added} new IDs, ${updated} existing IDs; ${calls} requests; partial snapshot`);
 }catch(e){const d=diagnostic(e,'fetch','/');kind=d.kind;retry=d.retry_after_seconds;console.error(`${store}: ${publicFailureMessage(e)}`);failed=true;}
 finally{
  const defer=await sb.rpc('record_public_retry',{p_run:lease.id,p_seconds:retry});if(defer.error){failed=true;console.error(`${store}: retry telemetry unavailable`);}
  const {error}=await sb.rpc('finish_public_scrape',{p_run:lease.id,p_status:status,p_added:status==='ok'?added:0,p_updated:status==='ok'?updated:0,p_failed:status==='ok'?0:candidateRows,p_requests:calls,p_bytes:budget.used,p_kind:kind});
  if(error){console.error(`${store}: failed to finalise telemetry`);failed=true;}
 }
}
if(failed)process.exitCode=1;
