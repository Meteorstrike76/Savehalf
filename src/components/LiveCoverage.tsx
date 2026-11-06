import {useEffect,useState} from 'react';
import {isConfigured} from '@/lib/supabase';
import {loadCatalogueCoverage} from '@/lib/catalogueCoverage';
import {STORE_IDS} from '@/lib/stores';
import {applyCoverageMetadata,coverageSummary,type CoverageRow} from '../../shared/coverage.mjs';

export default function LiveCoverage(){
 const [rows,setRows]=useState<CoverageRow[]|null>(null);
 useEffect(()=>{
  let active=true,generation=0;let expiry:ReturnType<typeof setTimeout>|undefined;
  const clear=()=>{setRows(null);applyCoverageMetadata(document,null);};
  const refresh=async()=>{
   const id=++generation;clearTimeout(expiry);clear();
   if(!isConfigured||document.visibilityState==='hidden')return;
   try {
    const {rows:data,expiresAt}=await loadCatalogueCoverage();
    if(expiresAt<=Date.now())throw Error('Coverage expired');
    if(!active||id!==generation)return;
    setRows(data);applyCoverageMetadata(document,data);
    expiry=setTimeout(()=>{if(active)clear();},expiresAt-Date.now());
   }catch{if(active&&id===generation)clear();}
  };
  void refresh();window.addEventListener('focus',refresh);document.addEventListener('visibilitychange',refresh);
  return()=>{active=false;++generation;clearTimeout(expiry);window.removeEventListener('focus',refresh);document.removeEventListener('visibilitychange',refresh);};
 },[]);
 const counts=rows===null?null:coverageSummary(rows);
 const summary=counts===null?null:STORE_IDS.map(store=>({store,products:counts.find(r=>r.store===store)?.products??0}));
 return <aside className="source-note" aria-label="Current retailer coverage" role="status">
  {summary===null?'Current direct catalogue coverage could not be verified.':<>
   <strong>Current direct catalogue: </strong>
   {summary.filter(r=>r.products>0).map(r=>`${r.store}: ${r.products}`).join(' · ')||'No fresh products.'}
   {summary.some(r=>r.products===0)&&<span> No fresh products: {summary.filter(r=>r.products===0).map(r=>r.store).join(', ')}.</span>}
  </>} <span>Counts cover freshness-filtered direct products, not provider listings or complete retailer catalogues.</span>
 </aside>;
}
