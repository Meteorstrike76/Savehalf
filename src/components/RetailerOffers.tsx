import {useEffect,useMemo,useState} from 'react';
import {ArrowUpRight} from 'lucide-react';
import {isConfigured,supabase} from '@/lib/supabase';
import {cachedRead} from '@/lib/readCache';
import {activePosts,feedHealthText,type CommunityFeed} from '@/lib/community';
const retailers=[['priceline','Priceline'],['chemistwarehouse','Chemist Warehouse'],['iga','IGA'],['officeworks','Officeworks'],['sephora','Sephora']] as const;
const stamp=(s:string)=>new Date(s).toLocaleString('en-AU',{timeZone:'Australia/Sydney',day:'numeric',month:'short',hour:'numeric',minute:'2-digit'});
export default function RetailerOffers({search}:{search:string}){
 const [feeds,setFeeds]=useState<CommunityFeed[]>([]),[store,setStore]=useState('all'),[clearance,setClearance]=useState(false),[limit,setLimit]=useState(12),[busy,setBusy]=useState(true),[failed,setFailed]=useState(false),[now,setNow]=useState(Date.now);
 useEffect(()=>{const timer=setInterval(()=>{if(!document.hidden)setNow(Date.now());},60000);return()=>clearInterval(timer);},[]);
 useEffect(()=>{let alive=true;const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),12000);
  if(!isConfigured){setBusy(false);return()=>{clearTimeout(timeout);};}
  cachedRead('inline-retailer-offers',async()=>{const {data,error}=await supabase.from('community_feeds').select('feed_key,label,status,items,checked_at,last_success_at,retry_after').in('feed_key',retailers.map(r=>r[0])).limit(5).abortSignal(controller.signal);if(error)throw error;return (data||[]) as CommunityFeed[];},120000).then(rows=>{if(alive)setFeeds(rows);}).catch(()=>{if(alive)setFailed(true);}).finally(()=>{clearTimeout(timeout);if(alive)setBusy(false);});
  return()=>{alive=false;clearTimeout(timeout);controller.abort();};
 },[]);
 const selected=feeds.filter(f=>store==='all'||f.feed_key===store);
 const posts=useMemo(()=>activePosts(selected,now).filter(p=>p.title.toLowerCase().includes(search.trim().toLowerCase())&&(!clearance||/\bclearance\b/i.test(p.title))).sort((a,b)=>Date.parse(b.published_at)-Date.parse(a.published_at)),[selected,now,search,clearance]);
 const choose=(key:string)=>{setStore(key);setLimit(12);};
 return <section className="retailer-offers" aria-label="Retailer deals and clearances"><div className="section-head"><div><div className="eyebrow">MORE RETAILER OFFERS</div><h2>Beauty, pharmacy & everyday deals.</h2></div><span className="data-pill">Community reports</span></div>
  <p>Offers from Priceline, Chemist Warehouse, IGA, Officeworks and Sephora, shown here in your deals feed. These are reported offers, not retailer-verified product prices. The product price, half-price and category filters above do not apply to these headlines; search does.</p>
  <div className="category-tabs" aria-label="Filter retailer offers"><button aria-pressed={store==='all'} onClick={()=>choose('all')}>All retailer offers</button>{retailers.map(([key,label])=><button key={key} aria-pressed={store===key} onClick={()=>choose(key)}>{label}</button>)}</div>
  <label className="half-toggle"><input type="checkbox" checked={clearance} onChange={e=>{setClearance(e.target.checked);setLimit(12);}}/> Clearance mentioned in title</label>
  <p role="status">{busy?'Loading retailer offers…':failed?'Retailer offers could not be loaded.':`${posts.length} recent reported offers${clearance?' mentioning clearance':''}.`}</p>
  <div className="radar-grid">{posts.slice(0,limit).map(p=>{const source=selected.find(f=>f.items.some(x=>x.id===p.id));return <article className="radar-card" key={p.id}><div className="radar-card-top"><span>{source?.label} · community offer</span></div><h3><a href={p.post_url} target="_blank" rel="noopener noreferrer">{p.title}</a></h3><p>{p.category} · Check store, coupon, membership and delivery conditions.</p><small>Reported {stamp(p.published_at)} Sydney{p.expires_at&&<> · Ends {stamp(p.expires_at)} Sydney</>}</small>{source&&<p className="radar-meta">{feedHealthText(source,now)}{source.last_success_at&&<> · Checked {stamp(source.last_success_at)} Sydney</>}</p>}<a className="radar-source" href={p.post_url} target="_blank" rel="noopener noreferrer">Check offer evidence <ArrowUpRight size={16}/></a></article>;})}</div>
  {!busy&&!failed&&!posts.length&&<p className="meal-notice">No recent offers match this retailer and search. This does not mean the retailer has no sales. No products or prices have been invented to fill this list.</p>}
  {posts.length>limit&&<button className="load-more" onClick={()=>setLimit(n=>n+12)}>Show 12 more retailer offers</button>}
  <details className="radar-health"><summary>Retailer collection status</summary>{retailers.map(([key,label])=>{const f=feeds.find(row=>row.feed_key===key);return <p key={key}><b>{label}</b> · {f?feedHealthText(f,now):'No saved source snapshot loaded'}{f?.last_success_at&&<> · Last success {stamp(f.last_success_at)} Sydney</>}</p>;})}<p>Expired posts are hidden. Reports without an end date hide after seven days. Collection can be blocked or delayed. Refreshing this page reads saved data; it does not trigger a scrape. IGA prices are local; pharmacy savings can use RRP. Source headlines are not included in product price comparisons or basket totals.</p></details>
 </section>;
}
