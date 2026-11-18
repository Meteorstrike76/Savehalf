import {supabase,isConfigured} from './supabase';
import {analyticsAllowed} from './analytics';
type SiteEvent={event:string;dimension:string;entity:string};
const queue:SiteEvent[]=[];const recent=new Map<string,number>();let timer:ReturnType<typeof setTimeout>|undefined;let paused=false;
export const activityConsent=()=>{try{return localStorage.getItem('savehalf-activity-consent-v1')==='yes';}catch{return false;}};
export function setActivityConsent(value:boolean){try{localStorage.setItem('savehalf-activity-consent-v1',value?'yes':'no');}catch{/* Restricted storage means no collection. */}if(!value){queue.length=0;recent.clear();}window.dispatchEvent(new Event('savehalf-activity-consent'));}
export function pauseActivity(value:boolean){paused=value;if(value)queue.length=0;}
export function trackSiteEvent(event:string,dimension:string,entity:string){
 if(window.location.pathname!=='/'||!isConfigured||paused||!activityConsent()||document.hidden||!analyticsAllowed(window.location.origin+'/',navigator.doNotTrack,(navigator as Navigator&{globalPrivacyControl?:boolean}).globalPrivacyControl)||window.location.search||/access_token|type=recovery|code=/.test(window.location.hash))return;
 if(!/^[a-z_]{2,30}$/.test(event)||!['page','section','product','feature','category'].includes(dimension)||entity.length>80)return;
 const key=[event,dimension,entity].join(':');const now=Date.now();if(now-(recent.get(key)||0)<(event==='impression'?300000:1000))return;
 if(recent.size>500)recent.clear();recent.set(key,now);if(queue.length<20)queue.push({event,dimension,entity});
 if(!timer)timer=setTimeout(()=>{timer=undefined;void flushSiteEvents();},5000);
}
async function flushSiteEvents(){if(!activityConsent()||paused){queue.length=0;return;}const events=queue.splice(0,20);if(!events.length)return;try{await supabase.rpc('record_site_events',{p_events:events}).abortSignal(AbortSignal.timeout(5000));}catch{/* Analytics never blocks shopping and never retries indefinitely. */}}
