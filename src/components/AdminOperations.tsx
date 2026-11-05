import {useEffect,useState} from 'react';
import {download} from '@/lib/downloads';
import {supabase} from '@/lib/supabase';

type Audit={id:number;suggestion_id:string|null;action:string;created_at:string};
type Health={store:string;status:string;last_success_at:string|null;saved:number|null;review_required:boolean|null};
export default function AdminOperations(){
 const [tab,setTab]=useState<'overview'|'audit'>('overview'),[page,setPage]=useState(0),[version,setVersion]=useState(0);
 const [counts,setCounts]=useState<Record<string,number>>({}),[audit,setAudit]=useState<Audit[]>([]),[health,setHealth]=useState<Health[]>([]);
 const [busy,setBusy]=useState(false),[failed,setFailed]=useState(false);
 useEffect(()=>{let active=true;const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),12000);
  async function load(){setBusy(true);setFailed(false);setCounts({});setHealth([]);setAudit([]);
   try{
    const access=await supabase.rpc('site_is_admin',{p_require_mfa:true}).abortSignal(controller.signal);
    if(access.error||!access.data)throw Error('MFA required');
    if(tab==='audit'){
     const r=await supabase.from('admin_audit').select('id,suggestion_id,action,created_at').order('created_at',{ascending:false}).order('id',{ascending:false}).range(page*20,page*20+19).abortSignal(controller.signal);
     if(r.error)throw r.error;if(active)setAudit(r.data||[]);
    }else{
     const statuses=['pending','needs_information','approved','rejected'];
     const [values,report]=await Promise.all([Promise.all(statuses.map(async status=>{
      const r=await supabase.from('deal_suggestions').select('id',{head:true,count:'exact'}).eq('status',status).abortSignal(controller.signal);
      if(r.error)throw r.error;return [status,r.count||0] as const;
     })),supabase.from('collection_status').select('store,status,last_success_at,saved,review_required').order('store').limit(12).abortSignal(controller.signal)]);
     if(report.error)throw report.error;if(active){setCounts(Object.fromEntries(values));setHealth(report.data||[]);}
    }
   }catch{if(active)setFailed(true);}finally{clearTimeout(timer);if(active)setBusy(false);}
  }void load();return()=>{active=false;clearTimeout(timer);controller.abort();};
 },[tab,page,version]);
 return <section className="admin-operations" aria-label="Administration overview and audit">
  <div className="directory-groups"><button aria-pressed={tab==='overview'} onClick={()=>{setTab('overview');setPage(0);}}>Overview &amp; collection health</button><button aria-pressed={tab==='audit'} onClick={()=>{setTab('audit');setPage(0);}}>Review audit log</button><button disabled={busy} onClick={()=>setVersion(v=>v+1)}>Refresh overview</button></div>
  {busy&&<p role="status">Loading administrator overview…</p>}{failed&&<p role="alert">Overview unavailable. Verify your administrator MFA session and retry. No settings have changed.</p>}
  {!busy&&!failed&&(tab==='overview'?<><h3>Submission totals</h3><div className="admin-metrics">{Object.entries(counts).map(([status,count])=><div key={status}><strong>{count}</strong><span>{status.replace(/_/g,' ')}</span></div>)}</div><h3>Direct collector health</h3><p>Last recorded attempts, not live stock. Refresh reads saved status; it does not run a scraper. Pharmacy snapshots use a separate authorised provider import. Officeworks has no admitted product collector.</p>{health.map(h=><article key={h.store}><strong>{h.store} · {h.status}</strong><p>{h.saved??0} rows in last attempt · last success: {h.last_success_at?new Date(h.last_success_at).toLocaleString('en-AU'):'Not recorded'}</p>{h.review_required&&<p>Source review required before trusting new imports.</p>}</article>)}{!health.length&&<p>No collector statuses available.</p>}</>:<><h3>Review audit log</h3><button disabled={!audit.length} onClick={()=>download('savehalf-audit-page.json',JSON.stringify({exportedAt:new Date().toISOString(),page:page+1,entries:audit},null,2),'application/json')}>Download this audit page</button><p>Most recent review decisions · 20 per page · 90-day retention. Actor identities and private account details are omitted.</p>{audit.map(a=><article key={a.id}><strong>{a.action.replace(/_/g,' ')}</strong><p>{new Date(a.created_at).toLocaleString('en-AU')}</p><small>Submission: {a.suggestion_id||'No linked submission'}</small></article>)}{!audit.length&&<p>No audit entries on this page.</p>}<nav aria-label="Audit pages"><button disabled={page===0} onClick={()=>setPage(p=>p-1)}>Previous audit page</button><span>Page {page+1}</span><button disabled={audit.length<20} onClick={()=>setPage(p=>p+1)}>Next audit page</button></nav></>)}
 </section>;
}
