const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),esbuild=require('esbuild');
const m={exports:{}};vm.runInNewContext(esbuild.buildSync({entryPoints:['src/lib/meal/weekly.ts'],bundle:true,write:false,platform:'node',format:'cjs'}).outputFiles[0].text,{module:m,exports:m.exports,require,Date,Intl,console});
const {createWeeklyPlan}=m.exports;
const now=new Date().toISOString();
const products=['Pasta 500g','Rice 1kg','Diced tomatoes 400g','Lentils 400g','Kidney beans 400g','Eggs 12 pack','Peas 1kg','Onion 1kg','Carrots 1kg','Potatoes 1kg','Vegetable oil 1L'].map((title,i)=>({id:String(i),title,category:'Groceries',store:'Aldi',discountPrice:2,isActive:true,lastSeenAt:now,source:'retailer',dealUrl:'https://www.aldi.com.au/product/'+i}));
const options={budget:50,servings:2,vegan:false,pantry:[]};
test('seven dinners scale to household, merge pack purchases and fit a priced budget',()=>{const p=createWeeklyPlan(options,products);assert.equal(p.meals.length,7);assert(p.meals.every(r=>r.servings===2));assert(p.complete);assert(p.withinBudget);assert(p.known<=50);assert.equal(p.lines.length,new Set(p.lines.map(l=>l.ingredient.kind+'|'+l.ingredient.unit)).size);for(const l of p.lines)assert.equal(l.cost,l.packs*2);assert(new Set(p.meals.map(r=>r.title)).size>=4);});
test('missing and stale prices cannot prove affordability',()=>{for(const data of [[],products.map(p=>({...p,lastSeenAt:'2020-01-01T00:00:00Z'}))]){const p=createWeeklyPlan(options,data);assert(!p.complete);assert(!p.withinBudget);assert(p.missing>0);}});
test('plant-only excludes eggs; pantry is subtracted once across all seven dinners',()=>{const p=createWeeklyPlan({...options,vegan:true,pantry:[{id:'rice',kind:'rice',amount:100,unit:'g',date:'',dateType:'best-before'}]},products);assert(p.meals.every(r=>!r.ingredients.some(i=>i.kind==='eggs')));const rice=p.lines.find(l=>l.ingredient.kind==='rice');assert(rice);assert.equal(rice.owned,100);assert.equal(rice.need,Math.max(0,rice.ingredient.amount-100));});
test('tiny budgets show over-budget outcome and invalid inputs reject',()=>{const p=createWeeklyPlan({...options,budget:1},products);assert(p.complete);assert(!p.withinBudget);assert(p.known>1);for(const budget of [0,-1,NaN,Infinity,5001])assert.throws(()=>createWeeklyPlan({...options,budget},products));for(const servings of [0,1.5,9])assert.throws(()=>createWeeklyPlan({...options,servings},products));});

test('prepared rice/pasta and chickpeas cannot supply plain recipe ingredients',()=>{const wrong=products.map(p=>p.title==='Rice 1kg'?{...p,title:'BROOKDALE Creamed Rice Vanilla Flavoured 430g'}:p.title==='Pasta 500g'?{...p,title:'CORALE Spaghetti in Tomato Sauce 420g'}:p.title==='Peas 1kg'?{...p,title:'NEW SEASON Chick Peas 420g'}:p);const p=createWeeklyPlan({...options,vegan:true},wrong);for(const line of p.lines)if(['rice','pasta','peas'].includes(line.ingredient.kind)){assert.equal(line.product,null);assert.equal(line.cost,null);}assert(!p.withinBudget);});

test('time and exclusions constrain every dinner and infeasible preferences reject',()=>{const p=createWeeklyPlan({...options,maxMinutes:30,exclude:['eggs','pasta']},products);assert.equal(p.meals.length,7);assert(p.meals.every(r=>r.minutes<=30&&!r.ingredients.some(i=>['eggs','pasta'].includes(i.kind))));assert.throws(()=>createWeeklyPlan({...options,maxMinutes:1},products),/No recipes match/);assert.throws(()=>createWeeklyPlan({...options,exclude:['unknown']},products),/recognised/);for(const maxMinutes of [0,NaN,181,2.5])assert.throws(()=>createWeeklyPlan({...options,maxMinutes},products));});


test('empty, partial and full prices cannot collapse variety to one repeated dinner',()=>{
 for(const data of [[],products.slice(0,2),products]){
  const p=createWeeklyPlan(options,data),counts=new Map();
  for(const r of p.meals)counts.set(r.title,(counts.get(r.title)||0)+1);
  assert.equal(p.recipeLimit,2);assert.equal(p.eligibleRecipes,7);
  assert([...counts.values()].every(n=>n<=2));assert(counts.size>=4);
  assert(p.meals.every((r,i)=>!i||r.title!==p.meals[i-1].title));
  const requirements=new Map();
  for(const r of p.meals)for(const x of r.ingredients)requirements.set(x.kind,(requirements.get(x.kind)||0)+x.amount);
  for(const line of p.lines)assert.equal(line.ingredient.amount,requirements.get(line.ingredient.kind));
 }
});
test('small eligible pools relax only as needed and keep time/exclusions intact',()=>{
 const two=createWeeklyPlan({...options,exclude:['eggs','pasta']},[]);
 assert.equal(two.eligibleRecipes,2);assert.equal(two.recipeLimit,4);
 assert.equal(new Set(two.meals.map(r=>r.title)).size,2);
 assert(two.meals.every((r,i)=>!i||r.title!==two.meals[i-1].title));
 const one=createWeeklyPlan({...options,maxMinutes:25,exclude:['eggs','pasta']},[]);
 assert.equal(one.eligibleRecipes,1);assert.equal(one.recipeLimit,7);
 assert.equal(one.meals.length,7);assert(!one.withinBudget);
 assert(one.meals.every(r=>r.minutes<=25&&!r.ingredients.some(x=>['eggs','pasta'].includes(x.kind))));
});
