import {useState,type ChangeEvent,type FormEvent} from 'react';
import {download} from '@/lib/downloads';
import {MANUAL_STORES,importCandidates,reviewedCsv,validateCandidate,type ReviewRow} from '../../scraper/src/lib/manual-intake.mjs';
import '@/manual-intake.css';

function localNow(){const d=new Date();return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16);}
function iso(value:string){return value&&Number.isFinite(Date.parse(value))?new Date(value).toISOString():'';}
function field(data:FormData,name:string){return String(data.get(name)??'').trim();}
function price(value:string){return /^\d{1,4}(?:\.\d{1,2})?$/.test(value)?Number(value):NaN;}
function id(row:ReviewRow){return row.store+':'+row.externalId;}

export default function ManualDealIntake(){
 const [rows,setRows]=useState<ReviewRow[]>([]);
 const [message,setMessage]=useState('');
 const [fileBusy,setFileBusy]=useState(false);
 const verified=rows.filter(row=>row.reviewed);

 function add(event:FormEvent<HTMLFormElement>){
  event.preventDefault();const data=new FormData(event.currentTarget);const old=field(data,'was');
  const row:ReviewRow={store:field(data,'store'),externalId:field(data,'externalId'),title:field(data,'title'),price:price(field(data,'price')),was:old?price(old):undefined,url:field(data,'url'),sourceUrl:field(data,'sourceUrl'),region:field(data,'region'),checkedAt:iso(field(data,'checkedAt')),promotionEndsAt:iso(field(data,'promotionEndsAt')),reviewed:false,image:''};
  const issues=validateCandidate(row);
  if(issues.length){setMessage('Not added: '+issues.join('; '));return;}
  if(rows.length>=150){setMessage('The draft queue is limited to 150 items.');return;}
  if(rows.some(other=>id(other)===id(row))){setMessage('This retailer product ID is already in the draft.');return;}
  setRows(previous=>[...previous,row]);setMessage('Draft added. Verify retailer evidence before approving.');
  event.currentTarget.reset();
 }

 async function upload(event:ChangeEvent<HTMLInputElement>){
  const file=event.currentTarget.files?.[0];event.currentTarget.value='';if(!file)return;
  if(file.size>128*1024){setMessage('CSV exceeds the 128 KiB limit.');return;}
  setFileBusy(true);
  try{
   const candidates=importCandidates(await file.text());
   const keys=new Set(rows.map(id));
   const added=candidates.filter(row=>{const key=id(row);if(keys.has(key))return false;keys.add(key);return true;});
   if(rows.length+added.length>150)throw Error('Draft queue exceeds 150 items');
   setRows(previous=>[...previous,...added]);
   setMessage('Imported '+added.length+' unreviewed drafts; '+(candidates.length-added.length)+' duplicates ignored. Each offer needs fresh manual verification.');
  }catch(error){setMessage('CSV not imported: '+(error instanceof Error?error.message:'Invalid file'));}
  finally{setFileBusy(false);}
 }

 function review(index:number,checked:boolean){
  if(checked){const issues=validateCandidate(rows[index]);if(issues.length){setMessage('Cannot approve: '+issues.join('; '));return;}}
  setRows(previous=>previous.map((row,i)=>i===index?{...row,reviewed:checked}:row));
  setMessage(checked?'Marked reviewed; prices and dates will be checked again on export.':'Returned to unreviewed draft.');
 }
 function exportCsv(){
  try{
   download('savehalf-reviewed-deals.csv',reviewedCsv(verified),'text/csv;charset=utf-8');
   setMessage('Downloaded '+verified.length+' reviewed items locally. Nothing was published.');
  }catch(error){setMessage('Export rejected: '+(error instanceof Error?error.message:'Invalid rows'));}
 }

 return <section className="manual-intake" aria-label="Manual deal intake">
  <details>
   <summary><strong>Manual sale-item intake</strong> — add, review and export catalogue CSV</summary>
   <p>Drafts stay only while this admin panel is open. No database write is made here. Check the retailer source, not just a third-party price estimate.</p>
   <p role="status" aria-live="polite">{message}</p>
   <label>Import a reviewed CSV as unreviewed drafts (128 KiB maximum)<input type="file" accept=".csv,text/csv" disabled={fileBusy} onChange={e=>void upload(e)}/></label>
   <form onSubmit={add} className="manual-intake-form">
    <h4>Add an item manually</h4>
    <label>Retailer<select name="store" required>{MANUAL_STORES.map(store=><option key={store} value={store}>{store}</option>)}</select></label>
    <label>Exact product/variant ID<input name="externalId" maxLength={120} required/></label>
    <label>Product title<input name="title" maxLength={200} required/></label>
    <label>Current price in AUD<input name="price" type="number" min="0.01" max="5000" step="0.01" required/></label>
    <label>Verified previous selling price in AUD (optional)<input name="was" type="number" min="0.01" max="5000" step="0.01"/></label>
    <label>Retailer product URL<input name="url" type="url" placeholder="https://..." required/></label>
    <label>Retailer source URL<input name="sourceUrl" type="url" placeholder="https://..." required/></label>
    <label>Verified state or local store<input name="region" placeholder="NSW" maxLength={80} required/></label>
    <label>Time checked, local<input name="checkedAt" type="datetime-local" defaultValue={localNow()} required/></label>
    <label>Offer end, local (required for Coles/Woolworths)<input name="promotionEndsAt" type="datetime-local"/></label>
    <button type="submit">Add unreviewed draft</button>
   </form>
   <div className="manual-intake-summary"><strong>{rows.length} drafts · {verified.length} reviewed</strong><button type="button" disabled={!verified.length} onClick={exportCsv}>Download verified CSV</button></div>
   <p>Export is offline only; separately preview the CSV using <code>node scraper/src/reviewed-import.mjs file.csv</code> before an authorised server-side publication.</p>
   <ul className="manual-intake-list">{rows.map((row,index)=><li key={id(row)}>
    <strong>{row.store}: {row.title}</strong><span>AUD {row.price.toFixed(2)}{row.was!==undefined?' · previous AUD '+row.was.toFixed(2):''} · {row.region}</span>
    <small>Checked: {row.checkedAt} · Offer ends: {row.promotionEndsAt||'not supplied'}</small>
    <a href={row.sourceUrl} target="_blank" rel="noopener noreferrer">Review retailer evidence</a>
    <label><input type="checkbox" checked={row.reviewed} onChange={e=>review(index,e.target.checked)}/> I personally checked the retailer price, region, product and dates</label>
    <button type="button" onClick={()=>{setRows(previous=>previous.filter((_,i)=>i!==index));setMessage('Draft removed.');}}>Remove draft</button>
   </li>)}</ul>
  </details>
 </section>;
}
