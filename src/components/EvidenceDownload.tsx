import {useState} from 'react';
import type {Deal} from '@/lib/supabase';
import {evidenceReport} from '@/lib/evidenceExport';
import {download} from '@/lib/downloads';
export default function EvidenceDownload({deals}:{deals:Deal[]}) {
 const [notice,setNotice]=useState('');
 return <div className="evidence-download"><button className="list-add" onClick={()=>{try{download('savehalf-price-evidence.json',JSON.stringify(evidenceReport(deals),null,2),'application/json');setNotice('Evidence file prepared. It includes only these selected products and matching device observations.');}catch{setNotice('The evidence file could not be prepared in this browser.');}}}>Download price evidence</button><small>JSON report · selected prices, source dates, retained observations and coverage gaps. No account details.</small>{notice&&<p role="status">{notice}</p>}</div>;
}
