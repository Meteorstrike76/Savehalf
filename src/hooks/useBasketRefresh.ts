import {useRef,useState,type Dispatch,type SetStateAction} from 'react';
import {DEAL_COLUMNS,isConfigured,supabase,toDeal} from '@/lib/supabase';
import {applyChecks,checkBasket,type PriceCheck} from '@/lib/basketRefresh';
import type {ListItem} from '@/lib/shopping';
export function useBasketRefresh(items:ListItem[],setItems:Dispatch<SetStateAction<ListItem[]>>){
 const [checks,setChecks]=useState<PriceCheck[]>([]),[busy,setBusy]=useState(false),[notice,setNotice]=useState('');
 const inFlight=useRef(false),nextRead=useRef(0);
 async function refresh(){
  if(inFlight.current)return;
  if(Date.now()<nextRead.current){setNotice('Please wait five minutes between catalogue checks.');return;}
  if(!isConfigured){setNotice('This preview uses sample prices. Connect the live catalogue to check prices.');return;}
  const snapshot=items.slice(0,100),ids=snapshot.filter(x=>x.deal.source!=='sample'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(x.deal.id)).map(x=>x.deal.id);
  if(!ids.length){setNotice('No live catalogue products to check. Sample prices cannot be verified.');return;}
  inFlight.current=true;nextRead.current=Date.now()+300000;setBusy(true);setNotice('Checking collected prices…');
  try{
   const {data,error}=await supabase.from('current_deals').select(DEAL_COLUMNS).in('id',ids).eq('is_active',true).neq('source_feed','seed').gte('last_seen_at',new Date(Date.now()-72*3600000).toISOString()).limit(100).abortSignal(AbortSignal.timeout(12000));
   if(error)throw error;
   const result=checkBasket(snapshot,(data??[]).map(toDeal));setChecks(result);setItems(current=>applyChecks(current,result));setNotice('Check complete. Unverified products keep their saved prices. Confirm stock and checkout price at the retailer.');
  }catch{setNotice('Check failed. Saved prices are unchanged; no new prices verified.');}finally{inFlight.current=false;setBusy(false);}
 }
 return {checks,busy,notice,refresh};
}
