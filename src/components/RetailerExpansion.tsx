import {useState} from 'react';
import {ArrowUpRight} from 'lucide-react';
import ProviderProducts from './ProviderProducts';
import type {StoreId} from '@/lib/stores';

const pharmacyStores = ['Chemist Warehouse', 'Priceline'] as const;
type Selection = 'All pharmacy' | typeof pharmacyStores[number] | 'Officeworks';

export default function RetailerExpansion(props:{search:string;stores:StoreId[];category:string;min:string;max:string;half:boolean}) {
 const [selected,setSelected]=useState<Selection>('All pharmacy');
 const [resetCategory,setResetCategory]=useState(false);
 return <section id="more-retailer-products" className="retailer-expansion" aria-label="Chemist Warehouse, Priceline and Officeworks" tabIndex={-1}>
  <div className="section-head"><div><div className="eyebrow">MORE OF YOUR EVERYDAY</div><h2>Care, beauty &amp; office.</h2></div><span className="data-pill">Coverage explained</span></div>
  <p>Choose a retailer below. Pharmacy snapshots use the search and price filters above, with their own store selection. Officeworks is an official-site handoff, with no product prices collected here.</p>
  <div className="directory-groups" role="group" aria-label="Additional retailer selection">{(['All pharmacy',...pharmacyStores,'Officeworks'] as const).map(store=><button key={store} aria-pressed={selected===store} onClick={()=>setSelected(store)}>{store}</button>)}</div>
  {selected==='Officeworks'?<div className="retailer-handoff">
   <div className="eyebrow">OFFICEWORKS · TECH &amp; OFFICE</div><h3>Head to the source.</h3>
   <p>Browse stationery, technology and home-office essentials at Officeworks. Product-data permission is pending, so SaveHalf does not list Officeworks prices or claim current stock.</p>
   <a className="hero-button" href="https://www.officeworks.com.au/shop/officeworks/c/clearance" target="_blank" rel="noopener noreferrer">Browse Officeworks clearance <ArrowUpRight size={17}/></a>
   <p><small>Opens the official Australian website in a new tab. Check local availability, delivery and offer conditions there. No retailer request is made until you open the link.</small></p>
  </div>:<>
   {props.category!=='All'&&<label className="retailer-category-override"><input type="checkbox" checked={resetCategory} onChange={e=>setResetCategory(e.target.checked)}/> Show all pharmacy categories instead of “{props.category}”</label>}
   <ProviderProducts {...props} category={resetCategory?'All':props.category} pharmacy pharmacyStores={selected==='All pharmacy'?[...pharmacyStores]:[selected]}/>
  </>}
 </section>;
}
