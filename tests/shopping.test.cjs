const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const output=path.join(require('node:os').tmpdir(),'savehalf-shopping-tests.cjs');
require('esbuild').buildSync({entryPoints:[path.join(__dirname,'../src/lib/shopping.ts')],bundle:true,platform:'node',format:'cjs',outfile:output});
const {unitPrice,basketTotals,listCsv,readList}=require(output);fs.unlinkSync(output);
const deal={id:'test',title:'Rice 1kg',category:'Groceries',store:'Aldi',discountPrice:2.55,originalPrice:5};
test('basket uses cents, quantities, bought flags and known reductions',()=>{
 const result=basketTotals([{deal,quantity:3,bought:false},{deal:{...deal,id:'second',discountPrice:0.1,originalPrice:null},quantity:3,bought:true}]);
 assert.deepEqual(result,{total:7.95,remaining:7.65,saving:7.35});
});
test('unit prices normalise mass, volume and explicit multipacks',()=>{
 assert.deepEqual(unitPrice({...deal,title:'Beans 2 x 400g',discountPrice:4}),{value:5,unit:'kg'});
 assert.deepEqual(unitPrice({...deal,title:'Milk 750ml',discountPrice:3}),{value:4,unit:'L'});
 assert.equal(unitPrice({...deal,title:'Chicken approx 500g per kg'}),null);
 assert.equal(unitPrice({...deal,title:'Two Pack 500g'}),null);
 assert.equal(unitPrice({...deal,title:'Tin 400g + 100g bonus'}),null);
 assert.equal(unitPrice({...deal,title:'Air fryer 5L',category:'Electronics'}),null);
});
test('CSV preserves quotes and guards spreadsheet formulas',()=>{
 const csv=listCsv([{deal:{...deal,title:' =HYPERLINK("unsafe")'},quantity:1,bought:false}]);
 assert(csv.includes("' =HYPERLINK("));assert(csv.includes('""unsafe""'));
});
test('stored shopping data rejects invalid prices and quantities',()=>{
 global.localStorage={getItem:()=>JSON.stringify([{deal,quantity:2,bought:false},{deal,quantity:0,bought:false},{deal:{...deal,discountPrice:-1},quantity:1,bought:false}])};
 assert.equal(readList().length,1);
 global.localStorage={getItem:()=>'{broken'};assert.deepEqual(readList(),[]);
});
