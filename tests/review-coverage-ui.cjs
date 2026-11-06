const {JSDOM,VirtualConsole}=require('jsdom'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const waitFor=require('./wait-for.cjs'),root=path.join(__dirname,'..');
const html=fs.readFileSync('dist/index.html','utf8'),script=html.match(/src="\/([^" ]+\.js)"/)[1];
const dom=new JSDOM(html,{url:'https://fixture.invalid',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:new VirtualConsole(),beforeParse(w){
 Object.assign(w,{Headers,Request,Response,AbortSignal});
 w.fetch=async input=>new Response(JSON.stringify(new URL(String(input)).pathname.endsWith('/rpc/catalogue_counts')?[{store:'Best & Less',category:'Fashion',products:24,reductions:24}]:[]),{headers:{'Content-Type':'application/json','Content-Range':'*/0'}});
}});
dom.window.eval(require('./production-bundle.cjs')(root,script));
(async()=>{
 await waitFor(()=>dom.window.document.querySelector('[aria-label="Current retailer coverage"]')?.textContent.includes('Best & Less: 24'),'live coverage');
 const doc=dom.window.document,panel=doc.querySelector('[aria-label="Current retailer coverage"]');
 assert(panel.textContent.includes('Best & Less: 24'));assert(panel.textContent.includes('No fresh products: Coles'));
 assert(!doc.title.includes('Coles'));
 assert(doc.querySelector('meta[property="og:title"]').content.includes('Best & Less'));
 console.log('PASS B02: visible live coverage and browser metadata share fresh counts');
 dom.window.close();
})().catch(e=>{console.error(e);dom.window.close();process.exitCode=1;});
