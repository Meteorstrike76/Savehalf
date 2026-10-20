/** Shared pure validation and arithmetic. No network, credentials or model-written facts. */
export const stores = ['Coles','Woolworths','Aldi','Big W','Kmart','Target','Best & Less'] as const;
export const tools = ['search_deals','compare_prices','get_price_history','get_unit_price_ranking','find_cheap_eats'] as const;
export type Tool = typeof tools[number];
export type Plan = {tool:Tool;query:string;stores:string[];maxPrice:number;minDiscount:number;productId?:string;suburb?:string;category?:string};
export type Evidence = {id:string;title:string;store:string;price:number;checked:string;url:string;discount?:number;unitPrice?:number;unitBasis?:string;conditions?:string};
export function object(v:unknown):Record<string,unknown> {if(!v||typeof v!=='object'||Array.isArray(v))throw Error('Invalid object');return v as Record<string,unknown>;}
function bounded(v:unknown,min:number,max:number,fallback:number){if(v===undefined)return fallback;if(typeof v!=='number'||!Number.isFinite(v)||v<min||v>max)throw Error('Invalid number');return v;}
export function validatePlan(value:unknown,chosen:readonly string[]):Plan {
 const v=object(value);if(!tools.includes(v.tool as Tool))throw Error('Unknown tool');
 if(Object.keys(v).some(k=>!['tool','query','stores','maxPrice','minDiscount','productId','suburb','category'].includes(k)))throw Error('Unknown argument');
 const text=(x:unknown,max:number)=>{if(x===undefined)return '';if(typeof x!=='string'||x.length>max||Array.from(x).some(c=>c.charCodeAt(0)<32))throw Error('Invalid text');return x.trim();};
 const allowed=chosen.filter(s=>stores.includes(s as typeof stores[number]));
 if(!allowed.length)throw Error('Choose a store');
 if(v.stores!==undefined&&(!Array.isArray(v.stores)||v.stores.length>7||v.stores.some(s=>typeof s!=='string'||!allowed.includes(s))))throw Error('Store outside your selection');
 const selected=(v.stores as string[]|undefined)?.length?v.stores as string[]:allowed;
 const productId=text(v.productId,36);if(productId&&!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(productId))throw Error('Invalid product ID');
 if(v.tool==='get_price_history'&&!productId)throw Error('Choose a product for history');
 const category=text(v.category,30);if(category&&!['Groceries','Electronics','Home & Living','Fashion','Clearance'].includes(category))throw Error('Unknown category');
 return {tool:v.tool as Tool,query:text(v.query,60),stores:[...new Set(selected)],maxPrice:bounded(v.maxPrice,0,5000,5000),minDiscount:bounded(v.minDiscount,0,100,0),productId:productId||undefined,suburb:text(v.suburb,50)||undefined,category:category||undefined};
}
export function safeUrl(value:unknown):string {try{const u=new URL(String(value));return u.protocol==='https:'&&!u.username&&!u.password?u.href:'';}catch{return '';}}
export function fresh(checked:string,now=Date.now(),hours=72){const t=Date.parse(checked);return Number.isFinite(t)&&t<=now&&now-t<=hours*3600000;}
export function grounded(rows:Evidence[],now=Date.now()):Evidence[]{return rows.filter(r=>Number.isFinite(r.price)&&r.price>0&&fresh(r.checked,now)&&safeUrl(r.url)).slice(0,12);}
export function cents(value:number){if(!Number.isFinite(value)||value<0||value>5000)throw Error('Invalid price');return Math.round((value+Number.EPSILON)*100);}
export function calculateBasket(lines:{item:string;quantity:number;candidates:Evidence[]}[],budget:number,now=Date.now()){
 if(lines.length<1||lines.length>12)throw Error('Use 1–12 items');const budgetCents=cents(budget);
 const items=lines.map(line=>{if(!Number.isInteger(line.quantity)||line.quantity<1||line.quantity>20)throw Error('Invalid quantity');
 const candidates=grounded(line.candidates,now).sort((a,b)=>cents(a.price)-cents(b.price));
 const deal=candidates[0];return {item:line.item.slice(0,60),quantity:line.quantity,deal:deal||null,totalCents:deal?cents(deal.price)*line.quantity:0};});
 const totalCents=items.reduce((n,i)=>n+i.totalCents,0);const totals:Record<string,number>={};for(const i of items)if(i.deal)totals[i.deal.store]=(totals[i.deal.store]||0)+i.totalCents;
 return {items,totalCents,budgetCents,remainingCents:budgetCents-totalCents,totals,complete:items.every(i=>!!i.deal),note:'Cheapest among matched, current listings only. Review every match and pack size; travel and delivery excluded.'};
}
/** Block obvious private identifiers locally before any model request. Not a PII guarantee. */
export function redact(text:string){return text.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,'[email removed]').replace(/\b(?:\+?61|0)[\d ()-]{8,16}\b/g,'[phone removed]').replace(/\b[0-9a-f]{8}-[0-9a-f-]{27}\b/gi,'[identifier removed]');}
