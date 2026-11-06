const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {JSDOM}=require('jsdom');
const html=fs.readFileSync('index.html','utf8');
const live=[{store:'Best & Less',products:24},{store:'Coles',products:0}];
test('B02 SSR metadata uses only stores with fresh products, escapes HTML',async()=>{
 const {storefrontHtml}=await import('../api/storefront.mjs');
 let calls=0;
 const output=await storefrontHtml(html,{url:'https://fixture.invalid',key:'public-fixture',fetcher:async(url,init)=>{
  calls++;assert.equal(url.pathname,'/rest/v1/rpc/catalogue_counts');assert(!init.body);
  return new Response(JSON.stringify(live));
 }});
 const doc=new JSDOM(output).window.document;
 for(const value of [doc.title,...[...doc.querySelectorAll('meta[name="description"],meta[property="og:title"],meta[property="og:description"]')].map(x=>x.content)]) {
  assert(value.includes('Best & Less'));assert(!value.includes('Coles'));
 }
 assert(output.includes('Best &amp; Less'));assert.equal(calls,1);
});
test('B02 unknown, failed, invalid and empty coverage fail closed without store names',async()=>{
 const {storefrontHtml}=await import('../api/storefront.mjs');
 for(const fetcher of [async()=>{throw Error('offline');},async()=>new Response('{}'),async()=>new Response('[]'),async()=>new Response('error',{status:503})]) {
  const doc=new JSDOM(await storefrontHtml(html,{url:'https://fixture.invalid',key:'fixture',fetcher})).window.document;
  assert(!/Coles|Best & Less/.test(doc.title));assert(doc.title.includes('source checks'));
 }
});
test('B02 browser metadata changes with coverage instead of retaining vanished stores',async()=>{
 const {applyCoverageMetadata}=await import('../shared/coverage.mjs');
 const doc=new JSDOM(html).window.document;
 applyCoverageMetadata(doc,live);assert(doc.title.includes('Best & Less'));
 applyCoverageMetadata(doc,[{store:'Aldi',products:8}]);assert(doc.title.includes('Aldi'));assert(!doc.title.includes('Best & Less'));
 applyCoverageMetadata(doc,null);assert(!doc.title.includes('Aldi'));
});
