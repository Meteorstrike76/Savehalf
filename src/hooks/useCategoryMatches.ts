import {useEffect,useState} from 'react';
import {cachedRead} from '@/lib/readCache';
import {isConfigured,supabase,toDeal,DEAL_COLUMNS,type Deal} from '@/lib/supabase';
import {demoDeals} from '@/lib/demo';
import type {DealFilters} from './useDeals';
const AGE=120000,MAX_ROWS=960;
type Snapshot={key:string;rows:Deal[];expiresAt:number};
/** Bounded full sibling set only when title/device refinements need exact counts. */
export function useCategoryMatches(filters:DealFilters,enabled:boolean){
 const [snapshot,setSnapshot]=useState<Snapshot|null>(null);
 const key=JSON.stringify({p_query:filters.search.trim().slice(0,60),p_stores:[...filters.stores].sort(),p_sale:!!filters.saleOnly,p_discount:filters.minDiscount||0,p_max:filters.maxPrice??null,p_min:filters.minPrice||0,p_sort:filters.sort});
 useEffect(()=>{
  setSnapshot(null);if(!enabled)return;
  let active=true,generation=0;let timer:ReturnType<typeof setTimeout>|undefined;
  const refresh=()=>{if(document.hidden)return;const request=++generation;setSnapshot(null);
   cachedRead('category-matches:'+key+':'+Math.floor(Date.now()/AGE),async()=>{
    const params=JSON.parse(key),expiresAt=Date.now()+AGE;
    if(!params.p_stores.length)return {key,rows:[],expiresAt};
    if(!isConfigured)return {key,expiresAt,rows:demoDeals.filter(d=>params.p_stores.includes(d.store)&&d.title.toLowerCase().includes(params.p_query.toLowerCase())&&(!params.p_sale||d.discountPct>0)&&d.discountPct>=params.p_discount&&d.discountPrice>=params.p_min&&d.discountPrice<=params.p_max)};
    const rows:Deal[]=[],controller=new AbortController(),deadline=setTimeout(()=>controller.abort(),12000);
    try{for(let offset=0;offset<MAX_ROWS;offset+=48){
     let data:Array<{item:Record<string,unknown>;total_count:number}>|null=null;
     if(params.p_query||params.p_sort==='unit'||params.p_min){
      const result=await supabase.rpc('search_deals_range',{...params,p_max:params.p_max??5000,p_category:'All',p_offset:offset,p_limit:48}).abortSignal(controller.signal);
      if(result.error)throw result.error;data=result.data;
     }else{
      let q=supabase.from('current_deals').select(DEAL_COLUMNS,{count:'exact'}).eq('is_active',true).in('store_category',params.p_stores).neq('source_feed','seed').gte('last_seen_at',new Date(Date.now()-72*3600000).toISOString());
      if(params.p_sale)q=q.gt('discount_pct',0);if(params.p_discount)q=q.gte('discount_pct',params.p_discount);if(params.p_max!==null)q=q.lte('discount_price',params.p_max);
      if(params.p_sort==='price')q=q.order('discount_price').order('id');else if(params.p_sort==='discount')q=q.order('discount_pct',{ascending:false}).order('published_at',{ascending:false}).order('id');else q=q.order('published_at',{ascending:false}).order('id');
      const result=await q.range(offset,offset+47).abortSignal(controller.signal);if(result.error)throw result.error;
      if(result.count===null||(result.count>0&&!result.data?.length))throw Error('Category total unavailable');data=(result.data||[]).map(item=>({item,total_count:result.count!}));
     }
     if(!Array.isArray(data))throw Error('Category matches unavailable');
     if(!data.length){if(offset)throw Error('Category snapshot changed');return {key,rows,expiresAt};}
     const total=Number(data[0].total_count);if(!Number.isSafeInteger(total)||total>MAX_ROWS||total<1)throw Error('Narrow filters to count this selection');
     rows.push(...data.map(r=>toDeal(r.item)));
     if(rows.length>=total){if(rows.length!==total||new Set(rows.map(d=>d.id)).size!==rows.length)throw Error('Category snapshot changed');return {key,rows,expiresAt};}
    }throw Error('Category count bound exceeded');}finally{clearTimeout(deadline);}
   },AGE).then(next=>{if(!active||generation!==request)return;clearTimeout(timer);if(next.expiresAt<=Date.now()){setSnapshot(null);return;}setSnapshot(next);timer=setTimeout(()=>{setSnapshot(null);refresh();},next.expiresAt-Date.now());}).catch(()=>{if(active&&generation===request)setSnapshot(null);});
  };
  const delay=setTimeout(refresh,JSON.parse(key).p_query?250:0);window.addEventListener('focus',refresh);document.addEventListener('visibilitychange',refresh);
  return()=>{active=false;clearTimeout(delay);clearTimeout(timer);window.removeEventListener('focus',refresh);document.removeEventListener('visibilitychange',refresh);};
 },[enabled,key]);
 return enabled&&snapshot?.key===key&&snapshot.expiresAt>Date.now()?snapshot.rows:null;
}
