// No connector credentials: import explicitly captured public page data only.
import {readFile,stat} from 'node:fs/promises';
import {providerRows} from './lib/whichgrocer.mjs';
import {prepareProviderSnapshot,publishProviderSnapshot,boundedProviderFetch} from './lib/provider-import.mjs';

const file=process.argv[2],args=process.argv.slice(3);
if(!file||args.some(a=>a!=='--publish'))throw Error('Usage: node scraper/src/whichgrocer-import.mjs capture.json [--publish]');
if((await stat(file)).size>2*1024*1024)throw Error('Provider capture exceeds the 2 MiB import limit');
const input=JSON.parse(await readFile(file,'utf8')),publish=args.includes('--publish');
// Existing raw pages.json exports remain previewable; publishing needs the
// original capture timestamp. Never guess it from file mtime or import time.
if(Array.isArray(input)&&!publish){
 const rows=providerRows(input);
 console.log(`${rows.length} eligible catalogue snapshots; preview only. Publishing requires a retrieved_at/pages capture envelope.`);
}else{
 const now=Date.now(),plan=prepareProviderSnapshot(input,now);
 console.log(`${plan.accepted}/${plan.received} eligible snapshots; ${plan.rejected_or_duplicate} rejected or duplicate. Original retrieval: ${plan.retrieved_at}. No retailer was-prices inferred.`);
 if(publish){
  const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!key)throw Error('Server-only Supabase environment required');
  const {createClient}=await import('@supabase/supabase-js');
  const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:boundedProviderFetch()}});
  const result=await publishProviderSnapshot(input,db,now);
  console.log(`${result.published} provider snapshots imported with original retrieval time; ${result.skipped_newer} newer stored snapshots preserved. Direct collector health was not changed.`);
 }
}
