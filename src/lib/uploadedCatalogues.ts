import batch from '@/data/uploadedCatalogueItems.json';
export type UploadedCatalogueItem = (typeof batch.rows)[number];
export const uploadedCatalogueItems = batch.rows;
export function uploadedCatalogueCurrent(row:UploadedCatalogueItem,now=Date.now()) {
 const checked=Date.parse(row.checkedAt);
 if(row.store.toLowerCase()==='aldi'||(row.page>=15&&row.page<=21)||!Number.isFinite(checked)||checked>now||now-checked>=24*3600000)return false;
 // Conservative AU date boundaries; unknown end dates remain unknown.
 if(now<Date.parse(row.validFrom+'T00:00:00+08:00'))return false;
 return !row.validTo||now<Date.parse(row.validTo+'T23:59:59+11:00');
}

// A price-sorted single source should not hide the other catalogue retailers.
export function diverseCatalogueRows(rows:UploadedCatalogueItem[]) {
 const groups=Array.from(new Set(rows.map(p=>p.store))).sort((a,b)=>a==='IGA'?-1:b==='IGA'?1:a.localeCompare(b)).map(s=>rows.filter(p=>p.store===s));
 const result:UploadedCatalogueItem[]=[];
 for(let i=0;i<Math.max(0,...groups.map(g=>g.length));i++)for(const group of groups)if(group[i])result.push(group[i]);
 return result;
}
