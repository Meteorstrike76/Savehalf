import {readFile} from 'node:fs/promises';
import {renderCoverageMetadata} from '../shared/coverage.mjs';

// GET calls a STABLE, SECURITY INVOKER aggregate over current_deals. Never use a
// service key or forward visitor cookies/tokens to Supabase for public metadata.
export async function storefrontHtml(html, {url,key,fetcher=fetch}) {
 let rows=null;
 try {
  if(url&&key) {
   const response=await fetcher(new URL('/rest/v1/rpc/catalogue_counts',url),{
    headers:{apikey:key,Authorization:`Bearer ${key}`},signal:AbortSignal.timeout(3000)
   });
   if(!response.ok)throw Error('Coverage unavailable');
   const body=await response.text();if(body.length>32768)throw Error('Coverage too large');
   rows=JSON.parse(body);
  }
  return renderCoverageMetadata(html,rows);
 } catch { return renderCoverageMetadata(html,null); }
}
export default async function handler(req,res) {
 if(!['GET','HEAD'].includes(req.method)) {res.setHeader('Allow','GET, HEAD');res.statusCode=405;res.end();return;}
 const html=await readFile(new URL('../dist/index.html',import.meta.url),'utf8');
 const body=await storefrontHtml(html,{url:process.env.VITE_SUPABASE_URL,key:process.env.VITE_SUPABASE_ANON_KEY});
 res.setHeader('Content-Type','text/html; charset=utf-8');
 // No stale store claims and no caching of auth callback query strings.
 res.setHeader('Cache-Control','private, no-store');
 res.setHeader('Vercel-CDN-Cache-Control','no-store');
 res.statusCode=200;res.end(req.method==='HEAD'?undefined:body);
}
