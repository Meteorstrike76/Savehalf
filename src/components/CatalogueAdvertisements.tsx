import {useEffect,useState} from 'react';
import {catalogueAdCurrent,readCatalogueFeed,type CatalogueAd} from '@/lib/catalogueFeed';
import ProductImage from './ProductImage';

export default function CatalogueAdvertisements(){
 const [rows,setRows]=useState<CatalogueAd[]>([]),[store,setStore]=useState('All'),[query,setQuery]=useState(''),[limit,setLimit]=useState(24),[now,setNow]=useState(Date.now);
 useEffect(()=>{
  let active=true,lastFetch=0;
  let controller:AbortController|null=null;
  const load=async()=>{
   if(document.hidden||Date.now()-lastFetch<15*60000)return;
   lastFetch=Date.now();
   controller?.abort();const request=new AbortController();controller=request;
   const timeout=setTimeout(()=>request.abort(),10000);
   try{
    const response=await fetch('/catalogue-offers.json',{signal:request.signal,cache:'no-cache'});
    if(!response.ok||Number(response.headers.get('content-length')||0)>2000000)return;
    const text=await response.text();if(text.length>2000000)return;
    if(active)setRows(readCatalogueFeed(JSON.parse(text)));
   }catch{/* Existing observations expire independently when refresh is unavailable. */}
   finally{clearTimeout(timeout);}
  };
  void load();
  const timer=setInterval(()=>{setNow(Date.now());if(!document.hidden)void load();},30000);
  const visible=()=>{if(!document.hidden){setNow(Date.now());void load();}};
  document.addEventListener('visibilitychange',visible);
  return()=>{active=false;controller?.abort();clearInterval(timer);document.removeEventListener('visibilitychange',visible);};
 },[]);
 const current=rows.filter(p=>catalogueAdCurrent(p,now));
 if(!current.length)return null;
 const matches=current.filter(p=>(store==='All'||p.store===store)&&p.name.toLowerCase().includes(query.toLowerCase()));
 return <section className="retailer-offers" aria-label="Catalogue advertisements"><div className="section-head"><div><div className="eyebrow">DATED ADVERTISEMENTS</div><h2>From the catalogues.</h2></div><span className="data-pill">CatalogueOffers source</span></div>
 <p>Advertised prices from selected catalogue pages. These listings have their own filters and are separate from verified retailer reductions. Confirm the region, exact pack, conditions and price at checkout. Coverage is partial.</p>
 <div className="filter-tools"><label>Catalogue retailer <select style={{minHeight:48}} value={store} onChange={e=>{setStore(e.target.value);setLimit(24);}}><option>All</option>{Array.from(new Set(current.map(p=>p.store))).sort().map(s=><option key={s}>{s}</option>)}</select></label><label>Search catalogues <input style={{minHeight:48}} type="search" value={query} onChange={e=>{setQuery(e.target.value);setLimit(24);}} maxLength={80}/></label></div>
 <p role="status">{matches.length} current advertisements · {Math.min(limit,matches.length)} shown</p><div className="product-grid">{matches.slice(0,limit).map(p=><article className="product-card" key={p.id}><div className="product-image"><ProductImage title={p.name} imageUrl={p.image_url}/><span className="image-caption">CATALOGUE ADVERTISEMENT</span></div><div className="product-body"><span className="store-label">{p.store}</span><h3>{p.name}</h3><div className="prices"><strong>{p.price_text}</strong></div><p>{p.region?`${p.region} edition detected`:'Region unverified · check local applicability'}</p><p>Catalogue dates: {p.valid_from_date} to {p.valid_through_date}</p><details><summary style={{minHeight:48,display:'flex',alignItems:'center'}}>Source and offer conditions</summary>{p.reference_price_text&&<p>Source reference price: {p.reference_price_text}. Its comparison basis has not been verified.</p>}<p>{p.notice}</p><p>Pack size and purchase conditions have not been independently extracted. Unknown-region advertisements hide early using a conservative date window.</p><p>Checked {new Date(p.checked_at).toLocaleString('en-AU',{timeZone:'Australia/Sydney'})} Sydney.</p></details><div className="card-actions"><a style={{minHeight:48}} href={p.source_url} target="_blank" rel="noopener noreferrer">View source catalogue</a></div></div></article>)}</div>{!matches.length&&<p>No current catalogue advertisements match these filters.</p>}
 {limit<matches.length&&<button style={{minHeight:48}} onClick={()=>setLimit(n=>n+24)}>Show more catalogue advertisements</button>}
 </section>;
}
