const stores=['Aldi','Best & Less','Coles','Woolworths','Big W','Kmart','Target','OzBargain'];
export function healthPolicy(value='Aldi,Best & Less',hours='36'){
 const required=value.split(',').map(s=>s.trim()).filter(Boolean),maxAge=Number(hours);
 if(!required.length||required.some(s=>!stores.includes(s))||new Set(required).size!==required.length||!Number.isFinite(maxAge)||maxAge<1||maxAge>72)throw Error('Invalid collector health policy');
 return {required,maxAgeHours:maxAge};
}
export function assessHealth(data,policy=healthPolicy(),now=Date.now()){
 const warnings=[],reviews=[],rows=Array.isArray(data?.legacy_collectors)?data.legacy_collectors:[];
 const bytes=Number(data?.db_bytes);
 if(!Number.isFinite(bytes)||bytes<=0)warnings.push('Database size telemetry missing');
 else if(bytes>96*1024*1024)warnings.push('Optional integration reservation gate is closed');
 for(const row of rows)if(row.review_required)reviews.push({store:row.store,reason:'Owner source review required; automated retries remain paused'});
 for(const store of policy.required){
  const row=rows.find(r=>r.store===store),time=Date.parse(row?.last_success_at||'');
  if(!row){warnings.push(`${store}: collector telemetry missing`);continue;}
  if(row.review_required||!['ok','running'].includes(row.status))warnings.push(`${store}: collector is not healthy`);
  if(!Number.isFinite(time)||time>now+300000||now-time>policy.maxAgeHours*3600000)warnings.push(`${store}: no recent verified success`);
  if(!Number.isInteger(row.saved)||row.saved<=0)warnings.push(`${store}: successful product count missing or empty`);
 }
 return {healthy:warnings.length===0,requiredStores:policy.required,maxAgeHours:policy.maxAgeHours,warnings,reviews};
}
