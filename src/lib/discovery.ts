import {CATEGORIES,STORE_IDS,isStoreId,type StoreId,type DealCategory} from './stores';
import type {Deal} from './supabase';
import {unitPrice} from './shopping';
export type BrowseState={tab:'deals'|'catalogue';search:string;stores:StoreId[];category:DealCategory|'All';sort:'discount'|'price'|'newest'|'unit';half:boolean;budget:string;minimum?:string};
export type SavedSearch={name:string;filters:BrowseState};
export const SEARCHES_KEY='savehalf-searches-v1',HIDDEN_KEY='savehalf-hidden-v1',VISIT_KEY='savehalf-last-visit-v1';
export function validateBrowse(value:unknown):BrowseState|null{
 if(!value||typeof value!=='object')return null;const d=value as BrowseState;
 if(!['deals','catalogue'].includes(d.tab)||typeof d.search!=='string'||d.search.length>60||!Array.isArray(d.stores)||d.stores.length>STORE_IDS.length||!d.stores.every(isStoreId)||!(d.category==='All'||CATEGORIES.includes(d.category))||!['discount','price','newest','unit'].includes(d.sort)||typeof d.half!=='boolean'||typeof d.budget!=='string'||d.budget.length>12||(d.budget!==''&&(!Number.isFinite(Number(d.budget))||Number(d.budget)<0||Number(d.budget)>5000)))return null;
 if(d.minimum!==undefined&&(typeof d.minimum!=='string'||d.minimum.length>12||d.minimum!==''&&(!Number.isFinite(Number(d.minimum))||Number(d.minimum)<0||Number(d.minimum)>5000)))return null;
 return {tab:d.tab,search:d.search,stores:[...new Set(d.stores)],category:d.category,sort:d.sort,half:d.half,budget:d.budget,...(d.minimum!==undefined?{minimum:d.minimum}:{})};
}
export function readSharedBrowse():BrowseState|null{try{const q=new URLSearchParams(location.search),raw=q.get('browse');return raw&&raw.length<=2000?validateBrowse(JSON.parse(raw)):null;}catch{return null;}}
export function browseLink(origin:string,pathname:string,filters:BrowseState){const url=new URL(pathname,origin);url.searchParams.set('browse',JSON.stringify(filters));return url.toString();}
export function readSearches():SavedSearch[]{try{const rows=JSON.parse(localStorage.getItem(SEARCHES_KEY)||'[]');if(!Array.isArray(rows))return [];return rows.slice(0,6).filter(x=>typeof x?.name==='string'&&x.name.trim().length>0&&x.name.length<=40&&validateBrowse(x.filters)).map(x=>({name:x.name,filters:validateBrowse(x.filters)!}));}catch{return [];}}
export function readIds(key:string,limit=100):string[]{try{const data=JSON.parse(localStorage.getItem(key)||'[]');return Array.isArray(data)?[...new Set<string>(data.filter(x=>typeof x==='string'&&x.length>0&&x.length<=120))].slice(0,limit):[];}catch{return [];}}
export function readVisit():number{try{const n=Number(localStorage.getItem(VISIT_KEY));return n>0&&n<=Date.now()?n:0;}catch{return 0;}}
export type LocalFilters={photos:boolean;fresh:boolean;exclude:string;order:'default'|'unit';hidden:string[];follow?:string;matchedOnly?:boolean};
export function refineLoaded(deals:Deal[],filters:LocalFilters,now=Date.now()){
 const terms=filters.exclude.toLowerCase().split(',').map(t=>t.trim()).filter(Boolean).slice(0,8);
 const follows=(filters.follow||'').toLowerCase().split(',').map(t=>t.trim()).filter(Boolean).slice(0,8);
 const rows=deals.filter(d=>(!filters.matchedOnly||follows.some(t=>d.title.toLowerCase().includes(t)))&&!filters.hidden.includes(d.id)&&(!filters.photos||!!d.imageUrl&&/^https:\/\//i.test(d.imageUrl))&&(!filters.fresh||(d.source!=='sample'&&d.source!=='seed'&&!!d.lastSeenAt&&Date.parse(d.lastSeenAt)<=now&&now-Date.parse(d.lastSeenAt)<=24*3600000))&&!terms.some(t=>d.title.toLowerCase().includes(t)));
 if(filters.order==='unit')rows.sort((a,b)=>{const x=unitPrice(a),y=unitPrice(b);if(!x)return y?1:0;if(!y)return -1;return x.unit.localeCompare(y.unit)||x.value-y.value;});
 return rows;
}
