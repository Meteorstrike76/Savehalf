import {readFile} from 'node:fs/promises';
import {validateReviewed} from './lib/reviewed-import.mjs';
if(!process.argv[2])throw Error('Usage: node src/reviewed-import.mjs reviewed-products.json [--publish]');
const rows=validateReviewed(JSON.parse(await readFile(process.argv[2],'utf8')));
console.log(JSON.stringify({validated:rows.length,products:rows.map(r=>({store:r.store_category,id:r.external_id,title:r.title,price:r.discount_price,previousPrice:r.original_price,checkedAt:r.last_seen_at}))},null,2));
// Preview is the default and does not load credentials or make any requests.
if(process.argv.includes('--publish')){
 const {client}=await import('./lib/db.mjs');const sb=client();
 const {error}=await sb.from('deals').upsert(rows,{onConflict:'store_category,external_id'});if(error)throw Error(error.message);
 console.log('Published reviewed rows. Collector health was not changed.');
}
