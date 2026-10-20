export class CollectionError extends Error {
 constructor(message,kind='transport',status=null,retryAfterSeconds=null){super(message);this.name='CollectionError';this.kind=kind;this.httpStatus=status;this.retryAfterSeconds=retryAfterSeconds;}
}
export function retryAfter(value,now=Date.now()){
 if(!value)return null;
 const seconds=/^\d+$/.test(value.trim())?Number(value):Math.ceil((Date.parse(value)-now)/1000);
 return Number.isFinite(seconds)&&seconds>0?Math.min(seconds,172800):null;
}
export function diagnostic(error,stage,path){
 const message=String(error?.message||'Request failed');
 const kind=error?.kind||(/schema|pagination|product data|no product|RSS format changed|unchanged without a saved snapshot/i.test(message)?'parser':/robots policy|policy requires review|disallowed by robots/i.test(message)?'policy':/budget|limit/i.test(message)?'budget':'transport');
 return {stage,path:new URL(error?.sourcePath||path,'https://source.invalid').pathname.slice(0,100),kind,http_status:error?.httpStatus??null,retry_after_seconds:error?.retryAfterSeconds??null};
}
export function publicFailureMessage(error,stage='fetch'){
 const d=diagnostic(error,stage,'/');
 if(d.kind==='access')return `Retailer access unavailable${d.http_status?` (HTTP ${d.http_status})`:''}; collection paused for review.`;
 if(d.kind==='policy')return 'Source policy requires review; collection paused.';
 if(d.kind==='parser')return 'Product structure could not be verified; collection paused for parser review.';
 if(d.kind==='rate_limit')return 'Source rate limit reached; respecting retry delay.';
 if(d.kind==='budget')return 'Collection request or response budget reached.';
 if(stage==='database'||stage==='status')return 'Database update could not be confirmed; no successful import recorded.';
 return `Source request failed${d.http_status?` (HTTP ${d.http_status})`:''}; network retry will use the backoff schedule.`;
}
export function listingFailure(results,paths){
 const failures=results.flatMap((r,i)=>r.status==='rejected'?[diagnostic(r.reason,'listing',paths[i])]:[]);
 const blocked=failures.find(f=>f.kind==='access');
 const first=blocked||failures[0];
 const e=new CollectionError(`Listing collection failed: ${first?.kind||'transport'}${first?.http_status?` (HTTP ${first.http_status})`:''}`,first?.kind,first?.http_status,first?.retry_after_seconds);
 e.diagnostics=failures.slice(0,5);return e;
}
