import test from 'node:test';
import assert from 'node:assert/strict';
import {collect,getResource} from '../src/lib/http-collect.mjs';
import {diagnostic,publicFailureMessage} from '../src/lib/recovery.mjs';

test('Big W permission pause also blocks the mirrored Node collector',async()=>{
 let requests=0;await assert.rejects(collect('Big W',async()=>{requests++;return '';}),e=>e.kind==='policy');assert.equal(requests,0);
});

test('robots transport failures distinguish DNS, TLS, timeout, refused and unknown without exposing internals',async()=>{
 const previous=global.fetch;
 try{
  for(const [error,reason] of [
   [new TypeError('fetch failed',{cause:Object.assign(Error('private-host 10.0.0.1'),{code:'ENOTFOUND'})}),'dns'],
   [Object.assign(Error('invalid peer certificate at private-host'),{code:'CERT_HAS_EXPIRED'}),'tls'],
   [Object.assign(Error('private-host'),{name:'TimeoutError'}),'timeout'],
   [Object.assign(Error('10.0.0.1'),{code:'ECONNREFUSED'}),'refused'],
   [Error('http2 stream error from private-host'),'other'],
  ]){
   global.fetch=async()=>{throw error;};
   await assert.rejects(getResource('https://www.bigw.com.au/robots.txt?private=secret'),e=>{
    const d=diagnostic(e,'fetch','/');
    assert.equal(d.kind,'transport');assert.equal(d.transport_reason,reason);
    assert.equal(d.stage,'robots');assert.equal(d.path,'/robots.txt');assert.equal(d.http_status,null);
    assert(!/private|10\.0|secret/.test(JSON.stringify(d)+e.message+publicFailureMessage(e)));
    return true;
   });
  }
 }finally{global.fetch=previous;}
});
test('stream failure after received bytes retains HTTP status and read-body stage',async()=>{
 const previous=global.fetch;let reads=0;
 global.fetch=async()=>new Response(new ReadableStream({pull(controller){if(reads++===0)controller.enqueue(new Uint8Array([1,2]));else controller.error(Object.assign(Error('private host'),{code:'ECONNRESET'}));}}));
 const budget={used:0,limit:100};
 try{await assert.rejects(getResource('https://www.aldi.com.au/products/test',budget),e=>{
  const d=diagnostic(e,'fetch','/');assert.equal(budget.used,2);assert.equal(d.http_status,200);assert.equal(d.stage,'read_body');assert.equal(d.kind,'transport');return true;
 });}finally{global.fetch=previous;}
});
test('declared oversized body is a budget guard with HTTP status, not upstream',async()=>{
 const previous=global.fetch;let cancelled=false;
 global.fetch=async()=>new Response(new ReadableStream({cancel(){cancelled=true;}}),{headers:{'content-length':'3500001'}});
 try{await assert.rejects(getResource('https://www.aldi.com.au/products/test'),e=>{
  const d=diagnostic(e,'fetch','/');assert.equal(d.kind,'budget');assert.equal(d.http_status,200);assert.equal(d.stage,'read_body');assert(cancelled);return true;
 });}finally{global.fetch=previous;}
});
