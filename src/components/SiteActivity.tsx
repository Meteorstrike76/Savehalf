import {useEffect} from 'react';
import {trackSiteEvent} from '@/lib/siteEvents';
export default function SiteActivity(){useEffect(()=>{
 const click=(e:MouseEvent)=>{const el=e.target instanceof Element?e.target.closest('button'):null;if(!el)return;
  const product=el.closest('[data-activity-product]')?.getAttribute('data-activity-product');
  if(product){const event=el.classList.contains('heart')?'save':el.classList.contains('list-add')?'list':el.textContent?.trim()==='Compare'?'compare':null;if(event)trackSiteEvent(event,'product',product);}
  const label=el.getAttribute('aria-label')||el.textContent?.trim()||'';
  const map:Record<string,string>={'Sydney eats':'eats','Open watchlist':'watchlist','Open shopping list':'list','Open Deal Radar':'radar','Plan my week Seven dinners. Your budget. One shopping list.':'meal'};
  if(map[label])trackSiteEvent('feature','feature',map[label]);
 };
 document.addEventListener('click',click);
 if(typeof IntersectionObserver==='undefined')return()=>document.removeEventListener('click',click);
 const observed=new WeakSet<Element>(),timers=new Map<Element,ReturnType<typeof setTimeout>>();
 const observer=new IntersectionObserver(entries=>{for(const entry of entries){const old=timers.get(entry.target);if(old)clearTimeout(old);timers.delete(entry.target);if(entry.isIntersecting&&entry.intersectionRatio>=0.5){timers.set(entry.target,setTimeout(()=>{const id=entry.target.getAttribute('data-activity-product');if(id&&entry.target.isConnected)trackSiteEvent('impression','product',id);timers.delete(entry.target);},1000));}}},{threshold:0.5});
 const scan=()=>document.querySelectorAll('[data-activity-product]').forEach(el=>{if(!observed.has(el)){observed.add(el);observer.observe(el);}});
 scan();const mutations=new MutationObserver(scan);mutations.observe(document.body,{childList:true,subtree:true});
 return()=>{document.removeEventListener('click',click);observer.disconnect();mutations.disconnect();timers.forEach(clearTimeout);};
 },[]);return null;}
