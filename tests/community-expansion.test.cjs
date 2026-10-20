const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const output=path.join(os.tmpdir(),'savehalf-community-expansion.cjs');require('esbuild').buildSync({entryPoints:['src/lib/community.ts'],bundle:true,platform:'node',format:'cjs',outfile:output});const {activePosts,feedFreshness,feedHealthText}=require(output);fs.unlinkSync(output);
const now=Date.now(),post={id:'100',title:'Meal',post_url:'https://www.ozbargain.com.au/node/100',category:'Food',published_at:new Date(now-72*3600000).toISOString(),expires_at:null,votes_up:1,votes_down:0,comments:0,notes:[]};
test('fast food without an expiry is hidden after 48 hours while beauty retains seven-day discovery window',()=>{
 assert.equal(activePosts([{feed_key:'kfc',items:[post]}],now).length,0);
 assert.equal(activePosts([{feed_key:'adorebeauty',items:[post]}],now).length,1);
 assert.equal(activePosts([{feed_key:'kfc',items:[{...post,expires_at:new Date(now+86400000).toISOString()}]}],now).length,1);
});

test('feed freshness distinguishes stalled successes from scheduled healthy feeds',()=>{
 const feed={feed_key:'frontpage',status:'ok',last_success_at:new Date(now-31*60000).toISOString()};
 assert.equal(feedFreshness(feed,now),'delayed');
 assert.match(feedHealthText(feed,now),/Updates delayed/);
 assert.equal(feedFreshness({...feed,last_success_at:new Date(now-15*60000).toISOString()},now),'current');
 assert.equal(feedFreshness({...feed,feed_key:'kfc',last_success_at:new Date(now-106*60000).toISOString()},now),'current');
 assert.equal(feedFreshness({...feed,feed_key:'kfc',last_success_at:new Date(now-211*60000).toISOString()},now),'delayed');
 assert.equal(feedFreshness({...feed,status:'failed'},now),'failed');
 for(const date of [null,'bad',new Date(now+3600000).toISOString()])assert.equal(feedFreshness({...feed,last_success_at:date},now),'unavailable');
});
