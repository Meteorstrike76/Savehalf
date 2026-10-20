import { readFile } from 'node:fs/promises';
import { client } from './lib/db.mjs';
import { buildDeal, STORES } from './lib/normalize.mjs';
// Import only authorised retailer feeds or manually verified data. Never import sample fixtures into production.
const path=process.argv[2];
if(!path) throw new Error('Usage: node src/import.mjs authorised-products.json [--dry-run]');
const input=JSON.parse(await readFile(path,'utf8'));
if(!Array.isArray(input)||input.length>10000) throw new Error('Expected an array of at most 10000 products');
const rows=input.map(p=>{
 if(!STORES.includes(p.store)) throw new Error('Unknown store');
 const row=buildDeal({...p,allowNoWas:true,minDiscount:0});
 if(!row||!row.deal_url) throw new Error('Invalid product: '+p.title);
 const host=new URL(row.deal_url).hostname;
 const expected={Coles:'coles.com.au',Woolworths:'woolworths.com.au',Aldi:'aldi.com.au','Big W':'bigw.com.au',Kmart:'kmart.com.au',Target:'target.com.au'}[p.store];
 if(host!==expected&&!host.endsWith('.'+expected)) throw new Error('Product URL does not match retailer');
 return {...row,source_feed:'direct'};
});
if(process.argv.includes('--dry-run')) {console.log(`Validated ${rows.length} authorised products; nothing written`);}
else {
 const sb=client(), time=new Date().toISOString();
 for(const store of STORES){const group=rows.filter(r=>r.store_category===store);if(group.length){
  // Import is incremental: an incomplete feed must not expire other products.
  for(let i=0;i<group.length;i+=200){const {error}=await sb.from('deals').upsert(group.slice(i,i+200).map(r=>({...r,last_seen_at:time,is_active:true})),{onConflict:'store_category,external_id'});if(error)throw error;}
  console.log(`${store}: imported ${group.length}`);
 }}
}
