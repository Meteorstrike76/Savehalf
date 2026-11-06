const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),esbuild=require('esbuild');
function load(entry){const m={exports:{}};vm.runInNewContext(esbuild.buildSync({entryPoints:[entry],bundle:true,write:false,platform:'node',format:'cjs'}).outputFiles[0].text,{module:m,exports:m.exports,require,Date,Intl});return m.exports;}
const {foodKind}=load('src/lib/meal/recipes.ts');
const {planMeals}=load('src/lib/household.ts');
const valid=[['Basmati Rice 1kg','rice'],['Brown Rice 500g','rice'],['Penne Pasta 500g','pasta'],['Spaghetti 500g','pasta'],['Diced Tomatoes 400g','tomato'],['Tomato Passata 700g','tomato'],['Red Lentils 500g','lentils'],['Tinned Lentils 400g','lentils'],['Kidney Beans 400g','beans'],['Cannellini Beans 400g','beans'],['Eggs 12 pack','eggs'],['Free Range Eggs 6 pack','eggs'],['Frozen Peas 500g','peas'],['Green Peas 1kg','peas'],['Brown Onions 1kg','onion'],['Carrots 1kg','carrot'],['Potatoes 2kg','potato'],['Vegetable Oil 1L','oil'],['Olive Oil 500ml','oil'],['Sea Salt 500g','salt']];
const invalid=['Rice Flour 500g','Rice Noodles 250g','Rice Vermicelli 250g','Rice Paper 200g','Rice Bran 500g','Rice Milk 1L','Rice Drink 1L','Rice Vinegar 250ml','Rice Syrup 500g','Rice Bran Oil 1L','Black Bean Sauce 200g','Kidney Beans Dip 200g','Refried Black Beans 400g','Black Beans Sprouts 200g','Lentils Flour 500g','Lentils Protein Powder 300g','Peas Protein 500g','Peas Puree 200g','Peas Puffs 100g','Eggs Powder 100g','Liquid Eggs Whites 500ml','Pickled Eggs 6 pack','Eggs Replacer 200g','Mashed Potatoes 500g','Potatoes Flakes 200g','Roasted Potatoes 500g','Potatoes Wedges 500g','Creamed Rice Vanilla 430g','Spaghetti in Tomato Sauce 420g','Chick Peas 420g','Split Peas 500g','Snow Peas 200g','Sugar Snap Peas 200g','Pasta Salad 400g','Ready Rice 250g','Rice Pudding 400g'];
for(const [title,kind] of valid)test(`compatible commodity: ${title}`,()=>assert.equal(foodKind({title,category:'Groceries'}),kind));
for(const title of invalid)test(`incompatible recipe form: ${title}`,()=>assert.equal(foodKind({title,category:'Groceries'}),null));
test('non-grocery titles cannot become meal ingredients',()=>{for(const [title] of valid)assert.equal(foodKind({title,category:'Home & Living'}),null);});
test('a cheaper processed rice product cannot displace plain rice or prove a priced basket',()=>{
 const recipe={ingredients:[{kind:'rice',amount:150,unit:'g'}]};
 const base={category:'Groceries',store:'Aldi',isActive:true,lastSeenAt:new Date().toISOString(),source:'retailer',discountPrice:1};
 const wrong={...base,id:'wrong',title:'Rice Flour 1kg'};
 const right={...base,id:'right',title:'Rice 1kg',discountPrice:3};
 assert.equal(planMeals([recipe],[],[wrong])[0].cost,null);
 const line=planMeals([recipe],[],[wrong,right])[0];assert.equal(line.product.id,'right');assert.equal(line.cost,3);
});
