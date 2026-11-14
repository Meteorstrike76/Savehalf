const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const {JSDOM}=require('jsdom'),React=require('react'),{createRoot}=require('react-dom/client');
const code=require('esbuild').buildSync({entryPoints:['src/components/CatalogueAdvertisements.tsx'],tsconfig:'tsconfig.app.json',bundle:true,write:false,platform:'node',format:'cjs',external:['react','react/*']}).outputFiles[0].text;
test('actual catalogue component renders attributed source prices and hides expired rows while open',async()=>{
 const dom=new JSDOM('<div id="root"></div>',{url:'https://savehalf.test',pretendToBeVisual:true});
 const saved={window:global.window,document:global.document,IS_REACT_ACT_ENVIRONMENT:global.IS_REACT_ACT_ENVIRONMENT};
 global.window=dom.window;global.document=dom.window.document;global.IS_REACT_ACT_ENVIRONMENT=true;
 let now=Date.parse('2026-11-14T12:00:00Z'),tick;
 class Clock extends Date{static now(){return now;}}
 const ad={id:'Coles:123',store:'Coles',name:'Source product fixture',advertised_price:'15.00',price_text:'$15.00',image_url:null,source_url:'https://www.catalogueoffers.com.au/view/offers/coles-catalogue-1?offer=123#page=2',reference_price_text:'$22.00',region:null,valid_from_date:'2026-11-11',valid_through_date:'2026-11-17',visible_from:'2026-11-11T12:00:00Z',expires_at:'2026-11-17T10:00:00Z',checked_at:'2026-11-14T11:00:00Z',notice:'Confirm the price at checkout.'};
 const m={exports:{}};
 vm.runInNewContext(code,{module:m,exports:m.exports,require,Date:Clock,Number,URL,Set,AbortController,window:dom.window,document:dom.window.document,setTimeout,clearTimeout,setInterval:fn=>{tick=fn;return 1;},clearInterval(){},fetch:async()=>({ok:true,headers:new Headers(),text:async()=>JSON.stringify({schema_version:1,source:'CatalogueOffers',ads:[ad]})})});
 const root=createRoot(dom.window.document.getElementById('root'));
 try{
  await React.act(async()=>{root.render(React.createElement(m.exports.default));await new Promise(resolve=>setTimeout(resolve,0));});
  const text=dom.window.document.body.textContent;
  assert.match(text,/Source product fixture/);assert.match(text,/\$15\.00/);assert.match(text,/Region unverified/);assert.match(text,/comparison basis has not been verified/);assert.match(text,/Confirm the price at checkout/);assert.doesNotMatch(text,/% OFF|Save \$/);
  const link=dom.window.document.querySelector('a');assert.equal(link.href,ad.source_url);assert.equal(link.style.minHeight,'48px');
  const region=dom.window.document.querySelectorAll('select')[1];
  await React.act(async()=>{region.value='NSW';region.dispatchEvent(new dom.window.Event('change',{bubbles:true}));});
  assert.doesNotMatch(dom.window.document.body.textContent,/Source product fixture/);
  await React.act(async()=>{region.value='All';region.dispatchEvent(new dom.window.Event('change',{bubbles:true}));});
  now=Date.parse(ad.expires_at);await React.act(async()=>{tick();});
  assert.equal(dom.window.document.querySelector('section'),null);
 }finally{await React.act(async()=>root.unmount());dom.window.close();Object.assign(global,saved);}
});
