// Import freshly obtained WhichGrocer page JSON; never extracts connector credentials.
import {readFile} from 'node:fs/promises';import {createClient} from '@supabase/supabase-js';import {providerRows,projectedProviderCount} from './lib/whichgrocer.mjs';
const file=process.argv[2];if(!file)throw Error('Usage: node scraper/src/whichgrocer-import.mjs pages.json [--publish]');const pages=JSON.parse(await readFile(file,'utf8'));const rows=providerRows(pages);
console.log(`${rows.length} eligible catalogue snapshots; no retailer was-prices inferred.`);
if(process.argv.includes('--publish')){
 if(!rows.length)throw Error('Empty import held for review');
 const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!url||!key)throw Error('Server-only Supabase environment required');
 const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});const {count,error}=await db.from('provider_products').select('id',{count:'exact',head:true});if(error)throw Error('Cannot check snapshot budget');const existing=await db.from('provider_products').select('id').in('id',rows.map(p=>p.id)).limit(200);if(existing.error)throw Error('Cannot check existing snapshot IDs');if(projectedProviderCount(count||0,rows,(existing.data||[]).map(p=>p.id))>1000)throw Error('Conservative 1000-row budget requires retention review');
 const result=await db.from('provider_products').upsert(rows.map(p=>({...p,retrieved_at:new Date().toISOString()})),{onConflict:'id'});if(result.error)throw Error('Provider upsert failed');console.log('Imported provider snapshots. Direct collector health was not changed.');
}
