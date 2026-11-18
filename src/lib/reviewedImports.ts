// One-time observations reviewed against official retailer pages; never refreshed by a build.
export const reviewedImports = [
 {id:'jbhifi-899167',store:'JB Hi-Fi',name:'Lenovo Legion 7 16-inch Gaming Notebook',price:3989,detail:'Model 83F500N2AU · Core Ultra 9 290HX · RTX 5070 Ti · 32GB RAM · 1TB SSD',reference:'Ticketed/advertised reference price: $5,499. The retailer says products may previously have sold below that price.',conditions:'Not available in all stores. Airport prices may differ. Confirm availability and final price with JB Hi-Fi.',source:'https://catalogue.jbhifi.com.au/2026/11/12-11-bfb/index.html',sourceLabel:'Official JB Hi-Fi catalogue · page 7',validFrom:'2026-11-12',validTo:'2026-12-02',checkedAt:'2026-11-18T22:04:00Z'},
 {id:'target-73104933',store:'Target',name:'Preview Statement Maxi Shirt Dress',price:75,detail:'Item 73104933 · Red Print · Sizes listed: 6–20; availability requires size selection.',reference:null,conditions:'Listed price, not a verified reduction. Select size and location at Target to confirm stock. Promotion dates and regional availability were not stated on the product page.',source:'https://www.target.com.au/p/preview-statement-maxi-shirt-dress/73104933',sourceLabel:'Official Target product page',validFrom:null,validTo:null,checkedAt:'2026-11-18T22:04:00Z'}
] as const;
export function importCurrent(row:{checkedAt:string;validFrom:string|null;validTo:string|null},now=Date.now()){
 const checked=Date.parse(row.checkedAt);
 if(!Number.isFinite(checked)||checked>now||now-checked>=24*3600000)return false;
 // Conservative window across Australian time zones when a catalogue gives dates only.
 if(row.validFrom&&now<Date.parse(row.validFrom+'T00:00:00+08:00'))return false;
 if(row.validTo&&now>=Date.parse(row.validTo+'T23:59:59+11:00'))return false;
 return true;
}
