const test=require('node:test'),assert=require('node:assert/strict'),React=require('react');
const {renderToStaticMarkup}=require('react-dom/server'),{JSDOM}=require('jsdom'),fs=require('node:fs');
const {execFileSync}=require('node:child_process');
const ref=process.env.B01_LEGACY_REF;
let source=fs.readFileSync('src/components/FeedDealCard.tsx','utf8');
if(ref){
 // Read main's actual old JSX without checking out or modifying any branch.
 const app=execFileSync('git',['show',`${ref}:src/App.tsx`],{encoding:'utf8'});
 const start=app.indexOf('<article className="product-card"'),end=app.indexOf('</article>',start)+10;
 assert(start>=0&&end>start,'Legacy deal card must exist');
 source=`import type {CSSProperties} from 'react';
 import {Heart,Eye,ChefHat,ArrowUpRight,GitCompareArrows} from 'lucide-react';
 import ProductImage from '@/components/ProductImage';
 import {unitPrice} from '@/lib/shopping';import {foodKind} from '@/lib/meal/recipes';
 const money=(n:number)=>new Intl.NumberFormat('en-AU',{style:'currency',currency:'AUD'}).format(n);
 function StoreLabel({store}){return <span>{store}</span>}
 export default function LegacyCard({deal:d}){
 const index=0,saved=[],user=null,cloud={loading:false,pending:new Set()},previousVisit=0,follow='',watch={watches:[]},list=[],mealFoods=[],compare=[];
 const save=()=>{},setDetail=()=>{},hideProduct=()=>{},toggleWatch=()=>{},addToList=()=>{},setMealFoods=()=>{},toggleCompare=()=>{};
 return (${app.slice(start,end)});}`;
}
const code=require('esbuild').buildSync({stdin:{contents:source,resolveDir:require('node:path').resolve('src/components'),sourcefile:'fixture-card.tsx',loader:'tsx'},alias:{'@':require('node:path').resolve('src')},bundle:true,write:false,platform:'node',format:'cjs',external:['react','react-dom'],jsx:'automatic'}).outputFiles[0].text;
const mod={exports:{}};new Function('require','module','exports',code)(require,mod,mod.exports);
const deal={id:'fixture',title:'Fixture rice 1kg',discountPrice:4,originalPrice:8,discountPct:50,store:'Aldi',category:'Groceries',imageUrl:null,source:'scraper',publishedAt:'2026-11-06',lastSeenAt:'2026-11-06',isActive:true};
const noop=()=>{};
function visibleCard(){const doc=new JSDOM(renderToStaticMarkup(React.createElement(mod.exports.default,{deal,index:0,saved:false,saveBusy:false,previousVisit:0,follow:'',watched:false,listed:false,mealSelected:false,compared:false,onSave:noop,onDetail:noop,onHide:noop,onWatch:noop,onList:noop,onMeal:noop,onCompare:noop}))).window.document;return doc.querySelector('article.product-card').textContent;}
test('B01 rendered actual card qualifies the price comparison',()=>{
 const text=visibleCard();assert.match(text,/Retailer-reported 50% reduction/);assert.match(text,/\$4\.00 below retailer reference/);
});
test('B01 rendered actual card contains no bare discount/saving claim',()=>{
 const text=visibleCard();assert(!text.includes('% OFF'),'bare % OFF must not be visible');assert(!text.includes('Save $'),'bare Save $ must not be visible');
});
