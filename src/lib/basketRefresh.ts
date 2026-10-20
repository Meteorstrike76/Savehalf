import type {Deal} from './supabase';
import type {ListItem} from './shopping';
import {freshPrice,validDeal} from './watchlist';
export type PriceCheck={before:Deal;after:Deal|null};
export function sameProduct(a:Deal,b:Deal){return a.id===b.id&&a.store===b.store&&a.title===b.title&&a.category===b.category;}
export function checkBasket(items:ListItem[],deals:Deal[]):PriceCheck[]{
 const prices=new Map(deals.filter(d=>validDeal(d)&&freshPrice(d)).map(d=>[d.id,d]));
 return items.map(({deal})=>{const next=prices.get(deal.id);return {before:deal,after:deal.source!=='sample'&&next&&sameProduct(deal,next)?next:null};});
}
export function applyChecks(items:ListItem[],checks:PriceCheck[]):ListItem[]{
 return items.map(x=>{const c=checks.find(c=>sameProduct(c.before,x.deal)&&c.before.discountPrice===x.deal.discountPrice&&c.before.lastSeenAt===x.deal.lastSeenAt);return c?.after?{...x,deal:c.after}:x;});
}
export function relevantCheck(deal:Deal,checks:PriceCheck[]){return checks.find(c=>sameProduct(c.before,deal)&&((c.after&&c.after.discountPrice===deal.discountPrice&&c.after.lastSeenAt===deal.lastSeenAt)||(!c.after&&c.before.discountPrice===deal.discountPrice&&c.before.lastSeenAt===deal.lastSeenAt)));}
