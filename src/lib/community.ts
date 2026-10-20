export const BEAUTY_FEEDS=['priceline','chemistwarehouse','adorebeauty','sephora'];
export const FAST_FOOD_FEEDS=['mcdonalds','kfc','hungryjacks','dominos','subway'];
export const RADAR_KEY='savehalf-radar-bookmarks-v1';
export type Post={id:string;title:string;post_url:string;category:string;published_at:string;expires_at:string|null;votes_up:number;votes_down:number;comments:number;notes:string[]};
export type CommunityFeed={feed_key:string;label:string;status:string;items:Post[];checked_at:string|null;last_success_at:string|null;retry_after:string|null};
export function validPost(x:unknown):x is Post{const p=x as Post;return !!p&&typeof p.id==='string'&&/^\d+$/.test(p.id)&&typeof p.title==='string'&&p.title.length<=300&&p.post_url===`https://www.ozbargain.com.au/node/${p.id}`&&typeof p.category==='string'&&Number.isFinite(Date.parse(p.published_at))&&(p.expires_at===null||Number.isFinite(Date.parse(p.expires_at)))&&[p.votes_up,p.votes_down,p.comments].every(n=>Number.isInteger(n)&&n>=0&&n<=100000)&&Array.isArray(p.notes)&&p.notes.every(n=>typeof n==='string'&&n.length<=80);}
export function activePosts(feeds:CommunityFeed[],now=Date.now()){return [...new Map(feeds.flatMap(f=>Array.isArray(f.items)?f.items.filter(validPost).filter(p=>!FAST_FOOD_FEEDS.includes(f.feed_key)||p.expires_at!==null||Date.parse(p.published_at)>=now-48*3600000):[]).filter(p=>Date.parse(p.published_at)>=now-7*86400000&&Date.parse(p.published_at)<=now+300000&&(!p.expires_at||Date.parse(p.expires_at)>now)).map(p=>[p.id,p])).values()];}
export function endingSoon(p:Post,now=Date.now()){return !!p.expires_at&&Date.parse(p.expires_at)>now&&Date.parse(p.expires_at)-now<=86400000;}

// Allow two normal collection intervals before marking a successful snapshot delayed.
export function feedFreshness(feed:CommunityFeed,now=Date.now()):'unavailable'|'failed'|'delayed'|'current'{
 if(feed.status!=='ok')return 'failed';
 const success=Date.parse(feed.last_success_at||'');
 if(!Number.isFinite(success)||success>now+300000)return 'unavailable';
 return now-success>(feed.feed_key==='frontpage'?30:210)*60000?'delayed':'current';
}
export function feedHealthText(feed:CommunityFeed,now=Date.now()){
 const state=feedFreshness(feed,now);
 return state==='current'?'Last check succeeded':state==='delayed'?'Updates delayed; showing a saved snapshot':state==='unavailable'?'No verified successful check recorded':'Check paused or failed; saved headlines may be older';
}
