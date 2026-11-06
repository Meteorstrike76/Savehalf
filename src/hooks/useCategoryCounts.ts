import {useEffect,useState} from 'react';
import {cachedRead} from '@/lib/readCache';
import {isConfigured,supabase} from '@/lib/supabase';
import type {DealFilters} from '@/hooks/useDeals';
import {CATEGORIES} from '@/lib/stores';
type Row={store:string;category:string;products:number;reductions:number};
type Snapshot={rows:Row[];expiresAt:number};
const MAX_AGE=120000;
export function useCategoryCounts(filters:DealFilters,enabled:boolean){
 const [snapshot,setSnapshot]=useState<Snapshot|null>(null);
 const supported=enabled&&!filters.search.trim()&&filters.minPrice===undefined&&filters.maxPrice===undefined&&!filters.minDiscount;
 const storesKey=filters.stores.join('|');
 useEffect(()=>{
  setSnapshot(null);
  if(!supported||!isConfigured||!storesKey)return;
  let active=true,request=0;let expiry:ReturnType<typeof setTimeout>|undefined;
  const refresh=()=>{
   if(document.visibilityState==='hidden')return;
   const id=++request;
   cachedRead('catalogue-counts-v2',async()=>{
    const expiresAt=Date.now()+MAX_AGE;
    const {data,error}=await supabase.rpc('catalogue_counts').abortSignal(AbortSignal.timeout(12000));
    if(error)throw error;
    return {rows:(data??[]) as Row[],expiresAt};
   },MAX_AGE).then(next=>{
    if(!active||id!==request)return;
    clearTimeout(expiry);
    if(next.expiresAt<=Date.now()){setSnapshot(null);return;}
    setSnapshot(next);
    // Expire visibly without background polling. The next browse/focus event
    // refreshes the shared aggregate, including after a suspended tab resumes.
    expiry=setTimeout(()=>setSnapshot(null),next.expiresAt-Date.now());
   }).catch(()=>{if(active&&id===request)setSnapshot(null);});
  };
  refresh();window.addEventListener('focus',refresh);document.addEventListener('visibilitychange',refresh);
  return()=>{active=false;clearTimeout(expiry);window.removeEventListener('focus',refresh);document.removeEventListener('visibilitychange',refresh);};
 },[supported,storesKey,filters.saleOnly,filters.category]);
 // Existing aggregate does not include text, price or minimum-discount facets.
 // Unknown must remain unknown rather than displaying an unrelated total.
 if(!supported||!snapshot||snapshot.expiresAt<=Date.now())return null;
 const rows=snapshot.rows;
 const counts:Record<string,number>={All:0};for(const category of CATEGORIES)counts[category]=0;
 for(const row of rows){if(!filters.stores.includes(row.store as typeof filters.stores[number]))continue;
 const value=Number(filters.saleOnly?row.reductions:row.products);
 if(!Number.isSafeInteger(value)||value<0||!CATEGORIES.includes(row.category as typeof CATEGORIES[number]))return null;
 counts[row.category]+=value;counts.All+=value;}
 return counts;
}
