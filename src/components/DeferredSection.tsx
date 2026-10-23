import {Component, Suspense, useEffect, useRef, useState, type ReactNode} from 'react';

class FeedBoundary extends Component<{label:string;children:ReactNode},{failed:boolean}> {
 state={failed:false};
 static getDerivedStateFromError(){return {failed:true};}
 render(){return this.state.failed?<div className="deferred-feed" role="status"><p>Could not load {this.props.label}. The main catalogue is still available. Reload this page to try again.</p><button onClick={()=>window.location.reload()}>Reload page</button></div>:this.props.children;}
}

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
 return <div ref={anchor} tabIndex={-1} role="group" aria-label={label} className="deferred-section">{ready?<FeedBoundary label={label}><Suspense fallback={<p role="status">Loading {label}…</p>}>{children}</Suspense></FeedBoundary>:<section className="deferred-feed" aria-label={label}><p>{label}</p><button onClick={()=>{anchor.current?.focus({preventScroll:true});setReady(true);}}>Show {label}</button></section>}</div>;
}
