import {jsonProducts,productImage} from './images.mjs';
import {buildDeal} from './normalize.mjs';
export function jsonScripts(html) {
 return [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].flatMap(m=>{try{return [JSON.parse(m[1])];}catch{return [];}});
}
export function kmartLinks(html) {
 const list=jsonScripts(html).find(x=>x['@type']==='ItemList');
 return [...new Set((list?.itemListElement??[]).map(x=>x.url).filter(u=>{try{const p=new URL(u);return p.protocol==='https:'&&p.hostname==='www.kmart.com.au'&&p.pathname.startsWith('/product/');}catch{return false;}}))];
}
export function kmartProduct(html) {
 const scripts=jsonScripts(html);const d=jsonProducts(scripts)[0];
 const meta=scripts.find(x=>x.props?.pageProps?.productDetail)?.props.pageProps.productDetail.products?.[0]?.item?.data;
 if(!d||d.offers?.priceCurrency!=='AUD'||!d.offers?.availability?.endsWith('/InStock'))return null;
 const was=meta?.SavePrice?.match(/WAS\s*\$\s*([\d.]+)/i)?.[1];
 return buildDeal({store:'Kmart',externalId:d.sku,title:d.name,price:d.offers.price,was,image:productImage(html,d,'https://www.kmart.com.au'),url:d.url,base:'https://www.kmart.com.au',allowNoWas:true,minDiscount:0});
}
