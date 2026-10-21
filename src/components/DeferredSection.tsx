import {Suspense, useEffect, useRef, useState, type ReactNode} from 'react';

/** Keep optional feeds and their requests out of startup; keyboard users can load them too. */
export default function DeferredSection({label, children}:{label:string;children:ReactNode}) {
 const anchor=useRef<HTMLDivElement>(null);
 const [ready,setReady]=useState(()=>typeof IntersectionObserver==='undefined');
 useEffect(()=>{
  if(ready||!anchor.current)return;
  const observer=new IntersectionObserver(entries=>{
   if(entries.some(entry=>entry.isIntersecting)){observer.disconnect();setReady(true);}
  },{rootMargin:'400px 0px'});
  observer.observe(anchor.current);
  return()=>observer.disconnect();
 },[ready]);
 return <div ref={anchor}>{ready?<Suspense fallback={<p role="status">Loading {label}…</p>}>{children}</Suspense>:<section className="deferred-feed" aria-label={label}><p>{label}</p><button onClick={()=>setReady(true)}>Show {label}</button></section>}</div>;
}
