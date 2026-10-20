const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'savehalf-promotion-')),file=path.join(dir,'rules.cjs');
require('esbuild').buildSync({entryPoints:['src/lib/promotionFreshness.ts'],bundle:true,platform:'node',format:'cjs',outfile:file});const {promotionCurrent}=require(file);fs.rmSync(dir,{recursive:true});
test('Sydney Wednesday boundary excludes prior-week supermarket checks',()=>{
 const now=Date.parse('2026-10-13T13:00:00Z');
 assert.equal(promotionCurrent('Coles','2026-10-13T12:59:59Z',now),false);
 assert.equal(promotionCurrent('Coles','2026-10-13T13:00:00Z',now),true);
 assert.equal(promotionCurrent('Aldi','2026-10-13T12:59:59Z',now),true);
 assert.equal(promotionCurrent('Woolworths','bad',now),false);
 assert.equal(promotionCurrent('Coles','2026-10-14T13:00:00Z',now),false);
});
test('winter and daylight-saving Wednesday boundaries use Sydney dates',()=>{
 assert.equal(promotionCurrent('Coles','2026-07-14T13:59:59Z',Date.parse('2026-07-14T14:00:00Z')),false);
 assert.equal(promotionCurrent('Coles','2026-07-14T14:00:00Z',Date.parse('2026-07-14T14:00:00Z')),true);
 assert.equal(promotionCurrent('Coles','2026-10-06T13:00:00Z',Date.parse('2026-10-07T02:00:00Z')),true);
});
