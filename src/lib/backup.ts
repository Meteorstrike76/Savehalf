import {LUNCH_KEY,readLunch,validLunch} from './lunch';
import {sydneyDate} from './household';
import {RADAR_PREFS_KEY,readRadarPrefs,validRadarPrefs} from './radarPreferences';
import {RADAR_KEY} from './community';
import {STORE_IDS} from './stores';
import {validDeal,readWatches,WATCH_KEY} from './watchlist';
import {LIST_KEY,BUDGET_KEY,TEMPLATES_KEY,readList,readTemplates,readBudget,type ListItem} from './shopping';
import {SEARCHES_KEY,HIDDEN_KEY,readSearches,readIds,validateBrowse} from './discovery';
import {PREFERENCES_KEY,readPreferences} from './preferences';
import {readObservations,validObservation,EVIDENCE_KEY} from './priceEvidence';
import {PANTRY_KEY,RECEIPTS_KEY,validPantry,validReceipt,readRows,TRIP_KEY} from './household';
export const DEVICE_KEYS=[LUNCH_KEY,RADAR_PREFS_KEY,RADAR_KEY,LIST_KEY,BUDGET_KEY,TEMPLATES_KEY,WATCH_KEY,SEARCHES_KEY,HIDDEN_KEY,PREFERENCES_KEY,PANTRY_KEY,RECEIPTS_KEY,'savehalf-food-bookmarks-v1','savehalf-food-areas-v1','savehalf-observations-v1','savehalf-last-visit-v1','savehalf-trip-v1','savehalf-bookmarks-v4'];
function readTrip():unknown{try{return JSON.parse(localStorage.getItem(TRIP_KEY)||'null');}catch{return null;}}
export type Backup={version:1;createdAt:string;data:Record<string,unknown>};
export function exportDevice():Backup{return {version:1,createdAt:new Date().toISOString(),data:{[LUNCH_KEY]:readLunch(sydneyDate()),[RADAR_PREFS_KEY]:readRadarPrefs(),[RADAR_KEY]:readIds(RADAR_KEY,60),[LIST_KEY]:readList(),[BUDGET_KEY]:readBudget(),[TEMPLATES_KEY]:readTemplates(),[WATCH_KEY]:readWatches(),[SEARCHES_KEY]:readSearches(),[HIDDEN_KEY]:readIds(HIDDEN_KEY),[PREFERENCES_KEY]:readPreferences(),[PANTRY_KEY]:readRows(PANTRY_KEY,validPantry,100),[RECEIPTS_KEY]:readRows(RECEIPTS_KEY,validReceipt,100),'savehalf-food-bookmarks-v1':readIds('savehalf-food-bookmarks-v1',60),'savehalf-food-areas-v1':readIds('savehalf-food-areas-v1',3),[EVIDENCE_KEY]:readObservations(),...(validTrip(readTrip())?{[TRIP_KEY]:readTrip()}:{}),'savehalf-bookmarks-v4':readRows('savehalf-bookmarks-v4',validDeal,100)}};}
function validTrip(x:unknown){const p=x as {envelope:unknown;order:unknown};return !!p&&typeof p.envelope==='string'&&p.envelope.length<=12&&Number.isFinite(Number(p.envelope))&&Number(p.envelope)>=0&&Array.isArray(p.order)&&p.order.length<=7&&new Set(p.order).size===p.order.length&&p.order.every(s=>(STORE_IDS as readonly string[]).includes(s));}
const listValid=(x:unknown):x is ListItem=>{const r=x as ListItem;return !!r&&validDeal(r.deal)&&Number.isInteger(r.quantity)&&r.quantity>=1&&r.quantity<=99&&typeof r.bought==='boolean';};
function bounded(a:unknown,max:number,valid:(x:unknown)=>boolean){return Array.isArray(a)&&a.length<=max&&a.every(valid);}
export function validateBackup(raw:unknown):Backup{const b=raw as Backup;if(!b||b.version!==1||!b.data||typeof b.data!=='object'||Array.isArray(b.data))throw Error('Unsupported backup format.');const d=b.data;const allowed=[LUNCH_KEY,RADAR_PREFS_KEY,RADAR_KEY,TRIP_KEY,LIST_KEY,BUDGET_KEY,TEMPLATES_KEY,WATCH_KEY,SEARCHES_KEY,HIDDEN_KEY,PREFERENCES_KEY,PANTRY_KEY,RECEIPTS_KEY,'savehalf-food-bookmarks-v1','savehalf-food-areas-v1',EVIDENCE_KEY,'savehalf-bookmarks-v4'];if(Object.keys(d).some(k=>!allowed.includes(k)))throw Error('Backup has unsupported fields.');
 if(d[LUNCH_KEY]!==undefined&&!validLunch(d[LUNCH_KEY]))throw Error('Invalid lunch plan.');
 if(d[RADAR_PREFS_KEY]!==undefined&&!validRadarPrefs(d[RADAR_PREFS_KEY]))throw Error('Invalid personal Radar settings.');
 if(d[TRIP_KEY]!==undefined&&!validTrip(d[TRIP_KEY]))throw Error('Invalid trip preferences.');
 if(d[LIST_KEY]!==undefined&&!bounded(d[LIST_KEY],100,listValid))throw Error('Invalid shopping list.');
 if(d[BUDGET_KEY]!==undefined&&(typeof d[BUDGET_KEY]!=='string'||String(d[BUDGET_KEY]).length>12||!Number.isFinite(Number(d[BUDGET_KEY]))||Number(d[BUDGET_KEY])<0))throw Error('Invalid budget.');
 if(d[TEMPLATES_KEY]!==undefined&&!bounded(d[TEMPLATES_KEY],5,x=>{const t=x as {name:string;budget:string;items:unknown[]};return !!t&&typeof t.name==='string'&&t.name.length>0&&t.name.length<=40&&typeof t.budget==='string'&&t.budget.length<=12&&Number.isFinite(Number(t.budget))&&Number(t.budget)>=0&&bounded(t.items,100,listValid);}))throw Error('Invalid templates.');
 if(d[WATCH_KEY]!==undefined&&!bounded(d[WATCH_KEY],50,x=>{const w=x as {deal:unknown;target:string};return !!w&&validDeal(w.deal)&&typeof w.target==='string'&&w.target.length<=12&&Number.isFinite(Number(w.target))&&Number(w.target)>=0&&Number(w.target)<=5000;}))throw Error('Invalid watches.');
 if(d[SEARCHES_KEY]!==undefined&&!bounded(d[SEARCHES_KEY],6,x=>{const s=x as {name:string;filters:unknown};return !!s&&typeof s.name==='string'&&s.name.length>0&&s.name.length<=40&&!!validateBrowse(s.filters);}))throw Error('Invalid searches.');
 for(const k of [RADAR_KEY,HIDDEN_KEY,'savehalf-food-bookmarks-v1'])if(d[k]!==undefined&&!bounded(d[k],k===HIDDEN_KEY?100:60,x=>typeof x==='string'&&x.length<=120))throw Error('Invalid bookmark IDs.');
 if(d['savehalf-food-areas-v1']!==undefined&&!bounded(d['savehalf-food-areas-v1'],3,x=>typeof x==='string'&&x.length<=80))throw Error('Invalid areas.');
 if(d[EVIDENCE_KEY]!==undefined&&!bounded(d[EVIDENCE_KEY],1500,validObservation))throw Error('Invalid price observations.');
 if(d['savehalf-bookmarks-v4']!==undefined&&!bounded(d['savehalf-bookmarks-v4'],100,validDeal))throw Error('Invalid device bookmarks.');
 if(d[PANTRY_KEY]!==undefined&&!bounded(d[PANTRY_KEY],100,validPantry))throw Error('Invalid pantry.');if(d[RECEIPTS_KEY]!==undefined&&!bounded(d[RECEIPTS_KEY],100,validReceipt))throw Error('Invalid receipts.');
 if(d[PREFERENCES_KEY]!==undefined){const p=d[PREFERENCES_KEY] as {stores:unknown;category:unknown;followedWords?:unknown;excludedWords?:unknown};if([p?.followedWords,p?.excludedWords].some(v=>v!==undefined&&(typeof v!=='string'||v.length>100)))throw Error('Invalid title preferences.');if(!validateBrowse({tab:'deals',search:'',stores:p?.stores,category:p?.category,sort:'price',half:false,budget:''}))throw Error('Invalid preferences.');}
 return {version:1,createdAt:typeof b.createdAt==='string'?b.createdAt:'',data:d};}
export function applyBackup(b:Backup){validateBackup(b);const original=new Map(Object.keys(b.data).map(k=>[k,localStorage.getItem(k)]));try{for(const [k,v] of Object.entries(b.data))localStorage.setItem(k,k===BUDGET_KEY?String(v):JSON.stringify(v));}catch(e){for(const [k,v] of original){try{if(v===null)localStorage.removeItem(k);else localStorage.setItem(k,v);}catch{/* Best effort rollback on storage failure. */}}throw e;}}
