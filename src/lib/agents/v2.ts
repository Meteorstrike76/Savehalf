import {z} from 'zod';
import {blockedRequest,validatePlan,stores,type Plan} from './core.ts';
export const barcodeSchema=z.string().regex(/^\d{8}$|^\d{12,14}$/).refine(value=>{const digits=[...value].map(Number);const check=digits.pop()!;return (10-digits.reverse().reduce((sum,n,i)=>sum+n*(i%2===0?3:1),0)%10)%10===check;},'Check the barcode digits');
export const reportSchema=z.object({dealId:z.uuid(),reason:z.enum(['price','expired','image','conditions'])}).strict();
export const preferenceSchema=z.object({budget:z.number().min(0).max(5000).optional(),avoidBrands:z.array(z.string().trim().min(1).max(30)).max(5).default([])}).strict();
export type Route={kind:'tool';plan:Plan}|{kind:'planner';items:{item:string;quantity:number}[];budget:number}|{kind:'faq';message:string}|{kind:'model'}|{kind:'blocked';message:string};
export function routeQuestion(raw:string,chosen:string[]):Route {
 const text=raw.trim().replace(/\s+/g,' ');if(!text||text.length>240||blockedRequest(text))return {kind:'blocked',message:'Please ask about deals, catalogue prices or shopping lists.'};
 for(const store of stores)if(new RegExp(`\\b${store.replace(/ & /g,' (?:&|and) ')}\\b`,'i').test(text)&&!chosen.includes(store))return {kind:'blocked',message:'That store is outside your selection. Change your stores or choose another store.'};
 if(/^(?:help|what can you do|how does savehalf work|are prices verified)\??$/i.test(text))return {kind:'faq',message:'I search recorded catalogue prices, compare matched products and calculate shopping lists. Coverage is incomplete. Every price needs a source and last-checked time; check the retailer before buying.'};
 if(/\bcatalogue\b|\bspecials? (?:start|end)\b|\bwednesday\b/i.test(text))return {kind:'faq',message:'Coles and Woolworths listings must pass the current Wednesday promotion-week freshness check. Actual start/end dates vary by offer; check the promotion conditions on the retailer source. I do not have a verified full catalogue calendar.'};
 const budget=text.match(/\bbudget\s*\$?\s*(\d+(?:\.\d{1,2})?)/i);
 if(budget){const source=text.replace(budget[0],'').replace(/[.\s]+$/,'').trim();const parts=source.split(/[,;\n]+/).map(s=>s.trim()).filter(Boolean);const items=parts.map(s=>{const m=s.match(/^(\d{1,2})\s*(?:x\s*)?([a-z][a-z '-]{0,55})$/i);return m?{quantity:Number(m[1]),item:m[2].trim()}:null;});if(items.length&&items.length<=12&&items.every(i=>i&&i.quantity>=1&&i.quantity<=20)&&Number(budget[1])<=5000)return {kind:'planner',items:items as {quantity:number;item:string}[],budget:Number(budget[1])};return {kind:'model'};}
 if(/party|substitut|recipe|allerg|diet|healthy|recommend|best .* for|plan (?:a|my)/i.test(text))return {kind:'model'};
 const history=text.match(/^history\s+([0-9a-f-]{36})$/i);if(history){try{return {kind:'tool',plan:validatePlan({tool:'get_price_history',productId:history[1],query:''},chosen)};}catch{return {kind:'blocked',message:'Choose a valid product for history.'};}}
 const named=chosen.filter(s=>new RegExp(`\\b${s}\\b`,'i').test(text));let query=text;
 for(const s of stores)query=query.replace(new RegExp(`\\b${s}\\b`,'ig'),'');
 const max=text.match(/(?:under|below|up to)\s*\$?\s*(\d+(?:\.\d{1,2})?)/i);const half=/half[ -]?price|50%/i.test(text);const unit=/unit (?:price|cost)|per ?100(?:g|ml)|per each/i.test(text);
 query=query.replace(/(?:by )?unit (?:price|cost)|per ?100(?:g|ml)|per each/ig,'').replace(/(?:under|below|up to)\s*\$?\s*\d+(?:\.\d{1,2})?/ig,'').replace(/half[ -]?price|50%/ig,'').replace(/\b(?:cheapest|cheap|compare|prices?|find|show|me|at|from|this|week|what'?s|deals?|on|please)\b/ig,'').replace(/[?]/g,'').replace(/\s+/g,' ').trim();
 const cheap=text.match(/^(?:cheap eats|food offers) (?:in )?([a-z '-]+?)(?: under| below| up to|$)/i);
 try{if(cheap)return {kind:'tool',plan:validatePlan({tool:'find_cheap_eats',suburb:cheap[1].trim(),query:'',maxPrice:max?Number(max[1]):5000},chosen)};
 if((query||half||max||named.length)&&query.length<=60&&/^[a-z0-9 '&.-]+$/i.test(query)&&text.split(' ').length<=16)return {kind:'tool',plan:validatePlan({tool:unit?'get_unit_price_ranking':/^compare\b/i.test(text)?'compare_prices':'search_deals',query,stores:named.length?named:chosen,maxPrice:max?Number(max[1]):5000,minDiscount:half?50:0},chosen)};
 }catch{return {kind:'blocked',message:'Please check your stores and price range.'};}return {kind:'model'};
}
