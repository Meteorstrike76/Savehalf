import {cachedRead} from './readCache';
import {supabase} from './supabase';
import {coverageSummary,type CoverageRow} from '../../shared/coverage.mjs';
export const COVERAGE_MAX_AGE=60000;
export function loadCatalogueCoverage(){
 return cachedRead('catalogue-counts-v3',async()=>{
  const expiresAt=Date.now()+COVERAGE_MAX_AGE;
  const {data,error}=await supabase.rpc('catalogue_counts').abortSignal(AbortSignal.timeout(5000));
  if(error)throw error;coverageSummary(data);
  return {rows:(data??[]) as (CoverageRow&{category:string;reductions:number})[],expiresAt};
 },COVERAGE_MAX_AGE);
}
