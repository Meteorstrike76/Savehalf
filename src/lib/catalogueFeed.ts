export type CatalogueAd={id:string;store:string;name:string;advertised_price:string;price_text:string;image_url:string|null;source_url:string;reference_price_text:string|null;region:string|null;valid_from_date:string;valid_through_date:string;visible_from:string;expires_at:string;checked_at:string;notice:string};
const sourceHost='www.catalogueoffers.com.au';
function approvedSource(value:unknown){try{const u=new URL(String(value));return u.protocol==='https:'&&u.hostname===sourceHost&&!u.username&&!u.password&&u.port===''&&/^\/view\/offers\/[a-z0-9-]+$/.test(u.pathname)&&/^\?offer=\d+$/.test(u.search)&&/^#page=\d+$/.test(u.hash);}catch{return false;}}
export function catalogueAdCurrent(p:CatalogueAd,now=Date.now()){
 const start=Date.parse(p.visible_from),end=Date.parse(p.expires_at),checked=Date.parse(p.checked_at);
 return Number.isFinite(start)&&Number.isFinite(end)&&Number.isFinite(checked)&&start<=now&&now<end&&checked<=now&&now-checked<24*3600000;
}
export function readCatalogueFeed(value:unknown,now=Date.now()):CatalogueAd[]{
 if(!value||typeof value!=='object')return [];
 const root=value as Record<string,unknown>;
 if(root.schema_version!==1||root.source!=='CatalogueOffers'||!Array.isArray(root.ads)||root.ads.length>700)return [];
 const seen=new Set<string>();
 return root.ads.filter((candidate):candidate is CatalogueAd=>{
  if(!candidate||typeof candidate!=='object')return false;
  const p=candidate as CatalogueAd;
  if(typeof p.id!=='string'||seen.has(p.id)||typeof p.name!=='string'||p.name.length<2||p.name.length>250||typeof p.store!=='string'||p.store.length>80||typeof p.notice!=='string')return false;
  if(typeof p.advertised_price!=='string'||!/^\d{1,5}\.\d{2}$/.test(p.advertised_price)||Number(p.advertised_price)<=0||p.price_text!=='$'+p.advertised_price)return false;
  if(!approvedSource(p.source_url)||!catalogueAdCurrent(p,now))return false;
  const offerId=new URL(p.source_url).searchParams.get('offer');
  if(!offerId||p.id!==p.store+':'+offerId)return false;
  if(!/^\d{4}-\d{2}-\d{2}$/.test(p.valid_from_date)||!/^\d{4}-\d{2}-\d{2}$/.test(p.valid_through_date)||p.valid_from_date>p.valid_through_date)return false;
  if(p.region!==null&&!['NSW','VIC','ACT','QLD','TAS','SA','NT','WA'].includes(p.region))return false;
  if(p.image_url!==null){try{const u=new URL(p.image_url);if(u.protocol!=='https:'||u.hostname!=='img.offers-cdn.net'||u.username||u.password||u.port||u.search||u.hash||!u.pathname.startsWith('/assets/uploads/offers/au/'+offerId+'/'))return false;}catch{return false;}}
  seen.add(p.id);return true;
 });
}
