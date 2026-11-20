import {CATEGORIES} from './stores';
import type {Deal} from './supabase';
import {catalogueDepartment} from './productTypes';
import type {UploadedCatalogueItem} from './uploadedCatalogues';
export type CategoryTotals=Record<string,number>;
export function emptyTotals():CategoryTotals{return Object.fromEntries(['All',...CATEGORIES].map(c=>[c,0]));}
export function dealTotals(rows:Deal[]):CategoryTotals{const totals=emptyTotals();for(const row of rows){if(row.category in totals){totals[row.category]++;totals.All++;}}return totals;}
export function combinedTotals(collected:CategoryTotals|null,ads:UploadedCatalogueItem[]):CategoryTotals|null{
 if(!collected)return null;const totals={...collected};for(const ad of ads){totals[catalogueDepartment(ad.name,ad.store)]++;totals.All++;}return totals;
}
