import type {Deal} from '@/lib/supabase';
export type FoodKind='pasta'|'rice'|'tomato'|'lentils'|'beans'|'eggs'|'peas'|'onion'|'carrot'|'potato'|'oil'|'salt';
export const FOOD:Record<FoodKind,{label:string;pattern:RegExp}>={
 pasta:{label:'Pasta',pattern:/\b(pasta|spaghetti|penne|macaroni|fusilli)\b/i},rice:{label:'Rice',pattern:/\b(?:basmati|jasmine|white|brown|long grain|medium grain)?\s*rice\b/i},tomato:{label:'Tinned tomatoes',pattern:/\b(diced|crushed|chopped|tinned|canned)\s+tomatoes?\b|\btomato passata\b/i},lentils:{label:'Lentils',pattern:/\blentils?\b/i},beans:{label:'Tinned beans',pattern:/\b(kidney|black|cannellini|baked)\s+beans\b/i},eggs:{label:'Eggs',pattern:/\beggs\b/i},peas:{label:'Peas',pattern:/\bpeas\b/i},onion:{label:'Onion',pattern:/\bonions?\b/i},carrot:{label:'Carrots',pattern:/\bcarrots?\b/i},potato:{label:'Potatoes',pattern:/\bpotatoes\b/i},oil:{label:'Cooking oil',pattern:/\b(olive|vegetable|canola|sunflower)\s+oil\b/i},salt:{label:'Salt',pattern:/\b(table|cooking|sea)\s+salt\b/i}
};
const notIngredient=/\b(brush|mask|mist|shampoo|detergent|cleaner|gloves|mug|cup|cable|lotion|cream|skincare|fragrance|chips|crackers|biscuits|cake|chocolate|snack|soup|pasta sauce|ready meal|fried rice|rice pudding|microwave|ready rice|split peas|dried peas|pasta salad|baby food)\b/i;
export function foodKind(d:Pick<Deal,'title'|'category'>):FoodKind|null {
 if(d.category!=='Groceries'||notIngredient.test(d.title))return null;
 const kind=(Object.keys(FOOD) as FoodKind[]).find(k=>FOOD[k].pattern.test(d.title))??null;
 // These recipes need plain grains/pasta and ordinary peas, not prepared dishes
 // or different legumes that happen to contain the same title word.
 if(kind==='rice'&&/\b(creamed|pudding|flavou?red|vanilla|instant|precooked|pre-cooked|cakes?|risotto)\b/i.test(d.title))return null;
 if(kind==='pasta'&&/\b(in\s+(?:tomato\s+)?sauce|canned|tinned|cooked|ready|filled|ravioli|tortellini)\b/i.test(d.title))return null;
 if(kind==='peas'&&/\b(chick\s*peas?|snow\s+peas?|sugar\s+snap)\b/i.test(d.title))return null;
 // A matching ingredient word does not make a processed product a compatible
 // recipe ingredient. Keep uncertain forms unpriced instead of using their pack.
 if(kind&&['rice','pasta','lentils','beans','peas'].includes(kind)&&/\b(flour|powder|protein|noodles?|vermicelli|sauce|dip|spread|puree|purée|hummus|hommus|sprouts?|puffs?|noodle|seasoning|extract)\b/i.test(d.title))return null;
 if(kind==='rice'&&/\b(rice\s+paper|rice\s+bran|rice\s+milk|rice\s+drink|rice\s+vinegar|rice\s+syrup|rice\s+oil)\b/i.test(d.title))return null;
 if(kind==='beans'&&/\b(refried|mixed\s+salad|salad\s+mix)\b/i.test(d.title))return null;
 if(kind==='eggs'&&/\b(powder|powdered|liquid|whites?|yolks?|pickled|replacer|substitute)\b/i.test(d.title))return null;
 if(kind==='potato'&&/\b(mash|mashed|flakes?|wedges|fries|roast|roasted|gems|hash\s+browns?)\b/i.test(d.title))return null;

 return kind;
}
export type Ingredient={kind:FoodKind;amount:number;unit:'g'|'ml'|'each'};
export const EQUIPMENT={hob:"Hob / stovetop",saucepan:"Saucepan",fryingPan:"Frying pan",grill:"Grill"} as const;
export type Equipment=keyof typeof EQUIPMENT;
export type Recipe={equipment:Equipment[];title:string;servings:number;minutes:number;ingredients:Ingredient[];steps:string[];source:'built-in'};
export const RECIPES:Recipe[]=[
 {equipment:["hob", "saucepan", "fryingPan"],title:'Tomato & lentil pasta',servings:2,minutes:25,source:'built-in',ingredients:[{kind:'pasta',amount:200,unit:'g'},{kind:'tomato',amount:400,unit:'g'},{kind:'lentils',amount:200,unit:'g'},{kind:'oil',amount:10,unit:'ml'}],steps:['Cook the pasta according to the packet instructions.','Drain and rinse tinned lentils, or cook dried lentils according to the packet before using.','Heat the oil. Add tomatoes and cooked lentils, then simmer for 10 minutes.','Drain the pasta, fold it through the sauce and divide between two bowls.']},
 {equipment:["hob", "saucepan", "fryingPan"],title:'Egg & pea fried rice',servings:2,minutes:25,source:'built-in',ingredients:[{kind:'rice',amount:150,unit:'g'},{kind:'eggs',amount:2,unit:'each'},{kind:'peas',amount:150,unit:'g'},{kind:'oil',amount:10,unit:'ml'}],steps:['Cook the rice according to the packet instructions. Use it straight away for this recipe.','Heat oil in a pan. Add the peas and cook through.','Push peas to one side and scramble the eggs until fully set.','Add the cooked rice, stir until hot throughout and serve immediately.']},
 {equipment:["hob", "saucepan"],title:'Bean & tomato rice bowls',servings:2,minutes:25,source:'built-in',ingredients:[{kind:'rice',amount:150,unit:'g'},{kind:'beans',amount:400,unit:'g'},{kind:'tomato',amount:400,unit:'g'},{kind:'oil',amount:10,unit:'ml'}],steps:['Cook the rice according to the packet instructions.','Drain and rinse tinned beans. Heat oil in a saucepan.','Add tomatoes and beans; simmer for 10–15 minutes until hot throughout.','Spoon the beans over rice and serve.']},
 {equipment:["hob", "fryingPan", "grill"],title:'Potato & onion omelette',servings:2,minutes:30,source:'built-in',ingredients:[{kind:'potato',amount:300,unit:'g'},{kind:'onion',amount:100,unit:'g'},{kind:'eggs',amount:4,unit:'each'},{kind:'oil',amount:15,unit:'ml'}],steps:['Thinly slice the potatoes and onion.','Cook them in oil over medium heat, covered, until potatoes are tender. Stir regularly.','Beat the eggs and pour over the vegetables.','Cook gently until eggs are fully set; finish under a grill if needed. Divide into two portions.']}
];
export function packSize(title:string,unit:Ingredient['unit']):number|null {
 if(unit==='each'){const m=title.match(/\b(\d+)\s*(?:pack|pk|eggs)\b|\b(?:pack of|pk)\s*(\d+)\b/i);return m?Number(m[1]??m[2]):null;}
 const m=title.match(/\b(\d+(?:\.\d+)?)\s*(kg|g|ml|litres?|l)\b/i);if(!m)return null;
 const u=m[2].toLowerCase();if(unit==='g'&&!['g','kg'].includes(u)||unit==='ml'&&!['ml','l','litre','litres'].includes(u))return null;
 // Multipacks require manual verification; avoid underestimating purchases.
 if(/\b\d+\s*[x×]\s*\d/i.test(title))return null;
 return Number(m[1])*(['kg','l','litre','litres'].includes(u)?1000:1);
}
export type ShoppingLine={ingredient:Ingredient;owned:boolean;product:Deal|null;packs:number|null;cost:number|null};
export function shoppingList(recipe:Recipe,products:Deal[],pantry:FoodKind[],selected:Deal[]=[]):ShoppingLine[] {
 return recipe.ingredients.map(ingredient=>{
  if(pantry.includes(ingredient.kind))return {ingredient,owned:true,product:null,packs:0,cost:0};
  const candidates=products.filter(p=>foodKind(p)===ingredient.kind);
  const preferred=candidates.filter(p=>selected.some(s=>s.id===p.id));
  const priced=(preferred.length?preferred:candidates).map(product=>{const size=packSize(product.title,ingredient.unit);const packs=size&&size>0?Math.ceil(ingredient.amount/size):null;return {product,packs,cost:packs===null?null:Math.round(packs*product.discountPrice*100)/100};}).sort((a,b)=>(a.cost??Infinity)-(b.cost??Infinity)||a.product.discountPrice-b.product.discountPrice);
  return {ingredient,owned:false,...(priced[0]??{product:null,packs:null,cost:null})};
 });
}
export function costSummary(lines:ShoppingLine[]){return {known:Math.round(lines.reduce((s,l)=>s+(l.cost??0),0)*100)/100,complete:lines.every(l=>l.cost!==null),missing:lines.filter(l=>l.cost===null).length};}
export function rankedRecipes(products:Deal[],pantry:FoodKind[],selected:Deal[],budget:number){
 const kinds=selected.map(foodKind).filter(Boolean);
 return RECIPES.map(recipe=>{const lines=shoppingList(recipe,products,pantry,selected);const cost=costSummary(lines);return {recipe,lines,cost,matched:recipe.ingredients.filter(i=>kinds.includes(i.kind)).length};}).filter(x=>!x.cost.complete||x.cost.known<=budget).sort((a,b)=>b.matched-a.matched||a.cost.missing-b.cost.missing||a.cost.known-b.cost.known);
}
