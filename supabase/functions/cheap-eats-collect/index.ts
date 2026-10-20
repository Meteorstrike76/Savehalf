import {collectOffers} from './offers.mjs';
Deno.serve(async(req:Request)=>{
 const reply=(x:unknown,status=200)=>new Response(JSON.stringify(x),{status,headers:{'Content-Type':'application/json'}});
 if(req.method!=='POST')return reply({message:'Use POST'},405);
 const token=req.headers.get('x-collection-token');if(!token||token.length>100)return reply({message:'Unauthorized'},401);
 const url=Deno.env.get('SUPABASE_URL')!;const key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
 const headers={apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json'};
 const rest=(path:string,body:unknown,method='POST',extra={})=>fetch(url+'/rest/v1/'+path,{method,headers:{...headers,...extra},body:JSON.stringify(body),signal:AbortSignal.timeout(12000)});
 const reserved=await rest('rpc/start_cheap_eats_run',{p_token:token});if(!reserved.ok||await reserved.json()!==true)return reply({message:'Unauthorized or daily run limit reached'},403);
 try{
 const results=await collectOffers();
 for(const result of results){if(result.status!=='failed'){
 const disabled=await rest('cheap_eats?source_key=eq.'+result.key,{is_active:false},'PATCH');if(!disabled.ok)throw Error('Database update failed');
 if(result.rows.length){const saved=await rest('cheap_eats?on_conflict=id',result.rows.map(r=>({...r,source_key:result.key})),'POST',{Prefer:'resolution=merge-duplicates'});if(!saved.ok)throw Error('Database write failed');}}
 const recorded=await rest('cheap_eats_sources?source_key=eq.'+result.key,{status:result.status,message:result.message,last_checked_at:new Date().toISOString(),offers:result.rows.length},'PATCH');if(!recorded.ok)throw Error('Source status write failed');
 }
 const summary=results.map(r=>({source:r.key,status:r.status,offers:r.rows.length}));await rest('cheap_eats_run?id=eq.1',{status:'finished',last_finished:new Date().toISOString()},'PATCH');return reply({sources:summary});
 }catch{await rest('cheap_eats_run?id=eq.1',{status:'failed',last_finished:new Date().toISOString()},'PATCH');return reply({message:'Offer collection failed'},502);}
});
