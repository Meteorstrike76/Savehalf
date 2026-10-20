import type {Deal} from './supabase';
import {readObservations,validObservation,type Observation} from './priceEvidence';
import {freshPrice} from './watchlist';
export function evidenceReport(deals:Deal[], rows:Observation[]=readObservations(), now=Date.now()) {
 return {
  format:'savehalf-price-evidence',version:1,exportedAt:new Date(now).toISOString(),currency:'AUD',
  scope:'Only the selected products and observations retained on this device. Products are not automatically matched equivalents. No market-wide lowest-price claim.',
  gaps:'Missing dates mean no retained observation, not an unchanged price. Collection is intermittent; this is not a complete price history. Stock, fees and eligibility are not verified.',
  products:deals.slice(0,4).map(d=>{
   const sample=d.source==='sample'||d.source==='seed';
   const observedAt=!sample&&d.lastSeenAt&&Number.isFinite(Date.parse(d.lastSeenAt))&&Date.parse(d.lastSeenAt)<=now?d.lastSeenAt:null;
   const history=sample?[]:rows.filter(o=>validObservation(o)&&o.id===d.id&&o.title===d.title&&o.store===d.store&&Date.parse(o.at)<=now&&Date.parse(o.at)>=now-90*86400000).sort((a,b)=>Date.parse(a.at)-Date.parse(b.at)).slice(-30);
   let sourceUrl:string|null=null;try{const u=new URL(d.dealUrl);if(u.protocol==='https:'&&!u.username&&!u.password)sourceUrl=u.href;}catch{/* Missing source remains explicit. */}
   const was=Number.isFinite(d.originalPrice)&&d.originalPrice!>0?d.originalPrice:null;
   return {id:d.id,title:d.title,retailer:d.store,itemReference:typeof d.externalId==='string'?d.externalId:null,sourceType:sample?'illustrative sample':d.source||'unspecified',sourceUrl,
    displayedSnapshot:{price:d.discountPrice,previousPrice:was,observedAt,freshness:sample?'sample':freshPrice(d,now)?'within 72 hours':'needs recheck',reductionPercent:!sample&&was&&was>d.discountPrice?Number(((1-d.discountPrice/was)*100).toFixed(4)):null},
    retainedObservations:history.map(o=>({price:o.price,previousPrice:o.was,observedAt:o.at,provenance:'Device-retained catalogue observation; original import method not retained'})),
    historyNote:history.length?'At most 30 observations from the last 90 days; gaps are not interpolated.':'No matching historical observations retained on this device.'};
  }),
 };
}
