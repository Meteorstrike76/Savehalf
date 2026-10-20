import {robotsAllows} from './robots.mjs';
import {publicFailureMessage} from './recovery.mjs';
export const EXTRA_FEEDS=[['adorebeauty','Adore Beauty','adorebeauty.com.au'],['sephora','Sephora','sephora.com.au'],['mcdonalds',"McDonald's",'mcdonalds.com.au'],['kfc','KFC','kfc.com.au'],['hungryjacks',"Hungry Jack's",'hungryjacks.com.au'],['dominos',"Domino's",'dominos.com.au'],['subway','Subway','subway.com.au']].map(([key,label,domain],i)=>({key,label,url:`https://www.ozbargain.com.au/deals/${domain}/feed`,maxAgeHours:i>=2?48:168}));
export const COMMUNITY_FEEDS=[{key:'frontpage',label:'Front page',url:'https://www.ozbargain.com.au/feed'},{key:'coles',label:'Coles',url:'https://www.ozbargain.com.au/deals/coles.com.au/feed'},{key:'woolworths',label:'Woolworths',url:'https://www.ozbargain.com.au/deals/woolworths.com.au/feed'},...['priceline','chemistwarehouse','iga','officeworks'].map((key,i)=>({key,label:['Priceline','Chemist Warehouse','IGA','Officeworks'][i],url:`https://www.ozbargain.com.au/deals/${key}.com.au/feed`})),...EXTRA_FEEDS];
// Keep the existing four-request budget: robots + front page + two oldest due merchant feeds.
export function selectCommunityFeeds(previous,now=Date.now()){
 const due=COMMUNITY_FEEDS.filter(s=>{const old=previous.find(p=>p.feed_key===s.key);return !old?.retry_after||Date.parse(old.retry_after)<=now;});
 const age=s=>{const t=Date.parse(previous.find(p=>p.feed_key===s.key)?.checked_at||'');return Number.isFinite(t)?t:0;};
 const front=due.find(s=>s.key==='frontpage');
 return [...(front?[front]:[]),...due.filter(s=>s.key!=='frontpage').sort((a,b)=>age(a)-age(b)).slice(0,front?2:3)];
}
export function decodeXml(s){return String(s||'').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1').replace(/&#(x[0-9a-f]+|\d+);|&(amp|lt|gt|quot|apos);/gi,(m,n,k)=>{if(n){const v=n[0].toLowerCase()==='x'?parseInt(n.slice(1),16):Number(n);return v>0&&v<=0x10ffff&&!(v>=0xd800&&v<=0xdfff)?String.fromCodePoint(v):'';}return {amp:'&',lt:'<',gt:'>',quot:'"',apos:"'"}[k.toLowerCase()];});}
const clean=s=>decodeXml(s).replace(/<[^>]*>/g,' ').replace(/[\u0000-\u001f]/g,' ').replace(/\s+/g,' ').trim();
const url=(s,host)=>{try{const u=new URL(decodeXml(s));return u.protocol==='https:'&&!u.username&&!u.password&&u.href.length<=2000&&(!host||u.hostname===host)?u.href:null;}catch{return null;}};
export function parseCommunity(xml,now=Date.now(),maxAgeHours=168){
 if(/<!DOCTYPE|<!ENTITY/i.test(xml)||!/<rss\b/i.test(xml)||!/<channel>/i.test(xml))throw Error('RSS format changed; no HTML imported');
 const posts=[];for(const match of String(xml).matchAll(/<item>([\s\S]*?)<\/item>/gi)){
  const item=match[1],tag=name=>item.match(new RegExp('<'+name+'(?:\\s[^>]*)?>([\\s\\S]*?)<\\/'+name+'>','i'))?.[1]||'';
  const postUrl=url(tag('link'),'www.ozbargain.com.au');if(!postUrl||!/^\/node\/\d+$/.test(new URL(postUrl).pathname))continue;
  const title=clean(tag('title')).slice(0,300),published=new Date(clean(tag('pubDate'))).getTime();if(!title||!Number.isFinite(published)||published>now+300000||published<now-7*86400000)continue;
  const meta=item.match(/<ozb:meta\b([^>]*)\/?\s*>/i)?.[1]||'',attrs=Object.fromEntries([...meta.matchAll(/([\w-]+)=["']([^"']*)["']/g)].map(m=>[m[1],decodeXml(m[2])]));
  const expires=attrs.expiry?Date.parse(attrs.expiry):NaN;if(attrs.expired==='1'||attrs.expired==='true'||Number.isFinite(expires)&&expires<=now)continue;
  if(!Number.isFinite(expires)&&published<now-maxAgeHours*3600000)continue;
  const count=k=>Math.min(100000,Math.max(0,Math.trunc(Number(attrs[k])||0)));
  const category=clean(item.match(/<category\s+domain=["']https:\/\/www\.ozbargain\.com\.au\/cat\/[^"']+["']>([\s\S]*?)<\/category>/i)?.[1]||'Community').slice(0,80);
  const wording=clean(tag('description'));const notes=[];if(/targeted|eligible|eligibility|selected account/i.test(title+' '+wording))notes.push('Check eligibility');if(/member|subscription|coupon|code|min(?:imum)? spend/i.test(title+' '+wording))notes.push('Conditions mentioned');if(/\bapp\b|mymacca|subcard/i.test(title+' '+wording))notes.push('App mentioned');if(/pickup|pick.up|delivery|participating|selected stores|surcharge/i.test(title+' '+wording))notes.push('Check store and fulfilment');
  posts.push({id:new URL(postUrl).pathname.split('/').pop(),title,post_url:postUrl,merchant_url:url(attrs.url),category,published_at:new Date(published).toISOString(),expires_at:Number.isFinite(expires)?new Date(expires).toISOString():null,votes_up:count('votes-pos'),votes_down:count('votes-neg'),comments:count('comment-count'),notes});
 }
 return [...new Map(posts.map(p=>[p.id,p])).values()].slice(0,20);
}
export async function collectCommunity({api,headers,get}){
 const state=await fetch(api+'/community_feeds?select=*',{headers,signal:AbortSignal.timeout(12000)});if(!state.ok)throw Error('Could not read community feed state');const previous=await state.json();
 const robots=(await get('https://www.ozbargain.com.au/robots.txt')).text;let updated=0,changed=0,total=0;
 for(const source of selectCommunityFeeds(previous)){const old=previous.find(x=>x.feed_key===source.key);if(old?.retry_after&&Date.parse(old.retry_after)>Date.now())continue;
  const now=new Date().toISOString();try{
   if(!robotsAllows(robots,source.url))throw Error('RSS robots policy requires review');
   const conditional={};if(old?.etag)conditional['If-None-Match']=old.etag;else if(old?.modified)conditional['If-Modified-Since']=old.modified;
   const response=await get(source.url,{headers:conditional});if(response.status===304&&!old?.last_success_at)throw Error('Feed returned unchanged without a saved snapshot');
   const items=response.status===304?old.items:parseCommunity(response.text,Date.now(),source.maxAgeHours||168);
   const patch={feed_key:source.key,label:source.label,source_url:source.url,status:'ok',message:response.status===304?'Publisher reports no changes':'RSS headlines checked',items,checked_at:now,last_success_at:now,etag:response.etag||(response.status===304?old?.etag:null)||null,modified:response.modified||(response.status===304?old?.modified:null)||null,failure_count:0,retry_after:null};
   const saved=await fetch(api+'/community_feeds?on_conflict=feed_key',{method:'POST',headers:{...headers,Prefer:'resolution=merge-duplicates'},body:JSON.stringify(patch),signal:AbortSignal.timeout(12000)});if(!saved.ok)throw Error('Could not save community feed');updated++;if(response.status!==304)changed++;total+=items.length;
  }catch(e){const failures=Math.min(6,(old?.failure_count||0)+1);const patch={feed_key:source.key,label:source.label,source_url:source.url,status:'failed',message:publicFailureMessage(e,'RSS fetch').slice(0,160),checked_at:now,failure_count:failures,retry_after:new Date(Date.now()+Math.min(360,15*2**failures)*60000).toISOString()};const saved=await fetch(api+'/community_feeds?on_conflict=feed_key',{method:'POST',headers:{...headers,Prefer:'resolution=merge-duplicates'},body:JSON.stringify(patch),signal:AbortSignal.timeout(12000)});if(!saved.ok)throw Error('Could not record community feed failure');}
 }
 if(!updated)throw Error('Community feeds unavailable or paused; previous snapshots were not refreshed');
 return {saved:total,message:`${updated} feeds checked; ${changed} changed. Headlines link to original posts; retailer prices are not verified.`};
}
