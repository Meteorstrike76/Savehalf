import {buildDeal,STORES} from './normalize.mjs';
const hosts={Coles:'coles.com.au',Woolworths:'woolworths.com.au',Aldi:'aldi.com.au','Big W':'bigw.com.au',Kmart:'kmart.com.au',Target:'target.com.au','Best & Less':'bestandless.com.au'};
export function validateReviewed(input,now=Date.now()){
 if(!Array.isArray(input)||!input.length||input.length>150)throw Error('Provide 1–150 reviewed products');
 const seen=new Set(),counts=new Map();
 return input.map(p=>{
  if(!STORES.includes(p.store)||p.reviewed!==true)throw Error('Each product needs a supported retailer and explicit review confirmation');
  if(typeof p.region!=='string'||p.region.trim().length<2||p.region.length>80)throw Error('A checked region/store is required');
  const checked=Date.parse(p.checkedAt);if(!Number.isFinite(checked)||checked>now||now-checked>72*3600000)throw Error('Check time must be within the last 72 hours');
  const source=new URL(p.sourceUrl);if(source.username||source.password||source.protocol!=='https:'||!(source.hostname===hosts[p.store]||source.hostname.endsWith('.'+hosts[p.store])))throw Error('Source URL must belong to the retailer');
  const row=buildDeal({...p,allowNoWas:true,minDiscount:0});if(!row||!p.externalId)throw Error('Product needs an exact identifier and valid published price');
  const productUrl=new URL(row.deal_url);if(productUrl.username||productUrl.password||!(productUrl.hostname===hosts[p.store]||productUrl.hostname.endsWith('.'+hosts[p.store])))throw Error('Product URL must belong to the retailer');
  const key=p.store+':'+row.external_id;if(seen.has(key))throw Error('Duplicate product variant');seen.add(key);
  const count=(counts.get(p.store)||0)+1;counts.set(p.store,count);if(count>(['Coles','Woolworths'].includes(p.store)?30:20))throw Error('Retailer review batch cap exceeded');
  if(['Coles','Woolworths'].includes(p.store)){
   const end=Date.parse(p.promotionEndsAt);if(!Number.isFinite(end)||end<=now||end>now+8*86400000)throw Error('Supermarket catalogue needs a verified current promotion end');
  }
  return {...row,source_feed:'reviewed',source_url:source.href,observed_region:p.region.trim(),promotion_ends_at:p.promotionEndsAt?new Date(p.promotionEndsAt).toISOString():null,last_seen_at:new Date(checked).toISOString(),is_active:true};
 });
}
