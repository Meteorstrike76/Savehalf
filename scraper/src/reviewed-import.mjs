import {readFile} from 'node:fs/promises';
import {extname} from 'node:path';
import {parseReviewedCsv} from './lib/reviewed-csv.mjs';
import {validateReviewed} from './lib/reviewed-import.mjs';

const file = process.argv[2];
if (!file || file.startsWith('--')) throw Error('Usage: node scraper/src/reviewed-import.mjs reviewed-products.(csv|json) [--publish]');
const ext = extname(file).toLowerCase();
if (!['.csv', '.json'].includes(ext)) throw Error('Reviewed imports must be .csv or .json');
const input = await readFile(file, 'utf8');
const raw = ext === '.csv' ? parseReviewedCsv(input) : JSON.parse(input);
const rows = validateReviewed(raw);
console.log(JSON.stringify({validated: rows.length, previewOnly: !process.argv.includes('--publish'), products: rows.map(r => ({store: r.store_category, id: r.external_id, title: r.title, price: r.discount_price, previousPrice: r.original_price, checkedAt: r.last_seen_at, endsAt: r.promotion_ends_at}))}, null, 2));
// Preview is the default and does not load credentials or make any requests.
if (process.argv.includes('--publish')) {
  const {client} = await import('./lib/db.mjs');
  const sb = client();
  const {error} = await sb.from('deals').upsert(rows, {onConflict: 'store_category,external_id'});
  if (error) throw Error(error.message);
  console.log('Published reviewed rows. Collector health was not changed.');
}
