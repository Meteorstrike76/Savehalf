import {collectCommunity} from './community.mjs';
import {collect,getHtml,getResource} from './http-collect.mjs';
import {sourceLimits,parserDrift} from './governance.mjs';
import {CollectionError,diagnostic,publicFailureMessage} from './recovery.mjs';
Deno.serve(async(req:Request)=>{
 const reply=(x:unknown,status=200)=>new Response(JSON.stringify(x),{status,headers:{'Content-Type':'application/json'}});
 if(req.method!=='POST')return reply({message:'Use POST'},405);
 const token=req.headers.get('x-collection-token');if(!token||token.length>100)return reply({message:'Unauthorized'},401);
 const url=Deno.env.get('SUPABASE_URL')!;const key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
 const headers={apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json'};
 const rest=async(path:string,body:unknown,method='POST')=>fetch(url+'/rest/v1/'+path,{method,headers,body:JSON.stringify(body),signal:AbortSignal.timeout(12000)});
 let store:string;try{const text=await req.text();if(text.length>1000)return reply({message:'Bad request'},400);store=JSON.parse(text).store;}catch{return reply({message:'Bad request'},400);}
 const reserved=await rest('rpc/start_catalogue_run',{p_token:token,p_store:store});if(!reserved.ok||await reserved.json()!==true)return reply({message:'Unauthorized or run limit reached'},403);
 const limits=sourceLimits(store);let calls=0;const requestDiagnostics=[];let stage='fetch';const budget={used:0,limit:limits.bytes,exceeded:false};
 const boundedResource=async(u:string,options={})=>{if(budget.exceeded)throw Error('Source byte budget reached');if(++calls>limits.requests)throw Error('Source request budget reached');return await getResource(u,budget,options);};
 try{
 if(store==='Woolworths')throw new CollectionError('Direct source permission requires review','policy');
 if(store==='OzBargain'){const result=await collectCommunity({api:url+'/rest/v1',headers,get:boundedResource});if(budget.exceeded)throw Error('Source byte budget reached');const now=new Date().toISOString();stage='status';const recorded=await rest('collection_status?store=eq.OzBargain',{failure_kind:null,http_status:null,retry_after_seconds:null,review_required:false,diagnostics:[],status:'ok',last_finished:now,last_success_at:now,saved:result.saved,sales:0,message:result.message,request_count:calls,body_bytes:budget.used,image_count:0,drift_flag:false},'PATCH');if(!recorded.ok)throw Error('Could not record community collection status');await rest('collection_audit',{store,status:'ok',rows:result.saved,requests:calls,body_bytes:budget.used,image_count:0,drift:false});return reply(result);}
 const previousStatus=await fetch(url+'/rest/v1/collection_status?select=saved&store=eq.'+encodeURIComponent(store),{headers,signal:AbortSignal.timeout(12000)});if(!previousStatus.ok)throw Error('Could not read previous collection health');const old=(await previousStatus.json())[0];
 const boundedGet=async(u:string,options={})=>{if(budget.exceeded)throw Error('Source byte budget reached');if(++calls>limits.requests)throw Error('Source request budget reached');return await getHtml(u,budget,options);};
 const {rows,attempted,sales,diagnostics=[]}=await collect(store,boundedGet);requestDiagnostics.push(...diagnostics);stage='validation';const now=new Date().toISOString();if(budget.exceeded)throw Error('Source byte budget reached');
 const drift=parserDrift(old?.saved||0,rows.length);
 const metrics={failure_kind:null,http_status:null,retry_after_seconds:null,review_required:false,diagnostics:requestDiagnostics,request_count:calls,body_bytes:budget.used,image_count:rows.filter(r=>r.image_url).length,drift_flag:drift};
 if(drift){await rest('collection_status?store=eq.'+encodeURIComponent(store),{...metrics,review_required:true,failure_kind:'parser',status:'failed',last_finished:now,message:'Large row-count drop quarantined for parser review; prior products were not refreshed.'},'PATCH');await rest('collection_audit',{store,status:'quarantined',rows:rows.length,requests:calls,body_bytes:budget.used,image_count:metrics.image_count,drift:true});return reply({store,message:'Parser drift quarantined'},502);}
 if(rows.length){stage='database';
 // A sparse source response must not erase previously verified image URLs.
 const previous=await fetch(url+'/rest/v1/deals?select=external_id,image_url&store_category=eq.'+encodeURIComponent(store)+'&image_url=not.is.null&limit=300',{headers,signal:AbortSignal.timeout(12000)});
 if(!previous.ok)throw Error('Could not preserve existing product images');
 const images=new Map((await previous.json()).map((r:{external_id:string;image_url:string})=>[r.external_id,r.image_url]));
 for(const row of rows)if(!row.image_url&&images.has(row.external_id))row.image_url=images.get(row.external_id);
 const saved=await fetch(url+'/rest/v1/deals?on_conflict=store_category,external_id',{method:'POST',headers:{...headers,Prefer:'resolution=merge-duplicates'},body:JSON.stringify(rows.map(r=>({...r,last_seen_at:now,is_active:true,promotion_ends_at:null,observed_region:null,source_url:r.deal_url}))),signal:AbortSignal.timeout(15000)});if(!saved.ok)throw Error('Database write failed');}
 stage='status';const status={...metrics,...(rows.length?{last_success_at:now}:{}),status:rows.length?'ok':'empty',last_finished:now,saved:rows.length,sales,message:rows.length?`Verified ${rows.length} products; ${sales} published reductions from ${attempted} requests.`:'No verified products returned. Retailer access or page layout may require review.'};
 const updated=await rest('collection_status?store=eq.'+encodeURIComponent(store),status,'PATCH');if(!updated.ok)throw Error('Could not record collection status');
 await rest('collection_audit',{store,status:status.status,rows:rows.length,requests:calls,body_bytes:budget.used,image_count:metrics.image_count,drift:false});
 return reply({store,...status});
 }catch(e){const message=publicFailureMessage(e,stage);const d=diagnostic(e,stage,'/');const diag=(e as {diagnostics?:unknown[]}).diagnostics||[d];await rest('collection_status?store=eq.'+encodeURIComponent(store),{status:'failed',last_finished:new Date().toISOString(),request_count:calls,body_bytes:budget.used,message:message.slice(0,200),failure_kind:d.kind,http_status:d.http_status,retry_after_seconds:d.retry_after_seconds,review_required:['access','parser','policy'].includes(d.kind),diagnostics:diag.slice(0,5)},'PATCH');await rest('collection_audit',{store,status:'failed',rows:0,requests:calls,body_bytes:budget.used,image_count:0,drift:false});return reply({store,message},502);}
 finally{await rest('rpc/finish_catalogue_run',{p_token:token,p_store:store,p_bytes:budget.used});}
});
