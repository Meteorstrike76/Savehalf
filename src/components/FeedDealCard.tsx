import type {CSSProperties} from 'react';
import {Heart,Eye,ChefHat,ArrowUpRight,GitCompareArrows} from 'lucide-react';
import type {Deal} from '@/lib/supabase';
import type {StoreId} from '@/lib/stores';
import {unitPrice} from '@/lib/shopping';
import {foodKind} from '@/lib/meal/recipes';
import ProductImage from './ProductImage';
const money=(n:number)=>new Intl.NumberFormat('en-AU',{style:'currency',currency:'AUD'}).format(n);
export function StoreLabel({store}:{store:StoreId}) {return <span className="store-label" style={{color:'#17283f'}}>{store==='Woolworths'?'woolworths':store==='Target'?'◎ Target':store==='Aldi'?'ALDI':store}</span>;}
type Props={deal:Deal;index:number;saved:boolean;saveBusy?:boolean;previousVisit?:number;follow?:string;watched?:boolean;listed?:boolean;mealSelected?:boolean;compared?:boolean;onToggle?:(deal:Deal)=>void;onSave?:()=>void;onDetail?:()=>void;onHide?:()=>void;onWatch?:()=>void;onList?:()=>void;onMeal?:()=>void;onCompare?:()=>void};
export default function DealCard({deal:d,index,saved,saveBusy=false,previousVisit=0,follow='',watched=false,listed=false,mealSelected=false,compared=false,onToggle,onSave,onDetail,onHide,onWatch,onList,onMeal,onCompare}:Props){
 const saveAction=()=>{if(onSave)onSave();else onToggle?.(d);};
 return (
<article className="product-card" style={{'--card-delay':`${Math.min(index,7)*45}ms`} as CSSProperties}>
<div className="product-image" >
<span className="discount">{d.discountPct>0?`Retailer-reported ${d.discountPct}% reduction`:'CATALOGUE'}</span>
<button className={'heart '+(saved?'hearted':'')} disabled={saveBusy} aria-label={`${saved?'Unsave':'Save'} ${d.title}`} onClick={saveAction}>
<Heart size={18} fill={saved?'currentColor':'none'}/>
</button>
<button className="image-button" onClick={onDetail} aria-label={`View ${d.title}`}>
<ProductImage title={d.title} imageUrl={d.imageUrl} sample={d.source==='sample'||d.source==='seed'}/>
</button>
<span className="image-caption">{d.source==='sample'?'ILLUSTRATIVE PRODUCT':d.source==='seed'?'SAMPLE DATA':d.category.toUpperCase()}</span>
</div>
<div className="product-body">
<StoreLabel store={d.store}/>{previousVisit>0&&Date.parse(d.publishedAt)>previousVisit&&Date.parse(d.publishedAt)<=Date.now()&&d.source!=='sample'&&<span className="new-find">Added since your last visit</span>}<button className="product-title" onClick={onDetail}>{d.title}</button>{follow.split(',').slice(0,8).filter(w=>w.trim()&&d.title.toLowerCase().includes(w.trim().toLowerCase())).length>0&&<small className="new-find">Matches your followed title words</small>}<div className="prices">
<strong>{money(d.discountPrice)}</strong>{d.originalPrice&&d.discountPct>0&&<del title="Retailer reference price; may be RRP">Ref. {money(d.originalPrice)}</del>}</div>{d.unitPrice&&d.unitBasis?<p className="unit-price">{money(d.unitPrice)} / {d.unitBasis} · from declared pack size</p>:unitPrice(d)&&<p className="unit-price">{money(unitPrice(d)!.value)} / {unitPrice(d)!.unit} · estimated from pack size</p>}<div className="saving">{d.originalPrice&&d.discountPct>0?`${money(d.originalPrice-d.discountPrice)} below retailer reference`:'No retailer reference reduction'}<span>{d.source==='sample'?'Sample price':d.lastSeenAt?`Checked ${new Date(d.lastSeenAt).toLocaleDateString('en-AU')}`:'Check at retailer'}</span>
</div>
<button className="hide-find" aria-label={`Hide ${d.title}`} onClick={onHide}>Hide this find</button>
<button className="watch-add" aria-pressed={watched} onClick={onWatch}>
<Eye size={15}/>{watched?'Watching price':'Watch price'}</button>
<button className="list-add" onClick={onList}>{listed?'On your shopping list':'Add to list'}</button>{foodKind(d)&&<button className={"meal-add "+(mealSelected?"selected":"")} aria-pressed={mealSelected} onClick={onMeal}>
<ChefHat size={15}/>{mealSelected?"Added to meal":"Add to meal"}</button>}<div className="card-actions">
<button onClick={onDetail}>View find <ArrowUpRight size={15}/>
</button>
<button aria-pressed={compared} onClick={onCompare}>
<GitCompareArrows size={15}/>{compared?'Added':'Compare'}</button>
</div>
</div>
</article>
 );
}
