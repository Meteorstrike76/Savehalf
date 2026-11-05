import {useEffect,useState} from 'react';
import {cachedRead} from '@/lib/readCache';
import {isConfigured,supabase} from '@/lib/supabase';
import type {DealFilters} from '@/hooks/useDeals';
import {CATEGORIES} from '@/lib/stores';
type Row={store:string;category:string;products:number;reductions:number};
export function useCategoryCounts(filters:DealFilters,enabled:boolean){
 const [rows,setRows]=useState<Row[]|null>(null);
 useEffect(()=>{if(!enabled||!isConfigured)return;let active=true;
 cachedRead('catalogue-counts',async()=>{const {data,error}=await supabase.rpc('catalogue_counts').abortSignal(AbortSignal.timeout(12000));if(error)throw error;return (data??[]) as Row[];},120000).then(data=>{if(active)setRows(data);}).catch(()=>{if(active)setRows(null);});
 return()=>{active=false;};},[enabled]);
 // Existing aggregate does not include text, price or minimum-discount facets.
 // Unknown must remain unknown rather than displaying an unrelated total.
 if(!enabled||!rows||filters.search.trim()||filters.minPrice!==undefined||filters.maxPrice!==undefined||filters.minDiscount)return null;
 const counts:Record<string,number>={All:0};for(const category of CATEGORIES)counts[category]=0;
 for(const row of rows){if(!filters.stores.includes(row.store as typeof filters.stores[number]))continue;
 const value=Number(filters.saleOnly?row.reductions:row.products);
 if(!Number.isSafeInteger(value)||value<0||!CATEGORIES.includes(row.category as typeof CATEGORIES[number]))return null;
 counts[row.category]+=value;counts.All+=value;}
 return counts;
}
