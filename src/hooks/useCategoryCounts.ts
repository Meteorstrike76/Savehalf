import {useEffect,useState} from 'react';
import {cachedRead} from '@/lib/readCache';
import {isConfigured,supabase} from '@/lib/supabase';
import type {DealFilters} from '@/hooks/useDeals';
import {CATEGORIES} from '@/lib/stores';
type Row={category:string;products:number};
type Snapshot={rows:Row[];expiresAt:number;key:string};
const MAX_AGE=120000;
export function useCategoryCounts(filters:DealFilters,enabled:boolean){
 const [snapshot,setSnapshot]=useState<Snapshot|null>(null);
 // The selected category is deliberately absent: all sibling totals share a key.
 const key=JSON.stringify({p_query:filters.search.trim().slice(0,60),p_stores:[...filters.stores].sort(),p_sale:!!filters.saleOnly,p_discount:filters.minDiscount||0,p_max:filters.maxPrice??null,p_min:filters.minPrice||0,p_sort:filters.sort==='unit'?'unit':'price'});
 const hasStores=filters.stores.length>0;
 useEffect(()=>{
  setSnapshot(null);
  if(!enabled||!isConfigured||!hasStores)return;
  const params=JSON.parse(key);
  let active=true,request=0;let expiry:ReturnType<typeof setTimeout>|undefined;
  const refresh=()=>{
   if(document.visibilityState==='hidden')return;
   const id=++request;
   cachedRead('catalogue-facets:'+key,async()=>{
    const expiresAt=Date.now()+MAX_AGE;
    const {data,error}=await supabase.rpc('catalogue_facets',params).abortSignal(AbortSignal.timeout(12000));
    if(error)throw error;
    if(!Array.isArray(data))throw Error('Invalid category counts');
    return {rows:data as Row[],expiresAt,key};
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
  const debounce=setTimeout(refresh,params.p_query?250:0);window.addEventListener('focus',refresh);document.addEventListener('visibilitychange',refresh);
  return()=>{active=false;clearTimeout(debounce);clearTimeout(expiry);window.removeEventListener('focus',refresh);document.removeEventListener('visibilitychange',refresh);};
 },[enabled,key,hasStores]);
 // Never show a prior filter's totals during debounce, loading or an error.
 if(!enabled||!isConfigured)return null;
 if(hasStores&&(!snapshot||snapshot.key!==key||snapshot.expiresAt<=Date.now()))return null;
 const rows=hasStores?snapshot!.rows:[];
 const counts:Record<string,number>={All:0};for(const category of CATEGORIES)counts[category]=0;
 for(const row of rows){if(!row||typeof row!=='object')return null;
 const value=Number(row.products);
 if(!Number.isSafeInteger(value)||value<0||!CATEGORIES.includes(row.category as typeof CATEGORIES[number]))return null;
 counts[row.category]+=value;counts.All+=value;}
 return counts;
}
