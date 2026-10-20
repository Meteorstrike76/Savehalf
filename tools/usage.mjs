// Maintainer-only: never import this script in the frontend.
import fs from 'node:fs';
import {renderUsage} from './render-usage.mjs';
import {createClient} from '@supabase/supabase-js';
const {SUPABASE_URL:url,SUPABASE_SERVICE_ROLE_KEY:key}=process.env;if(!url||!key)throw Error('Use service-role credentials in your local shell or GitHub secrets.');
const sb=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});const {data,error}=await sb.rpc('pipeline_metrics');if(error)throw Error('Usage query failed');
console.log(JSON.stringify({...data,warning:data.database_bytes>=60*1048576?'CRITICAL: approaching internal 64 MiB collection stop':data.database_bytes>=50*1048576?'Warning: approaching internal collection cap':'Within internal 64 MiB collector cap; platform free cap is 500 MB',egress:'Not exposed by this SQL metric. Use measured payload × traffic and Supabase usage dashboard.'},null,2));

const output=process.argv.find(a=>a.startsWith("--html="))?.slice(7);if(output)fs.writeFileSync(output,renderUsage(data));
