const HOUR=3600000;
const routes=[['coles','Coles','household'],['woolworths','Woolworths','household'],['big_w','Big W','household'],['kmart','Kmart','household'],['chemist_warehouse','Chemist Warehouse','health-beauty'],['priceline','Priceline','health-beauty']];
export const PROVIDER_CREDIT_RESERVE=60;
export const MAX_REFRESH_PAGES=3;

// Advisory only. This does not reserve credits, call a connector, import data,
// or activate a schedule. A shared reservation is required before automation.
export function planProviderRefresh({health,balance},now=Date.now()){
 const age=(value,maxAge)=>{const t=Date.parse(value);if(!Number.isFinite(t)||t>now||now-t>maxAge)throw Error('Refresh planning requires current health and credit observations');return t;};
 age(health?.checked_at,5*60000);age(balance?.checked_at,60000);
 const credits=balance.credits_remaining;
 if(!Number.isInteger(credits)||credits<0)throw Error('Invalid provider credit balance');
 if(!Array.isArray(health.provider))throw Error('Missing provider coverage observations');
 const candidates=[];
 for(const [store,label,category] of routes){
  const state=health.provider.find(p=>p.store===label);
  const fresh=state?state.fresh_records:0;
  if(!Number.isInteger(fresh)||fresh<0)throw Error('Invalid provider coverage count');
  let due=0,reason='No fresh snapshots';
  if(fresh){
   const retrieved=Date.parse(state.oldest_fresh_retrieval),source=Date.parse(state.oldest_fresh_source_update);
   if(!Number.isFinite(retrieved)||!Number.isFinite(source)||retrieved>now||source>retrieved)throw Error('Cannot verify provider expiry metadata');
   // Begin rotation after one day: at three pages per daily batch, six stores
   // can alternate without waiting until their three-day retrieval expiry.
   due=Math.min(retrieved+24*HOUR,source+6*24*HOUR);
   reason=source+6*24*HOUR<=retrieved+24*HOUR?'Source observations approaching expiry':'Retrieval rotation due';
  }
  if(due<=now)candidates.push({store,label,category,due,reason});
 }
 const budget=Math.min(MAX_REFRESH_PAGES,Math.max(0,credits-PROVIDER_CREDIT_RESERVE));
 // Rotate equal-priority cold/failed stores instead of repeatedly choosing the
 // same alphabetical three when a provider keeps returning no usable records.
 const offset=(Math.floor(now/86400000)*Math.max(1,budget))%routes.length;
 const rank=store=>(routes.findIndex(r=>r[0]===store)-offset+routes.length)%routes.length;
 candidates.sort((a,b)=>a.due-b.due||rank(a.store)-rank(b.store));
 const selected=candidates.slice(0,budget);
 return {
  checked_at:new Date(now).toISOString(),advisory_only:true,ready_for_execution:false,
  blocker:'Shared credit reservation and serial executor are not installed',
  credits_remaining:credits,protected_reserve:PROVIDER_CREDIT_RESERVE,reserved_credits:0,
  proposed_credits:selected.length,remaining_if_executed:credits-selected.length,
  deferred_due_stores:candidates.slice(selected.length).map(c=>c.store),
  pages:selected.map(c=>({store:c.store,reason:c.reason,tool:'list_specials',args:{store:c.store,category:c.category,page:1},maximum_products:25,estimated_credits:1})),
 };
}
