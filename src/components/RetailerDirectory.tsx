import {useState} from 'react';
import {ArrowUpRight, Search} from 'lucide-react';
import Modal from './Modal';
import {MORE_RETAILERS, RETAILER_GROUPS, type RetailerGroup, REQUESTED_RETAILERS, RETAILER_COVERAGE} from '@/lib/moreRetailers';

export default function RetailerDirectory({open,onClose}:{open:boolean;onClose:()=>void}) {
 const [search,setSearch]=useState('');
 const [requested,setRequested]=useState(false);
 const [group,setGroup]=useState<RetailerGroup>('All');
 const retailers=MORE_RETAILERS.filter(r=>(!requested||REQUESTED_RETAILERS.includes(r.name))&&(group==='All'||r.group===group)&&`${r.name} ${r.note}`.toLowerCase().includes(search.trim().toLowerCase()));
 return <Modal open={open} onClose={onClose} title="More retailers" wide>
  <div className="eyebrow">BEYOND THE SHORTLIST</div>
  <h2 className="modal-heading">More places to find a deal.</h2>
  <p className="modal-copy">{MORE_RETAILERS.length} retailer discovery entries. These stores are not collected in our product feed. Open a retailer to check its current offers, stock and delivery costs. Deal Radar separately includes community feeds for selected pharmacy, beauty, stationery and fast-food retailers. Feed availability and freshness vary.</p>
  <button className="text-button" aria-pressed={requested} onClick={()=>{setRequested(!requested);setGroup('All');setSearch('');}}>Pharmacy, beauty &amp; everyday stores</button>
  <label className="search-box directory-search"><Search size={18}/><input aria-label="Search more retailers" placeholder="A retailer, category or something you need…" value={search} onChange={e=>setSearch(e.target.value)}/></label>
  <div className="directory-groups" aria-label="Retailer categories">{RETAILER_GROUPS.map(g=><button key={g} aria-pressed={g===group} onClick={()=>setGroup(g)}>{g}</button>)}</div>
  <p className="directory-count" role="status">{retailers.length} retailers · discovery only</p>
  <div className="directory-grid">{retailers.map(r=>{
   const coverage=RETAILER_COVERAGE[r.name];
   const content=<><span className="directory-category">{r.group}</span><strong>{r.name}{coverage?.linkAllowed!==false&&<ArrowUpRight size={18}/>}</strong><span>{r.note}</span>{coverage&&<><small>{coverage.status}</small><span>{coverage.detail}</span></>}<small>{coverage?.linkAllowed===false?new URL(r.url).hostname:'Visit retailer · opens a new tab'}</small></>;
   return coverage?.linkAllowed===false?<div className="directory-card" key={r.name}>{content}</div>:<a className="directory-card" key={r.name} href={r.url} target="_blank" rel="noopener noreferrer">{content}</a>;
  })}</div>
  {retailers.length===0&&<p className="directory-empty">No retailers match. Try another name or category.</p>}
 </Modal>;
}
