import {useEffect,useMemo,useSyncExternalStore} from 'react';
import {DEAL_COLUMNS,supabase,toDeal,type SavedDeal} from '@/lib/supabase';
import {useAuth} from '@/context/AuthContext';
import {createFavouritesStore} from '@/lib/favouritesStore';

export function useFavourites(){
 const {user}=useAuth();const userId=user?.id;
 const store=useMemo(()=>createFavouritesStore(userId?{
  read:async(signal)=>{
   const {data,error}=await supabase.from('saved_deals')
    .select(`id,deal_id,created_at,deal:deals(${DEAL_COLUMNS})`)
    .eq('user_id',userId).order('created_at',{ascending:false}).limit(500).abortSignal(signal);
   if(error)return {error};
   const rows:SavedDeal[]=(data??[]).flatMap(row=>{
    const deal=Array.isArray(row.deal)?row.deal[0]:row.deal;
    return deal?[{id:row.id,dealId:row.deal_id,createdAt:row.created_at,deal:toDeal(deal)}]:[];
   });return {data:rows};
  },
  add:async(dealId)=>await supabase.from('saved_deals').insert({user_id:userId,deal_id:dealId}),
  remove:async(dealId)=>await supabase.from('saved_deals').delete().eq('user_id',userId).eq('deal_id',dealId)
 }:null),[userId]);
 const snapshot=useSyncExternalStore(store.subscribe,store.getSnapshot);
 useEffect(()=>{store.start();return()=>store.stop();},[store]);
 return {...snapshot,toggle:store.toggle};
}
