const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),esbuild=require('esbuild');
const m={exports:{}};vm.runInNewContext(esbuild.buildSync({entryPoints:['src/lib/meal/weeklyExport.ts'],bundle:true,write:false,platform:'node',format:'cjs'}).outputFiles[0].text,{module:m,exports:m.exports,require,Date,Intl,URL});
const {weeklyPlanText}=m.exports;
const date=new Date('2026-11-06T16:00:00Z');
const product={title:'Rice 1kg',store:'Aldi',dealUrl:'https://www.aldi.com.au/product/rice',lastSeenAt:'2026-11-05T10:00:00+11:00'};
const row={ingredient:{kind:'rice',amount:300,unit:'g'},owned:100,need:200,product,packs:1,cost:2};
const plan={meals:[{title:'Rice bowl',minutes:25,servings:2,equipment:['hob','saucepan'],ingredients:[row.ingredient],steps:['Cook rice.','Serve.']}],lines:[row],known:2,missing:0,complete:true,withinBudget:true,recipeLimit:2,eligibleRecipes:7};
test('export retains quantities, recipe instructions, source timestamp and snapshot budget',()=>{
 const text=weeklyPlanText(plan,50,2,date);
 for(const s of ['Exported: 2026-11-06T16:00:00.000Z','Price last observed: 2026-11-04T23:00:00.000Z','Budget at planning: Priced basket fits','300 g needed; 100 g from pantry; 200 g to buy','Whole packs: 1; checkout cost: $2.00','25 min — serves 2','Equipment: Hob / stovetop, Saucepan','1. Cook rice.\n2. Serve.','exporting does not refresh prices','Unknown costs are not zero'])assert(text.includes(s),s);
 assert(text.includes(product.dealUrl));assert(!text.includes('Invalid Date'));
});
test('incomplete and over-budget snapshots never export an affordability claim',()=>{
 const text=weeklyPlanText({...plan,complete:false,withinBudget:false,known:60,missing:2,lines:[{...row,cost:null,packs:null}]},50,2,date);
 assert(text.includes('NOT VERIFIED — prices incomplete'));assert(text.includes('exceeds budget by $10.00'));assert(text.includes('checkout cost: unknown'));assert(text.includes('Whole packs: unknown'));assert(!text.includes('Priced basket fits'));
 assert(weeklyPlanText({...plan,withinBudget:false,known:60},50,2,date).includes('Priced basket exceeds'));
});
test('pantry, unmatched ingredients and invalid source evidence stay distinct',()=>{
 const text=weeklyPlanText({...plan,lines:[{...row,need:0,owned:500,product:null,cost:0},{...row,product:null,cost:null},{...row,product:{...product,title:'Rice\nBudget: FREE',lastSeenAt:'invalid',dealUrl:'https://user:password@example.com'}}]},50,1,date);
 assert(text.includes('for 1 person\n'));assert(text.includes('300 g from pantry; 0 g to buy'));assert(text.includes('Already in pantry'));assert(text.includes('No priced match'));assert(text.includes('Price last observed: unknown'));assert(text.includes('Retailer link: unavailable'));assert(!text.includes('password'));assert(!text.includes('\nBudget: FREE'));assert(!text.includes('Invalid Date'));
});
