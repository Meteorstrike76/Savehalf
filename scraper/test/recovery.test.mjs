import test from 'node:test';
import assert from 'node:assert/strict';
import {getResource,collect} from '../../supabase/functions/catalogue-collect/http-collect.mjs';
import {CollectionError,listingFailure,retryAfter,diagnostic,publicFailureMessage} from '../../supabase/functions/catalogue-collect/recovery.mjs';
test('access and rate-limit failures retain safe diagnostics and bounded Retry-After',async()=>{
 const old=global.fetch;
 try{global.fetch=async()=>new Response('blocked',{status:403});await assert.rejects(getResource('https://www.woolworths.com.au/shop/catalogue'),e=>e.kind==='access'&&e.httpStatus===403);
 global.fetch=async()=>new Response('limited',{status:429,headers:{'Retry-After':'600'}});await assert.rejects(getResource('https://www.coles.com.au/on-special'),e=>e.kind==='rate_limit'&&e.retryAfterSeconds===600);
 }finally{global.fetch=old;}
 assert.equal(retryAfter('99999999'),172800);assert.equal(retryAfter('bad'),null);
 const e=listingFailure([{status:'rejected',reason:new CollectionError('secret URL','access',403)}],['/sale?token=secret']);assert.equal(e.diagnostics[0].path,'/sale');assert(!JSON.stringify(e.diagnostics).includes('secret'));
});
test('robots URL in a transport error is not a policy refusal and internals stay private',()=>{
 const e=Error('error sending request from 10.32.4.135:55560 for https://www.bigw.com.au/robots.txt: http2 stream error');
 assert.equal(diagnostic(e,'fetch','/robots.txt').kind,'transport');
 assert(!publicFailureMessage(e).includes('10.32'));
 assert(!publicFailureMessage(e).includes('https://'));
 assert.equal(diagnostic(Error('Robots policy requires review'),'robots','/robots.txt').kind,'policy');
});
test('HTTP/1 client is scoped to the observed BIG W transport failure',async()=>{
 const oldFetch=global.fetch,oldDeno=globalThis.Deno;let created=0;
 globalThis.Deno={createHttpClient:options=>{assert.deepEqual(options,{http1:true,http2:false});created++;return {test:true};}};
 try{
 global.fetch=async(url,options)=>{assert.equal(Boolean(options.client),new URL(url).hostname==='www.bigw.com.au');assert.equal(options.redirect,'error');return new Response('ok');};
 await getResource('https://www.bigw.com.au/robots.txt');await getResource('https://www.coles.com.au/robots.txt');assert.equal(created,1);
 global.fetch=async()=>{throw Error('internal address 10.0.0.1');};await assert.rejects(getResource('https://www.coles.com.au/robots.txt'),e=>e.kind==='transport'&&!e.message.includes('10.0'));
 }finally{global.fetch=oldFetch;if(oldDeno===undefined)delete globalThis.Deno;else globalThis.Deno=oldDeno;}
});
test('generic collectors stop for policy and preserve listing HTTP failures',async()=>{
 let calls=0;await assert.rejects(collect('Kmart',async()=>{calls++;return 'User-agent: *\nDisallow: /category/';}),e=>e.kind==='policy');assert.equal(calls,1);
 await assert.rejects(collect('Target',async u=>{if(u.endsWith('robots.txt'))return 'User-agent: *\nAllow: /';throw new CollectionError('HTTP 403','access',403);}),e=>e.kind==='access'&&e.diagnostics[0].stage==='listing');
});
test('request diagnostics identify robots versus feed failure and strip query secrets',async()=>{
 const original=global.fetch;
 try{global.fetch=async()=>new Response('denied',{status:403});
 for(const path of ['/robots.txt','/feed?token=private']){
  try{await getResource('https://www.ozbargain.com.au'+path);assert.fail('Expected failure');}catch(e){const d=diagnostic(e,'fetch','/');assert.equal(d.path,path.split('?')[0]);assert.equal(d.http_status,403);assert(!JSON.stringify(d).includes('private'));}
 }
 }finally{global.fetch=original;}
});
