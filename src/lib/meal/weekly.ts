import {RECIPES,FOOD,type FoodKind,type Recipe} from './recipes';
import {planMeals,prepareMealProducts,scaleRecipe,type PantryItem,type MealLine} from '../household';
import type {Deal} from '../supabase';

export type WeeklyOptions={budget:number;servings:number;vegan:boolean;pantry:PantryItem[];maxMinutes?:number;exclude?:FoodKind[]};
export type WeeklyPlan={meals:Recipe[];lines:MealLine[];known:number;missing:number;complete:boolean;withinBudget:boolean};
const weeklyRecipes:Recipe[]=[...RECIPES,
 {title:'Potato, carrot & pea mash',servings:2,minutes:30,source:'built-in',ingredients:[{kind:'potato',amount:500,unit:'g'},{kind:'carrot',amount:200,unit:'g'},{kind:'peas',amount:200,unit:'g'},{kind:'oil',amount:10,unit:'ml'}],steps:['Peel and chop the potatoes and carrots.','Boil until tender, adding peas for their packet cooking time.','Drain, mash with the oil and a little hot water, then divide into the requested servings.']},
 {title:'Tomato & egg pasta',servings:2,minutes:25,source:'built-in',ingredients:[{kind:'pasta',amount:200,unit:'g'},{kind:'tomato',amount:400,unit:'g'},{kind:'eggs',amount:2,unit:'each'},{kind:'oil',amount:10,unit:'ml'}],steps:['Cook pasta following the packet.','Heat oil in a separate pan, add tomatoes and simmer for 10 minutes.','Stir beaten eggs into the simmering sauce and cook until fully set.','Drain pasta and combine with the sauce. Divide into the requested servings.']},
 {title:'Bean & pea tomato pasta',servings:2,minutes:25,source:'built-in',ingredients:[{kind:'pasta',amount:200,unit:'g'},{kind:'beans',amount:400,unit:'g'},{kind:'tomato',amount:400,unit:'g'},{kind:'peas',amount:150,unit:'g'},{kind:'oil',amount:10,unit:'ml'}],steps:['Cook pasta following the packet.','Drain and rinse tinned beans.','Heat oil, add tomatoes, beans and peas, then simmer until hot throughout and peas are cooked.','Drain pasta and stir into the sauce. Divide into the requested servings.']}
];
export function createWeeklyPlan(options:WeeklyOptions,products:Deal[]):WeeklyPlan {
 if(!Number.isFinite(options.budget)||options.budget<=0||options.budget>5000)throw Error('Choose a budget above $0 and at most $5,000.');
 if(!Number.isInteger(options.servings)||options.servings<1||options.servings>8)throw Error('Choose one to eight people.');
 if(options.maxMinutes!==undefined&&(!Number.isInteger(options.maxMinutes)||options.maxMinutes<1||options.maxMinutes>180))throw Error('Choose a cooking time between 1 and 180 minutes.');
 if(options.exclude&&(!Array.isArray(options.exclude)||options.exclude.some(k=>!Object.prototype.hasOwnProperty.call(FOOD,k))))throw Error('Choose recognised ingredients to exclude.');
 const choices=weeklyRecipes.filter(r=>(options.maxMinutes===undefined||r.minutes<=options.maxMinutes)&&!r.ingredients.some(i=>options.exclude?.includes(i.kind))).filter(r=>!options.vegan||!r.ingredients.some(i=>i.kind==='eggs')).map(r=>scaleRecipe(r,options.servings));
 if(!choices.length)throw Error('No recipes match these preferences. Increase cooking time or remove an ingredient exclusion.');
 const available=prepareMealProducts(products);
 const evaluate=(meals:Recipe[]):WeeklyPlan=>{
  const lines=planMeals(meals,options.pantry,products,undefined,available);
  const known=Math.round(lines.reduce((n,l)=>n+(l.cost===null?0:Math.round(l.cost*100)),0))/100;
  const missing=lines.filter(l=>l.cost===null).length;
  return {meals,lines,known,missing,complete:missing===0,withinBudget:missing===0&&known<=options.budget};
 };
 // Bounded beam search: whole packs are recalculated for the combined week,
 // pantry is deducted once, and repeated recipes are allowed to reduce costs.
 // This is a shortlist search, not a global cheapest-basket guarantee.
 const score=(p:WeeklyPlan)=>p.missing*1000000+Math.max(0,p.known-options.budget)*10000+(p.meals.length-new Set(p.meals.map(r=>r.title)).size)*10+p.known;
 let beam=[evaluate([])];
 for(let day=0;day<7;day++){
  const unique=new Map<string,WeeklyPlan>();
  for(const p of beam)for(const r of choices){
   const next=evaluate([...p.meals,r]);
   const signature=next.meals.map(m=>m.title).sort().join('|');
   if(!unique.has(signature))unique.set(signature,next);
  }
  beam=[...unique.values()].sort((a,b)=>score(a)-score(b)).slice(0,24);
 }
 return beam[0];
}
