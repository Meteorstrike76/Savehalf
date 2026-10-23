/** Read-only public telemetry: never contacts a retailer, writes a row or resumes a pause. */
export function recoveryAdvice(row){
 if(row.review_required){
  if(row.failure_kind==='access'||[401,403].includes(row.http_status))return 'Keep collection paused. Obtain permitted access or a licensed feed; use dated snapshots/manual retailer links meanwhile.';
  if(row.failure_kind==='policy')return 'Keep collection paused until source permission and robots rules are reviewed.';
  return 'Keep collection paused. Reproduce the parser failure with a permitted saved fixture, verify identifiers/prices, then review before resuming.';
 }
 if(row.status==='failed'||row.status==='empty')return row.failure_kind==='transport'?'Respect backoff. Diagnose the declared HTTP transport; do not change identity, proxy route or access controls.':'Inspect bounded diagnostics and retry only after the recorded delay; retain old prices as historical.';
 return 'No recovery action required. Check last-success freshness and sampled prices; success does not prove full catalogue coverage.';
}
export async function diagnose(base,key,fetcher=fetch){
 const url=new URL(base);
 if(url.protocol!=='https:'||!/^[-a-z0-9]+\.supabase\.co$/.test(url.hostname)||url.username||url.password||url.search||url.hash||!['','/'].includes(url.pathname))throw Error('Use the project Supabase HTTPS origin');
 if(!key)throw Error('Public anon/publishable key is required');
 const endpoint=new URL('/rest/v1/collection_status',url);
 endpoint.searchParams.set('select','store,status,failure_kind,http_status,review_required,last_success_at,next_run_after');endpoint.searchParams.set('limit','8');endpoint.searchParams.set('order','store');
 const headers={apikey:key};if(key.startsWith('eyJ'))headers.Authorization='Bearer '+key;
 const response=await fetcher(endpoint,{headers,signal:AbortSignal.timeout(10000)});
 if(!response.ok)throw Error(`Public health read failed (${response.status})`);
 const rows=await response.json();if(!Array.isArray(rows)||rows.length>8)throw Error('Unexpected public health result');
 return rows.map(r=>({store:String(r.store).slice(0,40),status:String(r.status).slice(0,20),reviewRequired:r.review_required===true,lastSuccess:r.last_success_at,nextRetry:r.review_required?null:r.next_run_after,action:recoveryAdvice(r)}));
}
if(process.argv[1]&&new URL(import.meta.url).pathname===process.argv[1]){
 try{const rows=await diagnose(process.env.SUPABASE_URL||process.env.VITE_SUPABASE_URL,process.env.SUPABASE_ANON_KEY||process.env.VITE_SUPABASE_ANON_KEY);console.log(JSON.stringify({checkedAt:new Date().toISOString(),readOnly:true,collectors:rows},null,2));}
 catch(error){console.error(error.message);process.exitCode=1;}
}
