/** Owner terminal only. Never print credentials, provider responses or submitted prompts. */
const base=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
if(!base||!key)throw Error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY securely in this terminal.');
const url=new URL(base);if(url.protocol!=='https:'||url.hostname!=='mdbqlcnzbakimfjrfczz.supabase.co')throw Error('Unexpected SaveHalf project URL');
const smoke=process.argv.includes('--smoke');
const body=smoke?{action:'owner_smoke',prompt:'coffee under $10',stores:['Aldi'],consent:true}:{action:'readiness'};
const response=await fetch(`${url.origin}/functions/v1/deal-agent`,{method:'POST',headers:{'Content-Type':'application/json',apikey:key,Authorization:`Bearer ${key}`},body:JSON.stringify(body),signal:AbortSignal.timeout(28000)});
if(!response.ok)throw Error(`Owner check failed: HTTP ${response.status}`);
if(!smoke){const status=await response.json();console.log(JSON.stringify(status,null,2));if(!status.credentials?.groq||!status.credentials?.hashSecret||!status.modelsAllowed)process.exitCode=1;}
else if(!response.headers.get('content-type')?.includes('text/event-stream')){const status=await response.json();console.log(status.message||'Smoke test did not return grounded evidence.');process.exitCode=1;}
else{const data=await response.text();const events=data.split('\n\n').filter(x=>x.startsWith('data: ')).map(x=>JSON.parse(x.slice(6)));const sources=events.filter(x=>x.type==='source');console.log(JSON.stringify({completed:events.some(x=>x.type==='done'),sourceCount:sources.length,hasCheckedTimes:sources.every(x=>typeof x.source?.checked==='string'),message:sources.length?'Grounded smoke response received. Review live-model evaluations before public release.':'No current match; this is not a successful grounding demonstration.'},null,2));if(!sources.length)process.exitCode=1;}
