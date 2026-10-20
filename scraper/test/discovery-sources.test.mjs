import test from 'node:test';import assert from 'node:assert/strict';
import {colesPage,wooliesPage,collectSupermarket} from '../../supabase/functions/catalogue-collect/supermarkets.mjs';
import {parseCommunity,collectCommunity} from '../../supabase/functions/catalogue-collect/community.mjs';
import {robotsAllows} from '../../supabase/functions/catalogue-collect/robots.mjs';
const now=Date.parse('2026-10-12T00:00:00Z');
const item=(id,extra='')=>`<item><title>Coffee &amp; tea</title><link>https://www.ozbargain.com.au/node/${id}</link><pubDate>Sun, 11 Oct 2026 20:00:00 GMT</pubDate><category domain="https://www.ozbargain.com.au/cat/food-grocery">Food &amp; Grocery</category><description><![CDATA[Targeted member offer <script>bad()</script>]]></description><ozb:meta votes-pos="20" votes-neg="1" comment-count="5" ${extra}/></item>`;
test('RSS rejects external entities, expired posts and unsafe links; deduplicates and stores attribution without article text',()=>{const posts=parseCommunity(`<rss><channel>${item(1)}${item(1)}${item(2,'expiry="2026-10-11T00:00:00Z"')}${item(3).replace('https://www.ozbargain.com.au/node/3','javascript:alert(1)')}</channel></rss>`,now);assert.equal(posts.length,1);assert.equal(posts[0].title,'Coffee & tea');assert.equal(posts[0].category,'Food & Grocery');assert.deepEqual(posts[0].notes,['Check eligibility','Conditions mentioned']);assert(!JSON.stringify(posts).includes('bad()'));assert.throws(()=>parseCommunity('<!DOCTYPE rss><rss><channel></channel></rss>',now));});
test('robots longest Allow wins and restricted paths remain blocked',()=>{const robots='User-agent: *\nDisallow: *?filter_Special=*\nAllow: /on-special?filter_Special=halfprice\nDisallow: /goto/\nUser-agent: AhrefsBot\nDisallow: /';assert(robotsAllows(robots,'https://www.coles.com.au/on-special?filter_Special=halfprice&page=2'));assert(!robotsAllows(robots,'https://www.coles.com.au/on-special?filter_Special=other'));assert(!robotsAllows(robots,'https://www.ozbargain.com.au/goto/123'));assert(robotsAllows(robots,'https://www.ozbargain.com.au/feed'));});
const product={_type:'PRODUCT',id:12345,name:'Coffee',brand:'Test',size:'200g',availability:true,pricing:{now:5,was:10},imageUris:[{type:'default',uri:'/1/12345.jpg'}]};
const page=(products,start=0)=>`<script id="__NEXT_DATA__">${JSON.stringify({props:{pageProps:{searchResults:{results:products,start,pageSize:48,noOfResults:96}}}})}</script>`;
test('Coles accepts exact half-price products and rejects conditional, unavailable and rounded discounts',()=>{const parsed=colesPage(page([product,{...product,availability:false},{...product,pricing:{now:5.01,was:10}},{...product,pricing:{now:5,was:10,multiBuyPromotion:{}}}]));assert.equal(parsed.rows.length,1);assert.equal(parsed.rows[0].discount_price,5);assert.equal(parsed.rows[0].original_price,10);assert.equal(parsed.rows[0].image_url,'https://productimages.coles.com.au/productimages/1/12345.jpg');});
test('Supermarket collector quarantines unexpected pagination instead of pretending later pages were fetched',async()=>{let n=0;await assert.rejects(()=>collectSupermarket('Coles',async u=>u.endsWith('robots.txt')?'User-agent: *\nAllow: /':(n++,page([product]))),/pagination/);assert.equal(n,2);});
test('Woolworths requires explicit ordinary half-price and excludes marketplace/members',()=>{const p={Stockcode:12345,Name:'Coffee',Price:5,WasPrice:10};assert.equal(wooliesPage({Bundles:[{Products:[p,{...p,IsMarketProduct:true},{...p,IsMemberPrice:true},{...p,Price:5.01}]}]}).rows.length,1);assert.throws(()=>wooliesPage({message:'blocked'}));});
test('RSS 304 reuses saved snapshot and validators; no article fetches',async()=>{const oldFetch=global.fetch;const patches=[],requests=[];const old={feed_key:'frontpage',last_success_at:'2026-10-12T00:00:00Z',items:[],etag:'"version1"'};global.fetch=async(u,o)=>{if(!o.method)return new Response(JSON.stringify([old]));patches.push(JSON.parse(o.body));return new Response('',{status:201});};try{const r=await collectCommunity({api:'https://db.test',headers:{},get:async(u,o)=>{requests.push(u);if(u.endsWith('robots.txt'))return {text:'User-agent: *\nAllow: /'};if(u.endsWith('/feed')&&!u.includes('/deals/')){assert.equal(o.headers['If-None-Match'],'"version1"');return {status:304};}return {status:200,text:`<rss><channel>${item(4)}</channel></rss>`};}});assert.equal(requests.length,4);assert.equal(r.saved>=0,true);assert.equal(patches[0].etag,'"version1"');assert.deepEqual(patches[0].items,[]);}finally{global.fetch=oldFetch;}});

test('merchant feeds rotate oldest first without exceeding the existing request budget',async()=>{
 const {COMMUNITY_FEEDS,selectCommunityFeeds}=await import('../../supabase/functions/catalogue-collect/community.mjs');
 assert.equal(COMMUNITY_FEEDS.length,14);
 const initial=selectCommunityFeeds([],now);assert.deepEqual(initial.map(s=>s.key),['frontpage','coles','woolworths']);
 const previous=initial.map(s=>({feed_key:s.key,checked_at:new Date(now).toISOString()}));
 assert.deepEqual(selectCommunityFeeds(previous,now).map(s=>s.key),['frontpage','priceline','chemistwarehouse']);
 previous.push(...['priceline','chemistwarehouse'].map(feed_key=>({feed_key,checked_at:new Date(now+1).toISOString()})));
 assert.deepEqual(selectCommunityFeeds(previous,now+2).map(s=>s.key),['frontpage','iga','officeworks']);
 const paused=COMMUNITY_FEEDS.map(s=>({feed_key:s.key,retry_after:new Date(now+60000).toISOString()}));
 assert.equal(selectCommunityFeeds(paused,now).length,0);
});

test('food headlines without expiry expire after 48 hours and retain app and fulfilment hints',()=>{
 const dated=item(8).replace('Sun, 11 Oct 2026 20:00:00 GMT','Fri, 09 Oct 2026 20:00:00 GMT');
 const rss=i=>`<rss><channel>${i}</channel></rss>`;
 assert.equal(parseCommunity(rss(dated),now,48).length,0);
 assert.equal(parseCommunity(rss(dated),now,168).length,1);
 const known=dated.replace('<ozb:meta','<ozb:meta expiry="2026-10-13T00:00:00Z"');
 assert.equal(parseCommunity(rss(known),now,48).length,1);
 const recent=item(9).replace('Coffee &amp; tea','App pickup meal at participating stores');
 assert(parseCommunity(rss(recent),now,48)[0].notes.includes('App mentioned'));
 assert(parseCommunity(rss(recent),now,48)[0].notes.includes('Check store and fulfilment'));
});

test('all thirteen merchants get a turn in seven healthy runs without raising the request ceiling',async()=>{
 const {COMMUNITY_FEEDS,selectCommunityFeeds}=await import('../../supabase/functions/catalogue-collect/community.mjs');
 const previous=[],seen=new Set();
 for(let run=0;run<7;run++){
  const selected=selectCommunityFeeds(previous,now+run);assert(selected.length<=3);
  for(const s of selected){seen.add(s.key);const old=previous.find(p=>p.feed_key===s.key);if(old)old.checked_at=new Date(now+run).toISOString();else previous.push({feed_key:s.key,checked_at:new Date(now+run).toISOString()});}
 }
 assert.deepEqual([...seen].sort(),COMMUNITY_FEEDS.map(s=>s.key).sort());
});
test('valid empty RSS succeeds while merchant failures stay isolated within four requests',async()=>{
 const oldFetch=global.fetch,patches=[],requests=[];
 global.fetch=async(u,o={})=>{if(!o.method)return new Response('[]');patches.push(JSON.parse(o.body));return new Response('',{status:201});};
 try{
 const result=await collectCommunity({api:'https://db.test',headers:{},get:async u=>{requests.push(u);if(u.endsWith('robots.txt'))return {text:'User-agent: *\nAllow: /'};if(u==='https://www.ozbargain.com.au/feed')return {status:200,text:'<rss><channel></channel></rss>'};throw Error('Source unavailable');}});
 assert.equal(requests.length,4);assert.equal(result.saved,0);assert.match(result.message,/1 feeds checked/);assert.equal(patches[0].status,'ok');assert.deepEqual(patches[0].items,[]);assert.equal(patches.filter(p=>p.status==='failed').length,2);assert(patches.slice(1).every(p=>p.retry_after));
 }finally{global.fetch=oldFetch;}
});
