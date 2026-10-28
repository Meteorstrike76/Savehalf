import {useEffect,useState} from 'react';
import {ArrowUpRight} from 'lucide-react';
import {supabase,isConfigured} from '@/lib/supabase';
import {providerFresh} from '@/lib/providerFreshness';
import {cachedRead} from '@/lib/readCache';
import ProductImage from './ProductImage';
import type {StoreId} from '@/lib/stores';
type Product={id:string;store:string;title:string;price:number;average_30d:number|null;product_url:string;image_url:string|null;source_updated_at:string;retrieved_at:string};
const columns='id,store,title,price,average_30d,product_url,image_url,source_updated_at,retrieved_at';
const money=(n:number)=>new Intl.NumberFormat('en-AU',{style:'currency',currency:'AUD'}).format(n);
export default function ProviderProducts({search,stores,category,min,max,half}:{search:string;stores:StoreId[];category:string;min:string;max:string;half:boolean}){
 const [rows,setRows]=useState<Product[]>([]),[total,setTotal]=useState(0),[offset,setOffset]=useState(0),[busy,setBusy]=useState(false),[failed,setFailed]=useState(false);
 const [now,setNow]=useState(Date.now);
 useEffect(()=>{const timer=setInterval(()=>{if(!document.hidden)setNow(Date.now());},60000);const visible=()=>{if(!document.hidden)setNow(Date.now());};document.addEventListener('visibilitychange',visible);return()=>{clearInterval(timer);document.removeEventListener('visibilitychange',visible);};},[]);
 const visibleRows=rows.filter(p=>providerFresh(p,now));
 const selected=stores.filter(s=>['Coles','Woolworths','Big W','Kmart'].includes(s)),key=selected.join('|');
 const filters=JSON.stringify({search,key,category,min,max,half});
 const [previous,setPrevious]=useState(filters);
 // Reset pagination before a changed filter can request a later page.
 if(previous!==filters){setPrevious(filters);setOffset(0);setRows([]);}
 useEffect(()=>{let active=true;const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),12000);
  if(!isConfigured||!key||half){setRows([]);setTotal(0);setBusy(false);clearTimeout(timer);return;}
  setBusy(true);setFailed(false);
  const query=async()=>{let q=supabase.from('provider_products').select(columns,{count:'exact'}).in('store',key.split('|')).order('price').order('id').range(offset,offset+11);
   const term=search.trim().replace(/[%_,()]/g,' ').slice(0,60);if(term)q=q.ilike('title',`%${term}%`);if(category!=='All')q=q.eq('category',category);if(min)q=q.gte('price',Number(min));if(max)q=q.lte('price',Number(max));
   const {data,count,error}=await q.abortSignal(controller.signal);if(error)throw error;return {rows:(data||[]) as Product[],count:count||0};};
  const debounce=setTimeout(()=>{cachedRead('provider-products:'+filters+':'+offset,query,120000).then(r=>{if(active){setRows(r.rows);setTotal(r.count);}}).catch(()=>{if(active){setFailed(true);setRows([]);setTotal(0);}}).finally(()=>{clearTimeout(timer);if(active)setBusy(false);});},search?250:0);
  return()=>{active=false;clearTimeout(debounce);clearTimeout(timer);controller.abort();};
 },[filters,offset,key,half,search,category,min,max]);
 if(!isConfigured||!key)return null;
 return <section className="provider-products retailer-offers" aria-label="WhichGrocer product listings"><div className="section-head"><div><div className="eyebrow">COLES · WOOLWORTHS · BIG W · KMART</div><h2>More product listings.</h2></div><span className="data-pill">Dated catalogue snapshots</span></div>
 <p>Product data by <a href="https://www.whichgrocer.com/" target="_blank" rel="noopener noreferrer">WhichGrocer</a>. These are catalogue prices, not a local shelf or stock guarantee. Savings below compare with the provider’s 30-day average, not a retailer “was” price or weekly half-price promotion. Check the source date and retailer before buying. These snapshots are not added to product price history or account favourites.</p>
 {half?<p className="meal-notice">Provider average-price comparisons are excluded from the half-price filter because they do not establish a retailer half-price offer.</p>:<><p role="status">{busy?'Loading provider products…':failed?'Provider product snapshots could not be loaded.':`${total} matching provider products · ${visibleRows.length} shown on this page`}</p>{rows.length>visibleRows.length&&<p role="status">Some snapshots expired while this page was open. Reload to check for a newer saved snapshot; reloading does not trigger collection.</p>}<div className="product-grid">{visibleRows.map(p=>{const average=Number(p.average_30d),price=Number(p.price),saving=average>price?Math.floor((1-price/average)*100):0;return <article className="product-card" key={p.id}><div className="product-image"><ProductImage title={p.title} imageUrl={p.image_url}/><span className="image-caption">PROVIDER CATALOGUE</span></div><div className="product-body"><span className="store-label">{p.store}</span><h3>{p.title}</h3><div className="prices"><strong>{money(price)}</strong></div>{saving>0&&<p>{saving}% below provider 30-day average of {money(average)}</p>}<p className="saving">Source updated {new Date(p.source_updated_at).toLocaleDateString('en-AU',{timeZone:'Australia/Sydney'})}</p><small>Retrieved {new Date(p.retrieved_at).toLocaleDateString('en-AU',{timeZone:'Australia/Sydney'})} · AU catalogue · confirm conditions</small><div className="card-actions"><a href={p.product_url} target="_blank" rel="noopener noreferrer">Check at {p.store} <ArrowUpRight size={15}/></a></div></div></article>;})}</div>{!busy&&!failed&&!visibleRows.length&&<p>No recent provider products match these filters. Try fewer stores or a broader search. Saved snapshots disappear after 72 hours without a new retrieval; refreshing this page does not collect new prices. Target is not supported by this provider connection.</p>}<div className="filter-tools">{offset>0&&<button disabled={busy} onClick={()=>setOffset(n=>Math.max(0,n-12))}>Previous provider products</button>}{offset+12<total&&<button disabled={busy} onClick={()=>setOffset(n=>n+12)}>Next 12 provider products</button>}</div></>}
 </section>;
}
