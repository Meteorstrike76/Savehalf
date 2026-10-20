import {jsonProducts} from './images.mjs';
import {jsonScripts} from './kmart-html.mjs';import {buildDeal} from './normalize.mjs';
export function aldiStructuredProducts(html){
 return jsonProducts(jsonScripts(html)).flatMap(p=>{
  const offers=Array.isArray(p.offers)?p.offers:[p.offers];
  // Ambiguous variant/range prices and variable-weight products are not comparable.
  if(offers.length!==1||!p.sku||!p.name||/\bper\s*kg\b|random weight/i.test(p.name))return [];
  const o=offers[0];if(!o||o.priceCurrency!=='AUD'||!/^https?:\/\/schema.org\/InStock$/.test(o.availability||''))return [];
  let u;try{u=new URL(o.url||p.url,'https://www.aldi.com.au');}catch{return [];}
  if(u.origin!=='https://www.aldi.com.au'||!u.pathname.startsWith('/product/'))return [];
  const row=buildDeal({store:'Aldi',externalId:p.sku,title:p.name,price:o.price,image:p.image,url:u.href,base:u.origin,defaultCategory:'Clearance',allowNoWas:true,minDiscount:0});
  return row?[row]:[];
 });
}
export function aldiProducts(html){
 const flat=jsonScripts(html).find(x=>Array.isArray(x)&&Array.isArray(x[0])&&x[0][0]==='ShallowReactive');if(!flat)return aldiStructuredProducts(html);
 const decode=(i,depth=0)=>{if(!Number.isInteger(i)||i<0||depth>16)return null;const v=flat[i];if(Array.isArray(v))return v.map(x=>Number.isInteger(x)?decode(x,depth+1):x);if(v&&typeof v==='object')return Object.fromEntries(Object.entries(v).map(([k,x])=>[k,decode(x,depth+1)]));return v;};
 return flat.flatMap((v,i)=>v&&typeof v==='object'&&!Array.isArray(v)&&['sku','name','price','urlSlugText'].every(k=>k in v)?[decode(i)]:[]).flatMap(p=>{
  if(p.discontinued||p.alcohol||p.isRandomWeight||p.price?.currencyCode!=='AUD')return [];
  const image=(p.assets??[]).map(a=>a?.url?.replaceAll('{width}','580').replaceAll('{height}','580').replaceAll('{slug}',encodeURIComponent(p.name)));
  const row=buildDeal({store:'Aldi',externalId:p.sku,title:[p.brandName,p.name].filter(Boolean).join(' '),price:p.price.amount/100,was:p.price.wasPriceDisplay,image,url:`https://www.aldi.com.au/product/${p.urlSlugText}-${p.sku}`,base:'https://www.aldi.com.au',defaultCategory:p.categories?.some(c=>['Pantry','Dairy, Eggs & Fridge','Fruits & Vegetables','Freezer','Meat & Seafood','Bakery'].includes(c.name))?'Groceries':'Clearance',allowNoWas:true,minDiscount:0});return row?[row]:[];
 });
}
