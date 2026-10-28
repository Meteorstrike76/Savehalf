import {collectSupermarket} from './supermarkets.mjs';
import {bestlessProducts,bestlessRobotsAllows} from './bestless-html.mjs';
import {jsonProducts,productImage} from './images.mjs';
import {buildDeal,pct} from './normalize.mjs';import {jsonScripts,kmartLinks,kmartProduct} from './kmart-html.mjs';import {aldiProducts} from './aldi-html.mjs';
import {robotsAllows} from './robots.mjs';
import {CollectionError,retryAfter,diagnostic,listingFailure} from './recovery.mjs';
const BASES={'Best & Less':'https://www.bestandless.com.au',Kmart:'https://www.kmart.com.au',Aldi:'https://www.aldi.com.au','Big W':'https://www.bigw.com.au',Target:'https://www.target.com.au',Coles:'https://www.coles.com.au',Woolworths:'https://www.woolworths.com.au'};
const LISTS={'Big W':['/collection/clearance','/collection/tech-audio-clearance'],Target:['/c/clearance/W676714']};
let bigwHttpClient;
function transportOptions(url){
 // Work around the observed HTTP/2 stream failure on this host only.
 // Keep TLS validation, declared identity, network route and request budgets.
 if(new URL(url).hostname==='www.bigw.com.au'&&typeof globalThis.Deno?.createHttpClient==='function'){
  bigwHttpClient??=globalThis.Deno.createHttpClient({http1:true,http2:false});
  return {client:bigwHttpClient};
 }
 return {};
}
export async function collect(store,get){
 if(['Coles','Woolworths'].includes(store))return collectSupermarket(store,get);
 const base=BASES[store];if(!base)throw Error('Unsupported retailer');let rows=[];let attempted=0;const diagnostics=[];
 if(store==='Best & Less'){
  const robots=await get(base+'/robots.txt');attempted++;
  if(!bestlessRobotsAllows(robots))throw Error('Best & Less robots policy requires review');
  rows=bestlessProducts(await get(base+'/sale-clearance/'));attempted++;
  if(!rows.length)throw new CollectionError('Best & Less returned no eligible published prices; parser review required','parser');
 }else if(store==='Aldi'){
  const paths=['/products/lower-prices/k/1588161425841179','/products/super-savers/k/1588161426952145','/products/pantry/pasta-rice-grains/k/1111111179','/products/pantry/canned-food/k/1111111171','/products/dairy-eggs-fridge/eggs/k/1111111162','/products/dairy-eggs-fridge/k/960000000','/products/bakery/k/920000000','/products/freezer/k/980000000','/products/fruits-vegetables/k/950000000','/products/pantry/k/970000000','/products/cleaning-household/k/1050000000','/products/health-beauty/k/1040000000','/products/drinks/k/1000000000'];
  const robots=await get(base+'/robots.txt');attempted++;
  if(paths.some(p=>!robotsAllows(robots,base+p)))throw new CollectionError('Robots policy requires review','policy');
  paths.pop(); // Keep the existing thirteen-request cap: robots plus twelve categories.
  const results=[];
  for(let i=0;i<paths.length;i+=3)results.push(...await Promise.allSettled(paths.slice(i,i+3).map(async p=>aldiProducts(await get(base+p)))));
  if(results.every(r=>r.status==='rejected'))throw Error('All ALDI category requests failed');
  diagnostics.push(...results.flatMap((r,i)=>r.status==='rejected'?[diagnostic(r.reason,'listing',paths[i])]:[]));
  // The two promotion pages are essential; never silently publish an apparently
  // healthy zero-sale run when either was unavailable.
  if(results.slice(0,2).some(r=>r.status==='rejected'))throw new CollectionError('ALDI promotion page unavailable; previous products retained','upstream');

  const buckets=results.map(r=>r.status==='fulfilled'?r.value:[]);
  for(let i=0;i<30;i++)for(const bucket of buckets)if(bucket[i])rows.push(bucket[i]);attempted+=paths.length;
 }else{
  const listing=store==='Kmart'?['/category/clearance/shop-all-clearance/']:LISTS[store];
  const robots=await get(base+'/robots.txt');attempted++;
  if(listing.some(path=>!robotsAllows(robots,base+path)))throw new CollectionError('Robots policy requires review','policy');
  const pages=await Promise.allSettled(listing.map(path=>get(base+path)));
  if(pages.every(r=>r.status==='rejected'))throw listingFailure(pages,listing);
  diagnostics.push(...pages.flatMap((r,i)=>r.status==='rejected'?[diagnostic(r.reason,'listing',listing[i])]:[]));
  const html=pages.flatMap(r=>r.status==='fulfilled'?[r.value]:[]).join('\n');let urls;
  if(store==='Kmart')urls=kmartLinks(html);
  else urls=[...new Set([...html.matchAll(/href=["']([^"']+)["']/gi)].map(m=>{try{return new URL(m[1].replaceAll('&amp;','&'),base).href;}catch{return '';}}).filter(u=>{const p=new URL(u||base);return p.origin===base&&(store==='Big W'?p.pathname.includes('/product/')&&p.pathname.includes('/p/'):store==='Target'?p.pathname.startsWith('/p/'):store==='Coles'?p.pathname.startsWith('/product/'):p.pathname.startsWith('/shop/productdetails/'));}))];
  urls=urls.filter(u=>robotsAllows(robots,u)).slice(0,25-listing.length);attempted+=urls.length+listing.length;
  if(!urls.length)throw new CollectionError('Listing returned no product links; parser review required','parser');
  for(let i=0;i<urls.length;i+=5){const batch=await Promise.allSettled(urls.slice(i,i+5).map(async u=>{
   const text=await get(u);if(store==='Kmart')return kmartProduct(text);
   const d=jsonProducts(jsonScripts(text))[0];if(!d)return null;
   const o=Array.isArray(d.offers)?d.offers[0]:d.offers;
   if(o?.priceCurrency!=='AUD'||!o.price||o.availability?.endsWith('/OutOfStock'))return null;
   if(store==='Big W'&&String(d.sku??'').startsWith('99'))return null; // Marketplace sellers need their own attribution.
   return buildDeal({store,externalId:d.sku??u,title:d.name?.replaceAll('&apos;',"'").replaceAll('&amp;','&'),price:o.price,image:productImage(text,d,base),url:u,base,defaultCategory:['Coles','Woolworths'].includes(store)?'Groceries':'Clearance',allowNoWas:true,minDiscount:0});
  }));diagnostics.push(...batch.flatMap((r,j)=>r.status==='rejected'?[diagnostic(r.reason,'product',urls[i+j])]:[]));rows.push(...batch.flatMap(r=>r.status==='fulfilled'&&r.value?[r.value]:[]));}
  if(!rows.length){const e=new CollectionError('No verified product rows; review listing/product diagnostics',diagnostics.some(d=>d.kind==='access')?'access':'parser');e.diagnostics=diagnostics.slice(0,5);throw e;}
 }
 rows=[...new Map(rows.map(r=>[r.external_id,r])).values()];
 const sales=rows.filter(r=>pct(r)>0).sort((a,b)=>pct(b)-pct(a)).slice(0,25);
 const groceries=rows.filter(r=>r.category==='Groceries'&&!sales.some(s=>s.external_id===r.external_id)).slice(0,store==='Aldi'?250:50);
 const regular=rows.filter(r=>r.category!=='Groceries'&&!sales.some(s=>s.external_id===r.external_id)).slice(0,40);
 return {rows:[...sales,...groceries,...regular],attempted,sales:sales.length,diagnostics:diagnostics.slice(0,5)};
}
async function readResource(url,budget=null,options={}){
 let r;
 try{r=await fetch(url,{...options,...transportOptions(url),signal:AbortSignal.timeout(12000),redirect:'error',headers:{'User-Agent':'SaveHalf/1.0 (+https://savehalf.vercel.app)',...options.headers}});}
 catch{throw new CollectionError('Source network request failed','transport');}
 if(r.status===304)return {status:304,text:'',etag:r.headers.get('etag'),modified:r.headers.get('last-modified')};
 if(!r.ok){await r.body?.cancel();throw new CollectionError(`Retailer returned HTTP ${r.status}`,[401,403].includes(r.status)?'access':r.status===429?'rate_limit':r.status===404?'missing':'upstream',r.status,retryAfter(r.headers.get('retry-after')));}
 const limit=new URL(url).pathname==='/robots.txt'?50000:3500000;
 if(Number(r.headers.get('content-length'))>limit){await r.body?.cancel();throw Error('Retailer page exceeds collection limit');}
 if(!r.body)throw Error('Retailer returned no page');
 const reader=r.body.getReader(),chunks=[];let size=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(budget){budget.used+=value.byteLength;if(budget.used>budget.limit){budget.exceeded=true;await reader.cancel();throw Error('Source byte budget reached');}}if(size>limit){await reader.cancel();throw Error('Retailer page exceeds collection limit');}chunks.push(value);}}finally{reader.releaseLock();}
 const bytes=new Uint8Array(size);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.byteLength;}
 return {status:r.status,text:new TextDecoder().decode(bytes),etag:r.headers.get('etag'),modified:r.headers.get('last-modified')};
}

export async function getHtml(url,budget=null,options={}){return (await getResource(url,budget,options)).text;}

// Preserve only the safe pathname for diagnosis; never keep query strings or credentials.
export async function getResource(url,budget=null,options={}){
 try{return await readResource(url,budget,options);}catch(error){
  if(error instanceof Error)error.sourcePath=new URL(url).pathname;
  throw error;
 }
}
