import {ArrowUpRight,ShoppingBag,Eye} from 'lucide-react';
import Modal from './Modal';
import {freshPrice,targetMet,type Watch} from '@/lib/watchlist';
import type {Deal} from '@/lib/supabase';
const money=(n:number)=>new Intl.NumberFormat('en-AU',{style:'currency',currency:'AUD'}).format(n);
type Props={open:boolean;onClose:()=>void;watches:Watch[];busy:boolean;notice:string;refresh:()=>Promise<void>;setTarget:(id:string,target:string)=>void;remove:(deal:Deal)=>void;addToList:(deal:Deal)=>void};
export default function Watchlist({open,onClose,watches,busy,notice,refresh,setTarget,remove,addToList}:Props){
 return <Modal open={open} onClose={onClose} title="My watchlist" wide><div className="eyebrow">YOUR NEXT GOOD FIND</div><h2 className="modal-heading">Worth keeping an eye on.</h2><p className="modal-copy">Up to 50 watches saved on this device. Set a target price; matches appear when you open this panel. Prices refresh at most once every five minutes. No background notifications.</p>
 <div className="watch-summary"><span><Eye size={18}/>{watches.length} watched · {watches.filter(w=>targetMet(w)).length} at target</span><button disabled={busy||!watches.length} onClick={()=>void refresh()}>{busy?'Checking…':'Check collected prices'}</button></div>
 {notice&&<p className="watch-notice" role="status">{notice}</p>}
 {!watches.length&&<p className="modal-copy">Use “Watch price” on a product to keep it here. No account needed.</p>}
 <div className="watch-items">{watches.map(w=>{const fresh=w.status==='fresh'&&freshPrice(w.deal),diff=w.previousPrice===null?0:Math.round((w.previousPrice-w.deal.discountPrice)*100)/100;return <article className="watch-item" key={w.deal.id}><small>{w.deal.store}</small><h3>{w.deal.title}</h3><div className="watch-price"><strong>{money(w.deal.discountPrice)}</strong><span>{w.status==='sample'?'Sample price':fresh?'Fresh collected price':'Last known price · needs verification'}</span></div>
 {typeof w.deal.lastSeenAt==='string'&&Number.isFinite(Date.parse(w.deal.lastSeenAt))&&<p className="watch-check">Retailer data checked {new Date(w.deal.lastSeenAt).toLocaleString('en-AU',{timeZone:'Australia/Sydney',dateStyle:'medium',timeStyle:'short'})} Sydney</p>}
 {fresh&&diff!==0&&<p className="watch-change">{diff>0?'Down':'Up'} {money(Math.abs(diff))} since your previous watch check</p>}
 {w.status==='unavailable'&&<p className="watch-check">No fresh matching variant returned. It may have expired, changed or be unavailable in our coverage.</p>}
 <label className="watch-target">My target (AUD)<input type="number" min="0.01" max="5000" step="0.01" aria-label={`Target price for ${w.deal.title}`} placeholder="Any price" value={w.target} onChange={e=>setTarget(w.deal.id,e.target.value)}/></label>
 {targetMet(w)&&<p className="watch-match">At or below your target · confirm at retailer</p>}
 <div className="watch-actions"><button onClick={()=>addToList(w.deal)}><ShoppingBag size={15}/>Add to list</button>{typeof w.deal.dealUrl==='string'&&/^https:\/\//.test(w.deal.dealUrl)&&w.deal.source!=='sample'&&<a href={w.deal.dealUrl} target="_blank" rel="noopener noreferrer">Check retailer <ArrowUpRight size={14}/></a>}<button onClick={()=>remove(w.deal)} aria-label={`Stop watching ${w.deal.title}`}>Remove</button></div></article>;})}</div>
 </Modal>;
}
