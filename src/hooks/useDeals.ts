import {cachedRead} from '@/lib/readCache';
import { useCallback, useEffect, useRef, useState } from 'react';
import { DEAL_COLUMNS, isConfigured, supabase, toDeal, type Deal } from '@/lib/supabase';
import { demoDeals } from '@/lib/demo';
import type { DealCategory, StoreId } from '@/lib/stores';

export const PAGE_SIZE = 24;
export type SortKey = 'discount' | 'newest' | 'price' | 'unit';

export type DealFilters = {
  stores: StoreId[];
  category: DealCategory | 'All';
  search: string;
  sort: SortKey;
  saleOnly?: boolean;
  minDiscount?: number;
  maxPrice?: number;
  minPrice?:number;
};

export function useDeals(filters: DealFilters, enabled=true) {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reqId = useRef(0);
  const abortRef=useRef<AbortController|null>(null);
  const moreLock=useRef(false);

  const storesKey = filters.stores.join('|');

  const fetchPage = useCallback(
    async (offset: number) => {
      const id = ++reqId.current;
      abortRef.current?.abort();const controller=new AbortController();abortRef.current=controller;
      if (!isConfigured) {
        let rows = demoDeals.filter(d => filters.stores.includes(d.store) && (filters.category === 'All' || d.category === filters.category) && d.title.toLowerCase().includes(filters.search.toLowerCase()) && (!filters.saleOnly || d.discountPct > 0) && d.discountPct >= (filters.minDiscount ?? 0) && d.discountPrice >= (filters.minPrice ?? 0) && d.discountPrice <= (filters.maxPrice ?? Infinity));
        rows = rows.sort((a,b) => filters.sort === 'price' ? a.discountPrice-b.discountPrice : filters.sort === 'discount' ? b.discountPct-a.discountPct : a.id.localeCompare(b.id));
        return {rows:rows.slice(offset,offset+PAGE_SIZE),count:rows.length};
      }
      const cacheKey='catalogue:'+JSON.stringify({...filters,offset});
      if(filters.search.trim()||filters.sort==='unit'||filters.minPrice){
        const response=await cachedRead(cacheKey,async()=>{
          const timeout=setTimeout(()=>controller.abort(),12000);try{
          const result=await supabase.rpc('search_deals_range',{p_min:filters.minPrice||0,p_query:filters.search.trim().slice(0,60),p_stores:filters.stores,p_category:filters.category,p_sale:!!filters.saleOnly,p_discount:filters.minDiscount||0,p_max:filters.maxPrice??5000,p_sort:filters.sort,p_offset:offset,p_limit:PAGE_SIZE}).abortSignal(controller.signal);
          if(result.error)throw Error(result.error.message);
          return result.data as {item:Record<string,unknown>;total_count:number}[];
          }finally{clearTimeout(timeout);}
        },120000);
        if(id!==reqId.current)return null;
        return {rows:response.map(r=>toDeal(r.item)),count:Number(response[0]?.total_count||0)};
      }
      let q = supabase
        .from('current_deals')
        .select(DEAL_COLUMNS, { count: 'exact' })
        .eq('is_active', true)
        .in('store_category', filters.stores);

      q = q.neq('source_feed', 'seed').gte('last_seen_at', new Date(Date.now() - 72 * 3600000).toISOString());
      if (filters.saleOnly) q = q.gt('discount_pct', 0);
      if (filters.minDiscount) q = q.gte('discount_pct', filters.minDiscount);
      if (filters.maxPrice !== undefined) q = q.lte('discount_price', filters.maxPrice);
      if (filters.category !== 'All') q = q.eq('category', filters.category);
      const term = filters.search.trim().replace(/[%_,()]/g, ' ').slice(0, 60);
      if (term) q = q.ilike('title', `%${term}%`);

      if (filters.sort === 'discount') q = q.order('discount_pct', { ascending: false }).order('published_at', { ascending: false }).order('id');
      else if (filters.sort === 'price') q = q.order('discount_price', { ascending: true }).order('id');
      else q = q.order('published_at', { ascending: false }).order('id');

      const timeout=setTimeout(()=>controller.abort(),12000);let response;try{response=await cachedRead(cacheKey,async()=>{const result=await q.range(offset, offset + PAGE_SIZE - 1).abortSignal(controller.signal);if(result.error)throw Error(result.error.message);return result;},120000);}catch(err){if(id!==reqId.current)return null;throw err;}finally{clearTimeout(timeout);}
      const {data,count}=response;
      if (id !== reqId.current) return null; // a newer request superseded this one
      return { rows: (data ?? []).map(toDeal), count: count ?? 0 };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [storesKey, filters.category, filters.search, filters.sort, filters.saleOnly, filters.minDiscount, filters.maxPrice,filters.minPrice]
  );

  useEffect(() => {
    ++reqId.current;abortRef.current?.abort();moreLock.current=false;setLoadingMore(false);
    if (!enabled || !filters.stores.length) {
      setDeals([]); setTotal(0); setLoading(false);
      return;
    }
    ++reqId.current;
    setDeals([]); setTotal(0);
    setLoading(true);
    setError(null);
    let active=true;
    const t = setTimeout(() => {
      fetchPage(0)
        .then((r) => { if (active&&r) { setDeals(r.rows); setTotal(r.count); setLoading(false); } })
        .catch((e: Error) => { if(active){setError(e.message); setLoading(false);} });
    }, filters.search ? 250 : 0); // debounce typing only
    const invalidate = () => { ++reqId.current; };
    return () => { active=false;clearTimeout(t); abortRef.current?.abort(); invalidate(); };
  }, [fetchPage, filters.stores.length, filters.search, enabled]);

  const loadMore = useCallback(async () => {
    if(moreLock.current)return;moreLock.current=true;setLoadingMore(true);
    const generation=reqId.current+1;
    try {
      const r = await fetchPage(deals.length);
      if (r) { setDeals((prev) => [...prev, ...r.rows.filter((n) => !prev.some((p) => p.id === n.id))]); setTotal(r.count); }
    } catch (e) {
      if(generation===reqId.current)setError((e as Error).message);
    } finally {
      if(generation===reqId.current){moreLock.current=false;setLoadingMore(false);}
    }
  }, [fetchPage, deals.length]);

  return { deals, total, loading, loadingMore, error, hasMore: deals.length < total, loadMore };
}
