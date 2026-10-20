import {kmartLinks,kmartProduct} from '../lib/kmart-html.mjs';
const get=async url=>{const r=await fetch(new URL(url).href,{signal:AbortSignal.timeout(20000)});if(!r.ok)throw new Error(`Kmart HTTP ${r.status}`);return r.text();};
export default {
 http:true,
 async run(_ctx,log) {
  const urls=kmartLinks(await get('https://www.kmart.com.au/category/clearance/')).slice(0,48);
  const rows=[];
  for(let i=0;i<urls.length;i+=4){const batch=await Promise.allSettled(urls.slice(i,i+4).map(async u=>kmartProduct(await get(u))));for(const r of batch)if(r.status==='fulfilled'&&r.value)rows.push(r.value);}
  log(`Kmart: verified ${rows.length} products from ${urls.length} product pages`);return rows;
 }
};
