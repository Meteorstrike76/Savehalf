// Optional: fills the site with SAMPLE deals so you can see the UI before the first real scrape.
// They are marked source_feed='seed' and are auto-expired once a store's real scrape succeeds.
import { client } from './lib/db.mjs';

const sample = [
  ['Coles', 'Free Range Chicken Breast Fillets 1kg', 12.0, 7.5, 'Groceries'],
  ['Coles', 'Cadbury Dairy Milk Block 180g', 6.5, 3.25, 'Groceries'],
  ['Coles', 'Ice Cream Tub 2L', 8.0, 4.0, 'Groceries'],
  ['Coles', 'Laundry Liquid 2L', 18.0, 9.0, 'Groceries'],
  ['Woolworths', 'Beef Rump Steak 500g', 16.0, 8.0, 'Groceries'],
  ['Woolworths', 'Barilla Pasta Sauce 400g', 5.0, 2.5, 'Groceries'],
  ['Woolworths', 'Coffee Capsules 20 Pack', 11.0, 5.5, 'Groceries'],
  ['Woolworths', 'Free Range Eggs 12 Pack', 7.0, 4.5, 'Groceries'],
  ['Aldi', 'Chunky Beef Pies 4 Pack', 7.99, 4.99, 'Groceries'],
  ['Aldi', 'Cordless Stick Vacuum', 99.0, 69.0, 'Electronics'],
  ['Aldi', 'Kids Waterproof Jacket', 24.99, 14.99, 'Fashion'],
  ['Aldi', 'Olive Oil Extra Virgin 1L', 14.0, 8.0, 'Groceries'],
  ['Big W', 'Bluetooth Speaker Portable', 49.0, 25.0, 'Electronics'],
  ['Big W', 'Cotton Bath Towel 4 Pack', 40.0, 20.0, 'Home & Living'],
  ['Big W', "Kids' Graphic Tee", 12.0, 5.0, 'Fashion'],
  ['Big W', 'Lego Classic Brick Box', 60.0, 30.0, 'Clearance'],
  ['Kmart', '5L Air Fryer', 59.0, 39.0, 'Electronics'],
  ['Kmart', 'Linen Look Quilt Cover Set Queen', 45.0, 22.0, 'Home & Living'],
  ['Kmart', 'Womens Knit Jumper', 25.0, 12.0, 'Fashion'],
  ['Kmart', 'Ceramic Dinner Set 12 Piece', 35.0, 17.5, 'Clearance'],
].map(([store, title, was, now, category], i) => ({
  store_category: store, external_id: `seed-${i + 1}`, title: `${title} (sample)`,
  original_price: was, discount_price: now, category, image_url: null, deal_url: '', source_feed: 'seed',
}));

const sb = client();
const { error } = await sb.from('deals').upsert(sample, { onConflict: 'store_category,external_id' });
if (error) { console.error(error.message); process.exit(1); }
console.log(`Seeded ${sample.length} sample deals.`);
