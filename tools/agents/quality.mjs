/** Rule-first checks; model suggestions remain in quarantine and never change deals. */
import {createHash} from 'node:crypto';
export function contentHash(row){return createHash('sha256').update(JSON.stringify({v:1,title:row.title,price:row.discount_price,was:row.original_price,unit:row.unit_basis,unitPrice:row.unit_price})).digest('hex');}
export function flags(row,previousPrice){const result=[];const price=Number(row.discount_price);if(!Number.isFinite(price)||price<=0)result.push('invalid_price');if(previousPrice>0&&price<=previousPrice*.1)result.push('price_drop_90_percent');if(row.unit_price!=null&&(!Number.isFinite(Number(row.unit_price))||Number(row.unit_price)<=0))result.push('invalid_unit_price');if(!row.unit_basis&&/\d\s*(?:kg|mg|g|ml|litres?|l|pack|pk)\b/i.test(row.title))result.push('unit_rule_unresolved');if(/ignore .*instructions|system prompt|api[_ -]?key|<script/i.test(row.title))result.push('untrusted_instruction_text');return result;}
export async function runQuality({db,model,now=()=>new Date()}){
 const summary={scanned:0,flagged:0,modelSuggestions:0,cached:0,quarantined:0,errors:0};let offset=0;let modelCalls=0;const titles=new Set();
 // Fail closed at 10k permanent hashes (~a few MB); do not silently forget deduplication.
 const existing=await db('/agent_quality_seen?select=hash&limit=10001');if(existing.length>=10000)throw Error('Quality hash capacity reached; owner review required');
 const seen=new Set(existing.map(r=>r.hash));
 const historyRows=await db('/price_changes?select=deal_id,price&order=observed_at.desc&limit=1000');const history=new Map();for(const h of historyRows){const prices=history.get(h.deal_id)||[];if(prices.length<2)prices.push(Number(h.price));history.set(h.deal_id,prices);}
 for(let page=0;page<5;page++){
 const rows=await db(`/current_deals?select=id,title,discount_price,original_price,unit_basis,unit_price,store_category&order=last_seen_at.desc,id&limit=100&offset=${offset}`);offset+=rows.length;
 for(const row of rows){summary.scanned++;const hash=contentHash(row);const duplicateKey=`${row.store_category}:${row.title.trim().toLowerCase().replace(/\s+/g,' ')}`;const duplicate=titles.has(duplicateKey);titles.add(duplicateKey);if(seen.has(hash)){summary.cached++;continue;}if(summary.quarantined>=20)continue;
 const checks=flags(row,history.get(row.id)?.[1]);if(duplicate)checks.push('possible_duplicate');if(!checks.length)continue;
 // Claim before inference: failures consume the claim rather than sending an item twice.
 await db('/agent_quality_seen',{hash});seen.add(hash);
 let suggestion=null;if(checks.includes('unit_rule_unresolved')&&!checks.includes('untrusted_instruction_text')&&model&&modelCalls<3){modelCalls++;try{suggestion=await model(String(row.title).slice(0,200));if(suggestion)summary.modelSuggestions++;}catch{summary.errors++;}}
 await db('/agent_quality_review',{hash,deal_id:row.id,flags:checks,suggestion,status:'quarantined'});
 summary.flagged++;summary.quarantined++;
 }
 if(rows.length<100)break;
 }
 await db('/scrape_runs',{store:'data-quality',started_at:now().toISOString(),finished_at:now().toISOString(),status:summary.errors?'partial':'success',rows_added:0,rows_updated:0,rows_failed:summary.quarantined,request_count:summary.modelSuggestions,message:JSON.stringify(summary)});
 return summary;
}
if(process.argv[1]&&import.meta.url===new URL(`file://${process.argv[1]}`).href){
 const base=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!base||!key)throw Error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
 const db=async(path,body)=>{const r=await fetch(`${base}/rest/v1${path}`,{method:body?'POST':'GET',headers:{apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(10000)});if(!r.ok)throw Error(`Quality database request failed: ${r.status}`);const text=await r.text();return text?JSON.parse(text):null;};
 const model=process.env.SAVEHALF_QUALITY_LLM==='true'?async title=>{const r=await fetch(`${base}/functions/v1/deal-agent`,{method:'POST',headers:{apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify({action:'quality',title}),signal:AbortSignal.timeout(25000)});if(!r.ok)throw Error(`Quality agent unavailable: ${r.status}`);return (await r.json()).suggestion||null;}:undefined;
 console.log(JSON.stringify(await runQuality({db,model}),null,2));
}
