import {useCallback,useEffect,useRef,useState} from 'react';
import {DEAL_COLUMNS,isConfigured,supabase,toDeal,type Deal} from '@/lib/supabase';
import {recordObservations} from '@/lib/priceEvidence';
import {WATCH_KEY,WATCH_LIMIT,readWatches,reconcileWatches,freshPrice,type Watch} from '@/lib/watchlist';
export function useWatchlist(open:boolean){
 const [watches,setWatches]=useState<Watch[]>(readWatches),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false);
 const current=useRef(watches),inFlight=useRef(false),nextRead=useRef(0),epoch=useRef(0);
 useEffect(()=>{current.current=watches;try{localStorage.setItem(WATCH_KEY,JSON.stringify(watches));}catch{setNotice('Watchlist storage is unavailable. Your watches will last for this visit.');}},[watches]);
 const refresh=useCallback(async()=>{
  if(!isConfigured||inFlight.current||Date.now()<nextRead.current)return;
  const ids=current.current.filter(w=>w.deal.source!=='sample'&&/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(w.deal.id)).map(w=>w.deal.id).slice(0,WATCH_LIMIT);
  if(!ids.length)return;
  inFlight.current=true;nextRead.current=Date.now()+5*60000;setBusy(true);const version=epoch.current;
  try{const {data,error}=await supabase.from('current_deals').select(DEAL_COLUMNS).in('id',ids).eq('is_active',true).neq('source_feed','seed').gte('last_seen_at',new Date(Date.now()-72*3600000).toISOString()).limit(WATCH_LIMIT).abortSignal(AbortSignal.timeout(12000));if(error)throw error;
   if(version===epoch.current){const latest=(data??[]).map(toDeal);try{recordObservations(latest);}catch{/* Optional local history unavailable. */}setWatches(prev=>reconcileWatches(prev,latest));setNotice('Compared with fresh collected prices. Check stock and price at the retailer.');}
  }catch{setNotice('Could not refresh watches. Previous prices are retained; no new changes confirmed.');}finally{inFlight.current=false;setBusy(false);}
 },[]);
 useEffect(()=>{if(open)void refresh();},[open,refresh]);
 const toggle=(deal:Deal)=>{epoch.current++;if(current.current.some(w=>w.deal.id===deal.id)){setWatches(p=>p.filter(w=>w.deal.id!==deal.id));return 'removed';}if(current.current.length>=WATCH_LIMIT)return 'full';nextRead.current=0;setWatches(p=>[...p,{deal,target:'',previousPrice:null,status:deal.source==='sample'?'sample':freshPrice(deal)?'fresh':'unchecked'}]);return 'added';};
 return {watches,notice,busy,refresh,toggle,setTarget:(id:string,target:string)=>setWatches(p=>p.map(w=>w.deal.id===id?{...w,target}:w))};
}
