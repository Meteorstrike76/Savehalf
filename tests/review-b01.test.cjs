const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
test('B01 cards qualify reference reductions beside the price',()=>{
 const app=fs.readFileSync('src/App.tsx','utf8');
 assert(app.includes('Retailer-reported ${d.discountPct}% reduction'));
 assert(app.includes('below retailer reference'));
 assert(!app.includes('% OFF'));assert(!app.includes('Biggest savings'));
 assert(!app.includes('`Save ${money(d.originalPrice-d.discountPrice)}`'));
});
test('B01 static fallback metadata makes no unsupported store claim',()=>{
 const html=fs.readFileSync('index.html','utf8');
 for(const tag of html.match(/<title>.*?<\/title>|<meta (?:name="description"|property="og:(?:title|description)")[^>]+>/g)) {
  assert(!/Coles|Woolworths|ALDI|BIG W|Kmart|Target|Best &amp; Less/.test(tag));
 }
 assert(html.includes('retailer-reported reductions'));
});
