const formatter = new Intl.DateTimeFormat('en-CA', {timeZone:'Australia/Sydney',year:'numeric',month:'2-digit',day:'2-digit'});
function localDay(timestamp:number){
 const parts=formatter.formatToParts(timestamp);
 const get=(type:string)=>Number(parts.find(p=>p.type===type)!.value);
 return Date.UTC(get('year'),get('month')-1,get('day'));
}
// Conservative recheck boundary; not an assertion of published offer expiry.
export function promotionCurrent(store:string,checkedAt:string|undefined,now=Date.now()){
 if(!['Coles','Woolworths'].includes(store))return true;
 const checked=Date.parse(checkedAt||'');if(!Number.isFinite(checked)||checked>now)return false;
 const today=localDay(now),boundary=today-((new Date(today).getUTCDay()+4)%7)*86400000;
 return localDay(checked)>=boundary;
}
