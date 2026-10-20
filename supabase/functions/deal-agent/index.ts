import {object,redact,validatePlan,stores,calculateBasket,cents,blockedRequest} from '../../../src/lib/agents/core.ts';
import {interpret,interpretAction,executeTool,ProviderError,type Config,type DB} from './runtime.ts';
declare const Deno:{env:{get:(k:string)=>string|undefined};serve:(handler:(req:Request)=>Promise<Response>)=>void};
const env=(k:string)=>Deno.env.get(k);
const base=env('SUPABASE_URL')||'';
const service=env('SUPABASE_SERVICE_ROLE_KEY')||'';
const encoder=new TextEncoder();
const db:DB=async(path,body,method)=>{const r=await fetch(`${base}/rest/v1${path}`,{method:method||(body===undefined?'GET':'POST'),headers:{apikey:service,Authorization:`Bearer ${service}`,'Content-Type':'application/json',Prefer:'return=representation,resolution=merge-duplicates'},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(4000)});if(!r.ok)throw Error('Database unavailable');const text=await r.text();return text?JSON.parse(text):null;};
async function hash(value:string){const secret=env('AGENT_HASH_SECRET');if(!secret||secret.length<32)throw Error('Assistant not configured');const key=await crypto.subtle.importKey('raw',encoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);return [...new Uint8Array(await crypto.subtle.sign('HMAC',key,encoder.encode(value)))].map(x=>x.toString(16).padStart(2,'0')).join('');}
Deno.serve(async req=>{
 const origin=req.headers.get('origin')||'';const allowed=['https://savehalf.vercel.app','https://savehalf-au.vercel.app'];
 if(env('AGENT_ALLOW_LOCALHOST')==='true')allowed.push('http://localhost:5173');
 const headers={'Content-Type':'application/json','Access-Control-Allow-Origin':allowed.includes(origin)?origin:'https://savehalf.vercel.app','Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info','Access-Control-Allow-Methods':'POST,OPTIONS','Cache-Control':'no-store','Vary':'Origin'};
 const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers});
 if(req.method==='OPTIONS')return new Response(null,{headers});
 if(req.method!=='POST'||(origin&&!allowed.includes(origin)))return json({error:'Not allowed'},403);
 const start=Date.now();let subject='';let event='';let provider='';let reserved=0;let tool='';
 try{
 // Reject oversized bodies before parsing; never trust Content-Length alone.
 const reader=req.body?.getReader();let raw='';if(!reader)return json({error:'Empty request'},400);const decoder=new TextDecoder();let bytes=0;
 while(true){const {value,done}=await reader.read();if(done)break;bytes+=value.length;if(bytes>4096){await reader.cancel();return json({error:'Request too large'},413);}raw+=decoder.decode(value,{stream:true});}raw+=decoder.decode();
 const body=object(JSON.parse(raw));
 const config=(await db('/agent_config?select=enabled,primary_model,fallback_model,fallback_enabled&id=eq.true') as Config[])[0];
 if(!config?.enabled)return json({fallback:true,message:'The AI assistant is switched off. Search and filters are still available.'});
 if(body.action==='quality'){
   if(req.headers.get('authorization')!==`Bearer ${service}`)return json({error:'Not allowed'},403);
   if(typeof body.title!=='string'||body.title.length>200)return json({error:'Invalid title'},400);
   subject=await hash('quality:'+new Date().toISOString().slice(0,10));
   if(!env('GROQ_API_KEY')||!await db('/rpc/agent_reserve',{p_subject:subject,p_ip:subject,p_signed:true,p_provider:'groq'}))return json({suggestion:null});
   reserved=4000;provider='groq';const result=await interpretAction('quality',body.title,config,'groq',env);
   if(typeof result.name!=='string'||result.name.length>200||typeof result.size!=='number'||!Number.isFinite(result.size)||result.size<0||result.size>100000||!['g','ml','each','unknown'].includes(String(result.unit))||typeof result.confidence!=='number'||result.confidence<0||result.confidence>1)throw Error('Invalid suggestion');
   await db('/agent_events',{subject,agent:'quality',tool:'quality',provider,reserved_tokens:reserved,latency_ms:Date.now()-start,status:'quarantined'});
   return json({suggestion:{...result,status:'quarantined'}});
 }
 // Platform verifies JWT. Validate user JWT against Auth; never trust decoded claims/user IDs.
 const authorization=req.headers.get('authorization')||'';const bearer=authorization.replace(/^Bearer /i,'');let user:string|null=null;
 if(bearer&&bearer!==env('SUPABASE_ANON_KEY')){const auth=await fetch(`${base}/auth/v1/user`,{headers:{apikey:env('SUPABASE_ANON_KEY')||'',Authorization:authorization},signal:AbortSignal.timeout(4000)});if(!auth.ok)return json({error:'Please sign in again'},401);const data=object(await auth.json());if(data.is_anonymous!==true&&typeof data.id==='string')user=data.id;}
 // The gateway's final forwarded address is an advisory network throttle, not identity.
 // Unknown addresses share a bucket; atomic global budgets remain the hard abuse boundary.
 const network=(req.headers.get('x-forwarded-for')?.split(',').at(-1)?.trim()||'unknown').slice(0,100);
 const day=new Date().toISOString().slice(0,10);const ip=await hash(`network:${day}:${network}`);subject=await hash(user?`user:${day}:${user}`:`anon:${day}:${network}`);
 if(body.action==='save_list'){
 if(!user)return json({error:'Sign in to save a list'},401);
 if(body.confirm!==true||!Array.isArray(body.items)||body.items.length<1||body.items.length>12||!Number.isInteger(body.budgetCents)||Number(body.budgetCents)<0||Number(body.budgetCents)>500000||!/^[0-9a-f-]{36}$/i.test(String(body.requestId||'')))return json({error:'Invalid list'},400);
 for(const v of body.items){const item=object(v);if(!/^[0-9a-f-]{36}$/i.test(String(item.id))||!Number.isInteger(item.quantity)||Number(item.quantity)<1||Number(item.quantity)>20)return json({error:'Invalid item'},400);}
 const id=await db('/rpc/agent_save_list',{p_user:user,p_request:body.requestId,p_items:body.items,p_budget:body.budgetCents});return json({ok:true,id});
 }
 if(body.action==='feedback'){
 const id=String(body.eventId||'');if(!/^[0-9a-f-]{36}$/i.test(id)||![1,-1].includes(Number(body.vote)))return json({error:'Invalid feedback'},400);
 const owned=await db(`/agent_events?select=id&id=eq.${id}&subject=eq.${subject}&limit=1`) as unknown[];if(!owned.length)return json({error:'Answer not found'},404);
 await db('/agent_feedback?on_conflict=event_id',{event_id:id,vote:Number(body.vote)},'POST');return json({ok:true});}
 if(typeof body.prompt!=='string'||!body.prompt.trim()||body.prompt.length>240)return json({error:'Use a question of 1–240 characters'},400);
 if(!Array.isArray(body.stores)||body.stores.length>7||!body.stores.length||body.stores.some(s=>!stores.includes(s as typeof stores[number])))return json({error:'Choose valid stores'},400);
 if(body.consent!==true)return json({error:'Please accept the AI privacy notice first'},400);
 const chosen=[...new Set(body.stores as string[])].sort();const prompt=redact(body.prompt.trim());
 if(blockedRequest(prompt))return json({fallback:true,message:'I can help with current deals and shopping lists. Please use a shopping question or normal search.'});
 const reserve=(p:string)=>db('/rpc/agent_reserve',{p_subject:subject,p_ip:ip,p_signed:!!user,p_provider:p}) as Promise<boolean>;
 if(!await reserve('request'))return json({fallback:true,message:'Assistant allowance reached. Please use search and filters.'});
 if(body.action==='planner'){
 if(!env('GROQ_API_KEY'))return json({fallback:true,message:'AI planning is awaiting server configuration. Use the existing shopping list.'});
 if(!await reserve('groq'))return json({fallback:true,message:'Planner allowance reached. Use the existing shopping list.'});
 reserved=4000;provider='groq';let parsed;
 try{parsed=await interpretAction('planner',prompt,config,'groq',env);await db('/rpc/agent_circuit',{p_provider:'groq',p_failed:false});}
 catch(e){const retry=e instanceof ProviderError&&(e.status===429||e.status>=500);await db('/rpc/agent_circuit',{p_provider:'groq',p_failed:retry});if(!retry||!config.fallback_enabled||!env('CLOUDFLARE_AI_TOKEN')||!await reserve('cloudflare'))throw e;reserved+=4000;provider='cloudflare';try{parsed=await interpretAction('planner',prompt,config,'cloudflare',env);await db('/rpc/agent_circuit',{p_provider:'cloudflare',p_failed:false});}catch(error){await db('/rpc/agent_circuit',{p_provider:'cloudflare',p_failed:true});throw error;}}
 if(typeof parsed.budget!=='number')throw Error('Specify an AUD budget');cents(parsed.budget);
 if(!Array.isArray(parsed.items)||parsed.items.length<1||parsed.items.length>12)throw Error('Use 1–12 items');
 const lines=await Promise.all(parsed.items.map(async value=>{const v=object(value);if(typeof v.item!=='string'||!v.item.trim()||v.item.length>60||!Number.isInteger(v.quantity)||Number(v.quantity)<1||Number(v.quantity)>20)throw Error('Invalid list');const result=await executeTool(validatePlan({tool:'search_deals',query:v.item},chosen),db);return {item:v.item,quantity:Number(v.quantity),candidates:result.sources};}));
 const basket=calculateBasket(lines,parsed.budget);event=crypto.randomUUID();await db('/agent_events',{id:event,subject,agent:'planner',tool:'planner',provider,reserved_tokens:reserved,latency_ms:Date.now()-start,status:'ok'});
 return json({eventId:event,basket,message:basket.note});
 }
 const cacheKey=await hash(JSON.stringify({v:1,prompt:prompt.toLowerCase().replace(/\s+/g,' '),stores:chosen,model:config.primary_model}));
 const cached=await db(`/agent_cache?select=plan&hash=eq.${cacheKey}&expires_at=gt.${new Date().toISOString()}&limit=1`) as {plan:unknown}[];
 let plan;if(cached.length)plan=validatePlan(cached[0].plan,chosen);
 else{
   if(!env('GROQ_API_KEY'))return json({fallback:true,message:'AI is awaiting server configuration. Use normal search in the meantime.'});
   if(!await reserve('groq'))return json({fallback:true,message:'Assistant is busy or at its daily limit. Search is still available.'});
   provider='groq';reserved+=4000;
   try{plan=await interpret(prompt,chosen,config,'groq',env);await db('/rpc/agent_circuit',{p_provider:'groq',p_failed:false});}
   catch(error){const retry=error instanceof ProviderError&&(error.status===429||error.status>=500);await db('/rpc/agent_circuit',{p_provider:'groq',p_failed:retry});
    if(!retry||!config.fallback_enabled||!env('CLOUDFLARE_AI_TOKEN')||!await reserve('cloudflare'))throw error;
    provider='cloudflare';reserved+=4000;try{plan=await interpret(prompt,chosen,config,'cloudflare',env);await db('/rpc/agent_circuit',{p_provider:'cloudflare',p_failed:false});}catch(e){await db('/rpc/agent_circuit',{p_provider:'cloudflare',p_failed:true});throw e;}}
   await db('/agent_cache',{hash:cacheKey,plan,expires_at:new Date(Date.now()+600000).toISOString()});
 }
 tool=plan.tool;const result=await executeTool(plan,db);event=crypto.randomUUID();
 await db('/agent_events',{id:event,subject,agent:'deal',tool,provider:provider||'cache',reserved_tokens:reserved,latency_ms:Date.now()-start,status:result.sources.length?'ok':'no_data'});
 // Stream trusted structured records, never unvalidated model prose or HTML.
 const stream=new ReadableStream({start(controller){for(const data of [{type:'answer',eventId:event,message:result.sources.length?result.notice:'No fresh matching data was found. Try another store or normal search.'},...result.sources.map(source=>({type:'source',source})),...(result.history?[{type:'history',history:result.history}]:[]),{type:'done'}])controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));controller.close();}});
 return new Response(stream,{headers:{...headers,'Content-Type':'text/event-stream'}});
 }catch{
 if(subject)try{await db('/agent_events',{subject,agent:'deal',tool:tool||null,provider:provider||null,reserved_tokens:reserved,latency_ms:Date.now()-start,status:'unavailable'});}catch{/* No prompts, identifiers or provider error bodies logged. */}
 return json({fallback:true,message:'The assistant could not answer safely. Please use normal search and filters.'});
 }
});
