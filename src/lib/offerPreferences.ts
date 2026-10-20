import type {Post, CommunityFeed} from './community';
export const OFFER_TYPES = ['coupon', 'membership', 'subscription', 'cashback', 'targeted', 'app', 'new customer', 'minimum spend', 'pickup only'] as const;
export type OfferType = typeof OFFER_TYPES[number];
const signals: Record<OfferType, RegExp> = {
 app: /\b(?:app required|app only|app-only|online or app|mymacca|subcard|app mentioned)\b/i,
 'new customer': /\b(?:new (?:customers?|accounts?|users?)|first order|first purchase)\b/i,
 'minimum spend': /\b(?:min(?:imum)?[. ]+(?:spend|order)|spend \$?\d+)\b/i,
 'pickup only': /\b(?:pickup only|pick.up only|c&c(?:\/| or )?\s*(?:in.store)? only|in.store only)\b/i,
 coupon: /\b(?:coupon|promo(?:tional)? code|code:|with code|using code)\b/i,
 membership: /\b(?:members?|membership|prime|onepass|perks)\b/i,
 subscription: /\b(?:subscription|subscribe|renewal|auto.?renew|s&s)\b/i,
 cashback: /\b(?:cashback|cash back|cashrewards|shopback|topcashback)\b/i,
 targeted: /\b(?:targeted|selected accounts?|eligible customers?|check eligibility)\b/i,
};
export function offerSignals(post: Pick<Post,'title'|'notes'>): OfferType[] {
 const text = post.title + ' ' + post.notes.join(' ');
 return OFFER_TYPES.filter(type => signals[type].test(text));
}
export function snoozeUntil(value:string, now=Date.now()):number|null {
 if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value))return null;
 const date=new Date(value), at=date.getTime();
 // Reject normalized invalid dates and times skipped by daylight saving.
 const pad=(n:number)=>String(n).padStart(2,'0');
 const roundtrip=`${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
 return roundtrip===value&&at>now&&at<=now+7*86400000?at:null;
}
export function localDateTime(at:number):string {
 const d=new Date(at),pad=(n:number)=>String(n).padStart(2,'0');
 return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
export function radarEmptyState(feeds:CommunityFeed[],postCount:number,failed:boolean):string {
 if(failed&&!feeds.length)return 'The saved feed could not be loaded. This does not mean there are no offers.';
 if(!feeds.length)return 'No feed snapshot is available yet. Coverage is incomplete; browse the source directly.';
 if(!postCount)return feeds.some(f=>f.status!=='ok')?'No recent usable headlines are available, and one or more source checks failed or paused.':'The saved snapshots contain no recent, unexpired headlines. This is not the complete OzBargain catalogue.';
 return 'Recent headlines are available, but none match your current filters and personal preferences. Snoozed posts are also hidden.';
}
