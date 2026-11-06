import type {Deal,SavedDeal} from './supabase';

type Result<T>={data?:T|null;error?:unknown};
export type FavouritesApi={
 read:(signal:AbortSignal)=>Promise<Result<SavedDeal[]>>;
 add:(dealId:string)=>Promise<Result<unknown>>;
 remove:(dealId:string)=>Promise<Result<unknown>>;
};
type Snapshot={saved:SavedDeal[];ids:Set<string>;loading:boolean;error:string|null;pending:Set<string>};

// A separate store per user prevents late responses from crossing accounts.
export function createFavouritesStore(api:FavouritesApi|null){
 let snapshot:Snapshot={saved:[],ids:new Set(),loading:!!api,error:null,pending:new Set()};
 const listeners=new Set<()=>void>();let active=false,generation=0,controller:AbortController|undefined;
 const publish=(patch:Partial<Snapshot>)=>{snapshot={...snapshot,...patch};for(const notify of listeners)notify();};
 const replaceRows=(saved:SavedDeal[])=>({saved,ids:new Set(saved.map(r=>r.dealId))});
 return {
  getSnapshot:()=>snapshot,
  subscribe:(notify:()=>void)=>{listeners.add(notify);return ()=>{listeners.delete(notify);};},
  start(){
   active=true;const id=++generation;controller?.abort();controller=new AbortController();
   publish({loading:!!api,error:null,...replaceRows([]),pending:new Set()});
   if(api)void api.read(controller.signal).then(result=>{
    if(!active||id!==generation)return;
    if(result.error)throw Error('read failed');
    publish({...replaceRows(result.data??[]),loading:false});
   }).catch(()=>{if(active&&id===generation)publish({loading:false,error:'Saved finds could not be loaded. Please reload to try again.'});});
  },
  stop(){active=false;++generation;controller?.abort();},
  async toggle(deal:Deal):Promise<'added'|'removed'|'error'>{
   if(!active||!api||snapshot.loading||snapshot.pending.has(deal.id))return 'error';
   const epoch=generation,had=snapshot.ids.has(deal.id);
   const old=snapshot.saved.find(r=>r.dealId===deal.id);
   const pending=new Set(snapshot.pending);pending.add(deal.id);
   const next=had?snapshot.saved.filter(r=>r.dealId!==deal.id):[
    {id:`tmp-${deal.id}`,dealId:deal.id,createdAt:new Date().toISOString(),deal},...snapshot.saved
   ];
   publish({...replaceRows(next),pending,error:null});
   try{
    const result=await(had?api.remove(deal.id):api.add(deal.id));
    if(!active||epoch!==generation)return 'error';
    if(result.error)throw Error('write failed');
    const remaining=new Set(snapshot.pending);remaining.delete(deal.id);publish({pending:remaining});
    return had?'removed':'added';
   }catch{
    if(active&&epoch===generation){
     const remaining=new Set(snapshot.pending);remaining.delete(deal.id);
     const rows=snapshot.saved.filter(r=>r.dealId!==deal.id);if(old)rows.unshift(old);
     publish({...replaceRows(rows),pending:remaining,error:'That saved-find change failed. Your previous selection has been restored.'});
    }
    return 'error';
   }
  }
 };
}
