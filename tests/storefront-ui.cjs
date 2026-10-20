// Run with SAVEHALF_JSDOM_PATH pointing to an installed jsdom package.
const {JSDOM,VirtualConsole}=require(process.env.SAVEHALF_JSDOM_PATH||'jsdom');
const fs=require('node:fs');const path=require('node:path');const assert=require('node:assert/strict');
const html=fs.readFileSync(path.join(__dirname,'../standalone-preview.html'),'utf8');
const vc=new VirtualConsole();vc.on('jsdomError',e=>{if(!e.message.includes('CSS stylesheet'))console.error(e.message);});
let downloads=0;
const dom=new JSDOM(html,{url:'https://example.test',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){w.fetch=global.fetch;w.Headers=global.Headers;w.Request=global.Request;w.Response=global.Response;w.URL.createObjectURL=()=>{downloads++;return 'blob:test';};w.URL.revokeObjectURL=()=>{};w.HTMLAnchorElement.prototype.click=()=>{};}});
dom.window.eval(html.match(/<script type="module">([\s\S]*?)<\/script>/)[1]);
const pause=()=>new Promise(r=>setTimeout(r,40));const doc=dom.window.document;
const button=t=>[...doc.querySelectorAll('button')].find(x=>x.textContent.trim()===t);
const setValue=(input,value)=>{Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype,'value').set.call(input,value);input.dispatchEvent(new dom.window.Event('input',{bubbles:true}));};
(async()=>{
 await new Promise(r=>setTimeout(r,200));assert.equal(doc.querySelectorAll('.community-links a').length,7);
 assert([...doc.querySelectorAll('.unit-price')].some(x=>x.textContent.includes('/ L')));
 button('Sign in').click();await pause();const email=doc.getElementById('email');
 for(const value of ['g','gaurab','gaurab@example.com']){setValue(email,value);await pause();assert.equal(doc.activeElement,email);assert.equal(email.value,value);}
 doc.querySelector('button[aria-label="Close"]').click();await pause();[...doc.querySelectorAll('.product-card')].find(x=>x.querySelector('.product-title').textContent.includes('Extra virgin olive oil')).querySelector('.list-add').click();await pause();
 doc.querySelector('[aria-label="Open shopping list"]').click();await pause();
 assert(doc.querySelector('.basket-item').textContent.includes('olive oil'));assert(doc.querySelector('.basket-summary').textContent.includes('$9.00'));
 const qty=doc.querySelector('.basket-quantity input');qty.focus();setValue(qty,'2');await pause();assert.equal(doc.activeElement,qty);assert(doc.querySelector('.basket-summary').textContent.includes('$18.00'));
 setValue(doc.querySelector('.basket-budget input'),'10');await pause();assert(doc.querySelector('.basket-status').textContent.includes('$8.00 over budget'));
 doc.querySelector('.basket-item input[type="checkbox"]').click();await pause();assert(doc.querySelector('.basket-summary').textContent.includes('$0.00'));
 button('Download CSV').click();assert.equal(downloads,1);assert.equal(JSON.parse(dom.window.localStorage.getItem('savehalf-shopping-v1'))[0].quantity,2);
 button('Remove bought items').click();await pause();assert.equal(doc.querySelectorAll('.basket-item').length,0);
 console.log('PASS: built UI retains email/quantity focus, shows unit prices, persists shopping list, calculates budget and bought totals, exports CSV, and includes seven community links');
 dom.window.close();
})().catch(e=>{console.error(e);dom.window.close();process.exitCode=1;});
