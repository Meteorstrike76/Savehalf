const test=require('node:test'),assert=require('node:assert/strict');
const code=require('esbuild').buildSync({entryPoints:['src/lib/favouritesStore.ts'],bundle:true,write:false,platform:'node',format:'cjs'}).outputFiles[0].text;
const mod={exports:{}};new Function('module','exports',code)(mod,mod.exports);
const {createFavouritesStore}=mod.exports;
const tick=()=>new Promise(r=>setImmediate(r));
const deferred=()=>{let resolve;const promise=new Promise(r=>{resolve=r;});return {promise,resolve};};
const deal={id:'a',title:'Fixture rice',discountPrice:2};
const row={id:'saved-a',dealId:'a',createdAt:'2026-11-06',deal};
test('B11 late User A reads cannot populate User B or signed-out state',async()=>{
 const slow=deferred(),a=createFavouritesStore({read:()=>slow.promise});a.start();a.stop();
 const b=createFavouritesStore({read:async()=>({data:[]})});b.start();
 const guest=createFavouritesStore(null);guest.start();
 slow.resolve({data:[row]});await tick();
 assert.equal(a.getSnapshot().saved.length,0);assert.equal(b.getSnapshot().saved.length,0);assert.equal(guest.getSnapshot().saved.length,0);
});
test('B11 read failures are explicit; rapid same-item toggles write once',async()=>{
 const broken=createFavouritesStore({read:async()=>({error:Error('offline')})});broken.start();await tick();assert.match(broken.getSnapshot().error,/could not be loaded/);
 const write=deferred();let calls=0;const store=createFavouritesStore({read:async()=>({data:[]}),add:()=>{calls++;return write.promise;}});store.start();await tick();
 const first=store.toggle(deal);assert.equal(await store.toggle(deal),'error');assert.equal(calls,1);assert(store.getSnapshot().pending.has('a'));
 write.resolve({});assert.equal(await first,'added');assert(!store.getSnapshot().pending.has('a'));
});
test('B11 rejected and thrown mutations restore state and show an error',async()=>{
 for(const remove of [async()=>({error:Error('denied')}),async()=>{throw Error('network');}]){
  const store=createFavouritesStore({read:async()=>({data:[row]}),remove});store.start();await tick();
  assert.equal(await store.toggle(deal),'error');assert(store.getSnapshot().ids.has('a'));assert.match(store.getSnapshot().error,/restored/);
 }
});
test('B11 restarting a StrictMode store invalidates earlier loads and writes',async()=>{
 const write=deferred();const store=createFavouritesStore({read:async()=>({data:[]}),add:()=>write.promise});
 store.start();await tick();const first=store.toggle(deal);store.stop();store.start();await tick();write.resolve({});
 assert.equal(await first,'error');assert.equal(store.getSnapshot().saved.length,0);
});
