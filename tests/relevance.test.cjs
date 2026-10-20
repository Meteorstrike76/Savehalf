const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'savehalf-relevance-'));
function compiled(name){const p=path.join(dir,name+'.cjs');require('esbuild').buildSync({entryPoints:['src/lib/'+name+'.ts'],bundle:true,platform:'node',format:'cjs',outfile:p});return require(p);}
const {regionHint,matchesRegion}=compiled('offerRegions'),{offerSignals}=compiled('offerPreferences'),{refineLoaded}=compiled('discovery'),{validateBackup}=compiled('backup');fs.rmSync(dir,{recursive:true});
test('location hints use explicit evidence and preserve unknown availability',()=>{
 assert.equal(regionHint('[WA, QLD] Pizza $5').kind,'interstate');
 assert.equal(regionHint('[NSW/VIC] Lunch $10').kind,'nsw');
 assert.equal(regionHint('[Sydney] Lunch $10').kind,'nsw');
 assert.equal(regionHint('National stores (Excl. NSW) deal').kind,'interstate');
 assert.equal(regionHint('All states except NSW, VIC').kind,'interstate');
 assert.equal(regionHint('Nationwide lunch').kind,'national');
 assert.equal(regionHint('New Sydney brand launch').kind,'unknown');
 assert.equal(regionHint('[App] Pizza').kind,'unknown');
 assert(matchesRegion('Pizza','Hide clearly interstate offers'));
 assert(!matchesRegion('Pizza','NSW or national mentions'));
 assert(!matchesRegion('[WA, QLD] Pizza','Hide clearly interstate offers'));
});
test('new conditions are hints and do not infer prices or eligibility',()=>{
 const s=offerSignals({title:'New accounts only; app required; minimum spend $20; pickup only',notes:[]});
 for(const type of ['app','new customer','minimum spend','pickup only'])assert(s.includes(type));
 assert.deepEqual(offerSignals({title:'Apples 1kg $3',notes:[]}),[]);
});
test('followed words filter loaded titles, exclusions win and sorting does not mutate the catalogue',()=>{
 const rows=[{id:'a',title:'Brand coffee',discountPrice:3},{id:'b',title:'Other tea',discountPrice:2}];const f={hidden:[],photos:false,fresh:false,exclude:'',order:'default',follow:'brand',matchedOnly:true};
 assert.deepEqual(refineLoaded(rows,f).map(x=>x.id),['a']);
 assert.deepEqual(refineLoaded(rows,{...f,exclude:'coffee'}),[]);
 assert.deepEqual(refineLoaded(rows,{...f,follow:''}),[]);
 assert.equal(rows.length,2);
});
test('device backups validate catalogue title preferences and accept older preferences',()=>{
 const base={stores:['Coles'],category:'All'};
 assert.doesNotThrow(()=>validateBackup({version:1,data:{'savehalf-browse-preferences-v1':base}}));
 assert.doesNotThrow(()=>validateBackup({version:1,data:{'savehalf-browse-preferences-v1':{...base,followedWords:'coffee',excludedWords:'decaf'}}}));
 for(const followedWords of [[],5,'x'.repeat(101)])assert.throws(()=>validateBackup({version:1,data:{'savehalf-browse-preferences-v1':{...base,followedWords}}}));
});
