import {EQUIPMENT,FOOD} from './recipes';
import type {WeeklyPlan} from './weekly';
import {safeSource} from '../suggestions';

const money=(n:number)=>new Intl.NumberFormat('en-AU',{style:'currency',currency:'AUD'}).format(n);
const line=(value:string)=>Array.from(value,c=>c.charCodeAt(0)<32||c.charCodeAt(0)===127?' ':c).join('').trim();
const timestamp=(value:string|undefined)=>{
 const time=value?Date.parse(value):NaN;
 return Number.isFinite(time)?new Date(time).toISOString():'unknown';
};

// This is an export of the priced planning snapshot, not a fresh price lookup.
export function weeklyPlanText(plan:WeeklyPlan,budget:number,servings:number,exportedAt=new Date()):string {
 const verdict=!plan.complete?'NOT VERIFIED — prices incomplete':plan.withinBudget?'Priced basket fits the dinner budget':'Priced basket exceeds the dinner budget';
 return [
  `SaveHalf: seven dinners for ${servings} ${servings===1?'person':'people'}`,
  `Exported: ${exportedAt.toISOString()}`,
  `Dinner budget: ${money(budget)}`,
  `Budget at planning: ${verdict}`,
  `Known whole-pack checkout subtotal: ${money(plan.known)}; ${plan.missing} unpriced ingredients.`,
  ...(plan.known>budget?[`Known subtotal exceeds budget by ${money(plan.known-budget)}. Unpriced ingredients may add more.`]:[]),
  'Snapshot only — exporting does not refresh prices. Recheck retailer prices, availability, pack sizes and yields before shopping.',
  'Dinner-only estimate; other food, delivery and travel are excluded. Unknown costs are not zero.',
  'Pantry quantities are deducted once across the combined shopping list. Cook each day separately; this is not a seven-day food-storage instruction.',
  `${plan.eligibleRecipes} eligible recipes; at most ${plan.recipeLimit} dinners per recipe.`,
  '', 'YOUR DINNERS',
  ...plan.meals.flatMap((recipe,i)=>[
   '',`Day ${i+1}: ${line(recipe.title)} — ${recipe.minutes} min — serves ${recipe.servings}`,
   `Equipment: ${recipe.equipment.map(k=>EQUIPMENT[k]).join(', ')}`,
   ...recipe.ingredients.map(x=>`- ${FOOD[x.kind].label}: ${x.amount} ${x.unit}`),
   ...recipe.steps.map((step,n)=>`${n+1}. ${line(step)}`),
  ]),
  '', 'COMBINED SHOPPING LIST',
  ...plan.lines.flatMap(item=>{
   const {ingredient,product}=item;
   const rows=['',`${FOOD[ingredient.kind].label}: ${ingredient.amount} ${ingredient.unit} needed; ${Math.min(item.owned,ingredient.amount)} ${ingredient.unit} from pantry; ${item.need} ${ingredient.unit} to buy.`];
   if(!item.need)return [...rows,'Already in pantry — no purchase required.'];
   if(!product)return [...rows,'No priced match — buy separately; cost unknown.'];
   return [...rows,
    `Product: ${line(product.title)} — ${line(product.store)}`,
    `Whole packs: ${item.packs??'unknown'}; checkout cost: ${item.cost===null?'unknown':money(item.cost)}`,
    `Price last observed: ${timestamp(product.lastSeenAt)}`,
    `Retailer link: ${safeSource(product.dealUrl)??'unavailable'}`,
   ];
  }),'',
 ].join('\n');
}
