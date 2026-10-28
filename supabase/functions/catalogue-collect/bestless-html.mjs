import {jsonScripts} from './kmart-html.mjs';
import {buildDeal} from './normalize.mjs';
const BASE='https://www.bestandless.com.au';
// Accept only this observed, already-applied promotion. Unknown or conditional
// offers still require review; never apply the percentage to sale_price ourselves.
function publishedPricePromotion(promotions){
 return Array.isArray(promotions)&&promotions.every(p=>typeof p==='string'&&p.trim()==='20% Off Selected Styles Applied. Prices as marked.');
}
export function bestlessProducts(html){
 const scripts=jsonScripts(html);
 const aud=scripts.some(s=>Object.values(s).some(v=>v?.b?.baseSites?.some(site=>site.stores?.some(store=>store.defaultCurrency?.isocode==='AUD'))));
 if(!aud)throw Error('Best & Less currency could not be verified');
 const result=scripts.flatMap(s=>Object.values(s).flatMap(v=>Array.isArray(v?.b?.response?.results)?v.b.response.results:[])).slice(0,100);
 const rows=[];
 for(const item of result){
  const d=item?.data;
  // Use the published variant's sale price; never calculate member/promotion discounts.
  if(!d||d.deactivated!==false||!Number.isFinite(d.quantity)||d.quantity<=0||!publishedPricePromotion(d.promotion)||!d.sku||!d.color_sku)continue;
  let u;try{u=new URL(d.url);}catch{continue;}
  if(u.origin!==BASE||!u.pathname.startsWith('/Categories/')||u.search||u.hash)continue;
  const title=[item.value,d.display_colour,d.size?`size ${d.size}`:''].filter(Boolean).join(' · ');
  const row=buildDeal({store:'Best & Less',externalId:String(d.sku),title,price:d.sale_price,was:d.price,image:d.image_url,url:u.href,base:BASE,defaultCategory:'Fashion',minDiscount:1});
  if(row&&row.image_url&&!rows.some(r=>r.external_id===row.external_id))rows.push(row);
  if(rows.length===20)break;
 }
 return rows;
}
// A changed or unsupported robots policy stops collection for review.
export function bestlessRobotsAllows(text){
 let agents=[],rules=[],groups=[];
 for(const raw of text.split(/\r?\n/)){const line=raw.split('#')[0].trim();const m=line.match(/^(user-agent|allow|disallow):\s*(.*)$/i);if(!m)continue;const k=m[1].toLowerCase(),v=m[2].trim();if(k==='user-agent'){if(rules.length){groups.push({agents,rules});agents=[];rules=[];}agents.push(v.toLowerCase());}else if(agents.length)rules.push({kind:k,path:v});}
 if(agents.length)groups.push({agents,rules});
 const matches=groups.filter(g=>g.agents.includes('savehalf')||g.agents.includes('*'));
 if(!matches.length)return false;
 for(const path of ['/sale-clearance/']){
  const applicable=matches.flatMap(g=>g.rules).filter(r=>r.path&&(r.path.includes('*')||r.path.includes('$')||path.startsWith(r.path))).sort((a,b)=>b.path.length-a.path.length||(a.kind==='allow'?-1:1));
  if(applicable.some(r=>r.path.includes('*')||r.path.includes('$')))return false;
  if(applicable[0]?.kind==='disallow')return false;
 }
 return true;
}
