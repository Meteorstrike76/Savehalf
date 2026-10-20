import {promotionCurrent} from './promotionFreshness';
import type {Deal} from './supabase';
import {CATEGORIES,isStoreId} from './stores';
export const WATCH_KEY='savehalf-watch-v1';
export const WATCH_LIMIT=50;
export type Watch={deal:Deal;target:string;previousPrice:number|null;status:'fresh'|'unavailable'|'unchecked'|'sample'};
export function validDeal(d:unknown):d is Deal{
 if(!d||typeof d!=='object')return false;const x=d as Deal;
 return typeof x.id==='string'&&x.id.length<=120&&typeof x.title==='string'&&x.title.length>=3&&x.title.length<=200&&isStoreId(x.store)&&CATEGORIES.includes(x.category)&&Number.isFinite(x.discountPrice)&&x.discountPrice>0&&x.discountPrice<=5000;
}
export function freshPrice(d:Deal,now=Date.now()){return (!d.promotionEndsAt||Date.parse(d.promotionEndsAt)>now)&&promotionCurrent(d.store,d.lastSeenAt,now)&&d.source!=='sample'&&d.source!=='seed'&&d.isActive===true&&typeof d.lastSeenAt==='string'&&Number.isFinite(Date.parse(d.lastSeenAt))&&Date.parse(d.lastSeenAt)<=now&&now-Date.parse(d.lastSeenAt)<=72*3600000;}
export function targetMet(w:Watch,now=Date.now()){return w.status==='fresh'&&freshPrice(w.deal,now)&&w.target!==''&&Number.isFinite(Number(w.target))&&Number(w.target)>0&&w.deal.discountPrice<=Number(w.target);}
export function readWatches():Watch[]{try{const data=JSON.parse(localStorage.getItem(WATCH_KEY)||'[]');if(!Array.isArray(data))return [];const ids=new Set<string>();return data.slice(0,WATCH_LIMIT).filter((w):w is Watch=>{if(!validDeal(w?.deal)||ids.has(w.deal.id))return false;ids.add(w.deal.id);return true;}).map(w=>({...w,target:typeof w.target==='string'&&w.target.length<=12&&Number.isFinite(Number(w.target))&&Number(w.target)>=0&&Number(w.target)<=5000?w.target:'',previousPrice:Number.isFinite(w.previousPrice)&&w.previousPrice!>0?w.previousPrice:null,status:w.deal.source==='sample'?'sample':'unchecked'}));}catch{return [];}}
export function reconcileWatches(watches:Watch[],deals:Deal[]):Watch[]{const byId=new Map(deals.filter(d=>validDeal(d)&&freshPrice(d)).map(d=>[d.id,d]));return watches.map(w=>{if(w.deal.source==='sample')return {...w,status:'sample'};const next=byId.get(w.deal.id);if(!next||next.store!==w.deal.store||next.title!==w.deal.title)return {...w,status:'unavailable'};return {...w,deal:next,previousPrice:w.deal.discountPrice,status:'fresh'};});}
