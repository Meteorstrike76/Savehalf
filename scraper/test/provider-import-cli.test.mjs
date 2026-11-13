import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';

const cli=new URL('../src/whichgrocer-import.mjs',import.meta.url);
const product={id:'priceline_fixture',name:'Fixture shampoo',store:'priceline',price:4.5,currency:'AUD',out_of_stock:false,url:'https://www.priceline.com.au/product/fixture',updated_at:new Date(Date.now()-86400000).toISOString()};
function invoke(content,args=[]){
 const dir=mkdtempSync(join(tmpdir(),'provider-import-')),file=join(dir,'capture.json');
 try{
  writeFileSync(file,typeof content==='string'?content:JSON.stringify(content));
  return spawnSync(process.execPath,[cli.pathname,file,...args],{encoding:'utf8',timeout:5000,env:{...process.env,SUPABASE_URL:'',SUPABASE_SERVICE_ROLE_KEY:''}});
 }finally{rmSync(dir,{recursive:true,force:true});}
}
test('actual CLI previews raw exports but refuses to publish them without capture provenance',()=>{
 const raw=[{data:[product]}],preview=invoke(raw);assert.equal(preview.status,0);assert.match(preview.stdout,/1 eligible.*preview only/);
 const publish=invoke(raw,['--publish']);assert.notEqual(publish.status,0);assert.match(publish.stderr,/capture envelope/);
});
test('actual CLI preserves capture time in preview and enforces file/flag bounds',()=>{
 const retrieved_at=new Date(Date.now()-60000).toISOString();
 const preview=invoke({retrieved_at,pages:[{data:[product]}]});assert.equal(preview.status,0);assert(preview.stdout.includes(retrieved_at));
 const tooLarge=invoke('x'.repeat(2*1024*1024+1));assert.notEqual(tooLarge.status,0);assert.match(tooLarge.stderr,/2 MiB/);
 const force=invoke([{data:[product]}],['--force']);assert.notEqual(force.status,0);assert.match(force.stderr,/Usage:/);
});
