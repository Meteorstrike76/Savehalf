import type { Deal } from './supabase';
import { isStoreId } from './stores';
export type ListItem = { deal: Deal; quantity: number; bought: boolean };
export const LIST_KEY = 'savehalf-shopping-v1';
export function readList(): ListItem[] {
  try {
    const data: unknown = JSON.parse(localStorage.getItem(LIST_KEY) || '[]');
    if (!Array.isArray(data)) return [];
    return data.slice(0,100).filter((x): x is ListItem => Boolean(x?.deal && typeof x.deal.id==='string' && typeof x.deal.title==='string' && isStoreId(x.deal.store) && Number.isFinite(x.deal.discountPrice) && x.deal.discountPrice>0 && x.deal.discountPrice<=5000 && Number.isInteger(x.quantity) && x.quantity>=1 && x.quantity<=99 && typeof x.bought==='boolean'));
  } catch { return []; }
}
export function basketTotals(items: ListItem[]) {
  let total=0,remaining=0,saving=0;
  for (const x of items) {
    const cents=Math.round(x.deal.discountPrice*100)*x.quantity;
    total+=cents;if(!x.bought)remaining+=cents;
    if(x.deal.originalPrice && x.deal.originalPrice>x.deal.discountPrice)saving+=(Math.round(x.deal.originalPrice*100)-Math.round(x.deal.discountPrice*100))*x.quantity;
  }
  return {total:total/100,remaining:remaining/100,saving:saving/100};
}
export function unitPrice(deal: Pick<Deal,'title'|'discountPrice'|'category'>): {value: number; unit: 'kg'|'L'} | null {
  if(deal.category!=='Groceries'||/per\s*(kg|kilo)|approx|random\s*weight|\d\s*[-–]\s*\d/i.test(deal.title))return null;
  const matches=[...deal.title.matchAll(/\b(\d+(?:\.\d+)?)\s*(kg|g|ml|l)\b/gi)];
  if(matches.length!==1)return null;
  const match=matches[0],prefix=deal.title.slice(0,match.index);
  const multi=prefix.match(/\b(\d+)\s*[x×]\s*$/i);
  if(/\bpack\b/i.test(deal.title)&&!multi)return null;
  const amount=Number(match[1])*(multi?Number(multi[1]):1);
  const raw=match[2].toLowerCase();const size=amount/(raw==='g'||raw==='ml'?1000:1);
  if(!Number.isFinite(size)||size<=0)return null;
  return {value:deal.discountPrice/size,unit:raw==='g'||raw==='kg'?'kg':'L'};
}
export function listCsv(items: ListItem[]): string {
  const cell=(v: string|number)=>'"'+String(v).replace(/^\s*[=+\-@]/,"'$&").replace(/"/g,'""')+'"';
  return [['Store','Product','Quantity','Collected unit price AUD','Estimated line total AUD','Bought','Last checked'],...items.map(x=>[x.deal.store,x.deal.title,x.quantity,x.deal.discountPrice.toFixed(2),(Math.round(x.deal.discountPrice*100)*x.quantity/100).toFixed(2),x.bought?'Yes':'No',x.deal.lastSeenAt||'Sample / unknown'])].map(row=>row.map(cell).join(',')).join('\r\n');
}

export const BUDGET_KEY='savehalf-basket-budget-v1';
export const TEMPLATES_KEY='savehalf-list-templates-v1';
export type ListTemplate={name:string;budget:string;items:ListItem[]};
export function readBudget():string{try{const v=localStorage.getItem(BUDGET_KEY)||'';return v.length<=12&&Number.isFinite(Number(v))&&Number(v)>=0?v:'';}catch{return '';}}
export function readTemplates():ListTemplate[]{try{const data=JSON.parse(localStorage.getItem(TEMPLATES_KEY)||'[]');if(!Array.isArray(data))return [];return data.slice(0,5).filter((t):t is ListTemplate=>typeof t?.name==='string'&&t.name.length>0&&t.name.length<=40&&typeof t.budget==='string'&&t.budget.length<=12&&Number.isFinite(Number(t.budget))&&Number(t.budget)>=0&&Array.isArray(t.items)&&t.items.length<=100&&t.items.every((x:ListItem)=>x?.deal&&typeof x.deal.id==='string'&&typeof x.deal.title==='string'&&isStoreId(x.deal.store)&&Number.isFinite(x.deal.discountPrice)&&x.deal.discountPrice>0&&x.deal.discountPrice<=5000&&Number.isInteger(x.quantity)&&x.quantity>=1&&x.quantity<=99&&typeof x.bought==='boolean'));}catch{return [];}}
export function reuseTemplate(t:ListTemplate):ListItem[]{return t.items.map(x=>({...x,deal:{...x.deal},bought:false}));}
