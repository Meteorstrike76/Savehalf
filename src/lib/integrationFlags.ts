import {supabase,isConfigured} from './supabase';
export type FeatureFlags=Record<string,{enabled:boolean;public_config:Record<string,unknown>}>;
let cache:{expires:number;value:FeatureFlags}|null=null;
export async function getFeatureFlags():Promise<FeatureFlags>{if(cache&&cache.expires>Date.now())return cache.value;if(!isConfigured)return {};try{const {data,error}=await supabase.from('feature_flags').select('key,enabled,public_config').limit(5);if(error)return {};const value=Object.fromEntries((data||[]).map(r=>[r.key,r]));cache={value,expires:Date.now()+30000};return value;}catch{return {};}}
