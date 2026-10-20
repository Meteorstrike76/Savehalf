import {ArrowUpRight} from 'lucide-react';
import type {StoreId} from '@/lib/stores';

const sources:Record<StoreId,{url:string;domain:string}>={
 Coles:{url:'https://www.coles.com.au/on-special',domain:'coles.com.au'},
 Woolworths:{url:'https://www.woolworths.com.au/shop/catalogue',domain:'woolworths.com.au'},
 Aldi:{url:'https://www.aldi.com.au',domain:'aldi.com.au'},
 'Big W':{url:'https://www.bigw.com.au/collection/clearance',domain:'bigw.com.au'},
 Kmart:{url:'https://www.kmart.com.au/category/clearance/shop-all-clearance/',domain:'kmart.com.au'},
 Target:{url:'https://www.target.com.au/c/clearance/W676714',domain:'target.com.au'},
 'Best & Less':{url:'https://www.bestandless.com.au/sale-clearance/',domain:'bestandless.com.au'},
};
export default function RetailerFallback({store}:{store:StoreId}){
 return <aside className="retailer-fallback" aria-label={`${store} alternatives`}>
  <strong>Keep checking at {store}.</strong>
  <p>No verified matches in these filters does not mean the retailer has no offers. Our collected feed can have gaps.</p>
  <div><a href={sources[store].url} target="_blank" rel="noopener noreferrer">Official {store} offers <ArrowUpRight size={14}/></a>
  <a href={`https://www.ozbargain.com.au/deals/${sources[store].domain}`} target="_blank" rel="noopener noreferrer">Community posts <ArrowUpRight size={14}/></a></div>
  <small>External sources. Check dates, local stock and conditions. Community prices are not verified by SaveHalf.</small>
 </aside>;
}
