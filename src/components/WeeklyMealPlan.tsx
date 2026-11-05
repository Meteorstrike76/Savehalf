import {useState} from 'react';
import {supabase,isConfigured,toDeal,DEAL_COLUMNS,type Deal} from '@/lib/supabase';
import type {StoreId} from '@/lib/stores';
import {FOOD,foodKind,type FoodKind} from '@/lib/meal/recipes';
import {PANTRY_KEY,readRows,validPantry,type PantryItem} from '@/lib/household';
import {createWeeklyPlan,type WeeklyPlan} from '@/lib/meal/weekly';
import {download as downloadText} from '@/lib/downloads';
import {safeSource} from '@/lib/suggestions';
import {cachedRead} from '@/lib/readCache';

const money=(n:number)=>new Intl.NumberFormat('en-AU',{style:'currency',currency:'AUD'}).format(n);
const variety=(plan:WeeklyPlan)=>`${plan.eligibleRecipes} eligible recipes · at most ${plan.recipeLimit} dinners per recipe. ${plan.recipeLimit>2?'Your preferences leave limited variety. Relax the time limit or exclusions for more choices.':'Repeated dinners are spread through the week.'}`;
const unit=(k:FoodKind)=>k==='eggs'?'each':k==='oil'?'ml':'g';
export default function WeeklyMealPlan({stores,initialBudget='50'}:{stores:StoreId[];initialBudget?:string}){
 const [step,setStep]=useState(0),[budget,setBudget]=useState(initialBudget),[people,setPeople]=useState('1'),[vegan,setVegan]=useState(false);
 const [pantry,setPantry]=useState<PantryItem[]>(()=>readRows(PANTRY_KEY,validPantry,100));
 const [maxMinutes,setMaxMinutes]=useState(''),[exclude,setExclude]=useState<FoodKind[]>([]);
 const [pantrySearch,setPantrySearch]=useState('');
 const [plan,setPlan]=useState<WeeklyPlan|null>(null),[busy,setBusy]=useState(false),[notice,setNotice]=useState('');
 const validBudget=Number.isFinite(Number(budget))&&Number(budget)>0&&Number(budget)<=5000;
 const validPeople=Number.isInteger(Number(people))&&Number(people)>=1&&Number(people)<=8;
 const storeKey=stores.join('|');
 async function generate(usePantry=true){
  if(!validBudget||!validPeople||busy)return;
  setBusy(true);setNotice('');setPlan(null);
  let products:Deal[]=[];
  try{
   if(isConfigured&&storeKey)products=await cachedRead('weekly-groceries:'+storeKey,async()=>{
    const {data,error}=await supabase.from('current_deals').select(DEAL_COLUMNS).eq('category','Groceries').in('store_category',storeKey.split('|')).order('discount_price').limit(200).abortSignal(AbortSignal.timeout(12000));
    if(error)throw error;
    return (data||[]).map(toDeal).filter(d=>foodKind(d));
   },120000);
   if(!isConfigured)setNotice('Live prices are not configured. This plan has unpriced ingredients.');
   else if(!storeKey)setNotice('No stores selected. Select grocery stores in browsing to get price matches.');
  }catch{setNotice('Grocery prices could not load. Recipes still work; missing costs remain unknown.');}
  try{setPlan(createWeeklyPlan({budget:Number(budget),servings:Number(people),vegan,pantry:usePantry?pantry:[],maxMinutes:maxMinutes?Number(maxMinutes):undefined,exclude},products));setStep(3);}catch(error){setNotice(error instanceof Error?error.message:'Could not build a plan. Adjust your preferences and try again.');}finally{setBusy(false);}
 }
 function download(){if(!plan)return;const text=[`SaveHalf: seven dinners for ${people} people`,`${money(Number(budget))} budget; ${money(plan.known)} known subtotal; ${plan.missing} unpriced ingredients.`, 'Dinner-only estimate. Verify prices, stock and pack yields.',variety(plan),...plan.meals.flatMap((r,i)=>[`Day ${i+1}: ${r.title}`, ...r.ingredients.map(x=>`${FOOD[x.kind].label}: ${x.amount} ${x.unit}`),...r.steps]),'Combined shopping list',...plan.lines.map(l=>`${FOOD[l.ingredient.kind].label}: ${l.need} ${l.ingredient.unit} to buy; ${l.product?`${l.packs??'?'} packs, ${l.product.title}, ${l.product.store}, ${l.cost===null?'price unknown':money(l.cost)}, ${l.product.dealUrl}`:l.need?'price unknown':'in pantry'}`)].join('\n');downloadText('savehalf-weekly-dinners.txt',text,'text/plain');}
 function quantity(kind:FoodKind,value:string){
  const amount=Number(value);
  setPantry(rows=>[...rows.filter(p=>p.kind!==kind),...(Number.isFinite(amount)&&amount>0&&amount<=100000?[{id:'weekly-'+kind,kind,amount,unit:unit(kind) as PantryItem['unit'],date:'',dateType:'best-before' as const}]:[])]);
 }
 return <section className="weekly-meal-plan" aria-label="Weekly meal plan">
  <h3>Your week, your budget.</h3><ol className="weekly-progress" aria-label="Planning progress">{["Budget","Household","Pantry","Your week"].map((label,index)=><li key={label} aria-current={step===index?"step":undefined}>{index+1}. {label}</li>)}</ol>
  <p>Seven dinners, one per day, for your household. This budget covers these dinners only—not all food for the week. Fixed vegetarian recipes, including eggs, with a plant-ingredient option. Choose a budget, tell us how many people, then add pantry ingredients if you want.</p>
  {step===0&&<><h4>1. What is your weekly dinner budget?</h4><div className="assistant-starters">{['50','100','150'].map(n=><button key={n} aria-pressed={budget===n} onClick={()=>setBudget(n)}>{money(Number(n))}</button>)}</div><label>Custom budget (AUD)<input aria-label="Weekly dinner budget" type="number" min="1" max="5000" value={budget} onChange={e=>setBudget(e.target.value)}/></label>{!validBudget&&<p role="alert">Enter a budget above $0 and at most $5,000.</p>}<button disabled={!validBudget} onClick={()=>setStep(1)}>Next: household</button></>}
  {step===1&&<><h4>2. Who are we cooking for?</h4><label>People per dinner<input aria-label="People per dinner" type="number" min="1" max="8" value={people} onChange={e=>setPeople(e.target.value)}/></label><label><input type="checkbox" checked={vegan} onChange={e=>setVegan(e.target.checked)}/> Plant ingredients only (exclude egg recipes)</label><label>Maximum recipe time<select aria-label="Maximum recipe time" value={maxMinutes} onChange={e=>setMaxMinutes(e.target.value)}><option value="">Any time</option><option value="20">20 minutes</option><option value="30">30 minutes</option><option value="45">45 minutes</option></select></label><details><summary>Ingredients to leave out ({exclude.length})</summary><p>Filters recipe ingredients only. Check product labels for allergens and cross-contact.</p>{(Object.keys(FOOD) as FoodKind[]).map(k=><label key={k} style={{display:"block"}}><input type="checkbox" checked={exclude.includes(k)} onChange={()=>setExclude(rows=>rows.includes(k)?rows.filter(x=>x!==k):[...rows,k])}/>{FOOD[k].label}</label>)}</details><p>All recipes are meat-free. Check purchased product labels for ingredients, allergies and dietary suitability; this is not a nutritional assessment.</p><button onClick={()=>setStep(0)}>Back: budget</button><button disabled={!validPeople} onClick={()=>setStep(2)}>Next: pantry</button></>}
  {step===2&&<><h4>3. What ingredients do you already have?</h4><p>Enter usable quantities, not pack counts. Existing cupboard quantities are prefilled; past-date entries are excluded. These edits apply to this plan only.</p><button className="assistant-primary" disabled={busy||!validBudget||!validPeople} onClick={()=>void generate(false)}>{busy?"Checking grocery prices…":"Skip pantry and build my week"}</button><label>Find an ingredient<input aria-label="Find pantry ingredient" type="search" value={pantrySearch} onChange={e=>setPantrySearch(e.target.value)} placeholder="Rice, eggs, beans…"/></label><div className="weekly-pantry">{(Object.keys(FOOD) as FoodKind[]).filter(k=>FOOD[k].label.toLowerCase().includes(pantrySearch.trim().toLowerCase())).map(k=><label key={k}>{FOOD[k].label} ({unit(k)})<input aria-label={'Pantry '+FOOD[k].label} type="number" min="0" max="100000" step={k==='eggs'?'1':'any'} value={pantry.filter(p=>p.kind===k&&p.unit===unit(k)).reduce((n,p)=>n+p.amount,0)||''} onChange={e=>quantity(k,e.target.value)}/></label>)}</div><button disabled={busy} onClick={()=>setStep(1)}>Back: household</button><button className="assistant-primary" disabled={busy||!validBudget||!validPeople} onClick={()=>void generate()}>{busy?'Checking grocery prices…':'Build my seven-day plan'}</button></>}
  {notice&&<p role="status">{notice}</p>}
  {step===3&&plan&&<><h4>Seven dinners · {people} {Number(people)===1?'person':'people'} · {money(Number(budget))} budget</h4><p role="status"><strong>{plan.complete?plan.withinBudget?'Priced basket fits your dinner budget':'Priced basket exceeds your dinner budget':'Budget not verified — prices incomplete'}</strong></p><p>{money(plan.known)} known whole-pack subtotal · {plan.missing} unpriced ingredients. {plan.complete&&!plan.withinBudget&&`${money(plan.known-Number(budget))} over budget.`}</p><p>Prices use up to 200 current grocery listings from selected stores. Delivery, travel and additional food are excluded. Recipes may repeat; this shortlist is not a guarantee of the cheapest possible week. Freshness, stock, pack yield and cooking instructions must be checked before buying.</p><p aria-label="Recipe variety">{variety(plan)}</p><ol className="weekly-days">{plan.meals.map((r,i)=><li key={i}><details><summary><span className="weekly-day-label">Day {i+1}</span> {r.title} · {r.minutes} min · serves {r.servings}</summary><p>Amounts are before cooking; tinned ingredients may need drained-weight adjustment. Cook each day's meal separately; this is not a seven-day food-storage instruction.</p><ul>{r.ingredients.map(ingredient=><li key={ingredient.kind}>{FOOD[ingredient.kind].label}: {ingredient.amount} {ingredient.unit}</li>)}</ul><ol>{r.steps.map((s,n)=><li key={n}>{s}</li>)}</ol></details></li>)}</ol><h4>Combined shopping list &amp; where to buy</h4>{plan.lines.map(l=><article key={l.ingredient.kind+'|'+l.ingredient.unit}><strong>{FOOD[l.ingredient.kind].label}</strong><p>{l.ingredient.amount} {l.ingredient.unit} needed · {Math.min(l.owned,l.ingredient.amount)} owned · {l.need} to buy</p>{l.product?<><p>{l.packs??'?'} whole packs × {l.product.title} · {l.product.store} · {l.cost===null?'Pack cost unknown':money(l.cost)}</p><small>Price checked {new Date(l.product.lastSeenAt||'').toLocaleDateString('en-AU')}</small><a href={safeSource(l.product.dealUrl)} target="_blank" rel="noopener noreferrer">Check retailer price ↗</a></>:<p>{l.need?'No priced match — buy separately; cost unknown':'Already in your pantry'}</p>}</article>)}<button onClick={download}>Download plan & shopping list</button><button onClick={()=>{setStep(0);setPlan(null);setNotice('');}}>Change budget or ingredients</button></>}
 </section>;
}
