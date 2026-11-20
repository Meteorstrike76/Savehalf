import batch from '@/data/uploadedCatalogueItems.json';
export type UploadedCatalogueItem = (typeof batch.rows)[number] & {endDateBasis?:string};
export const uploadedCatalogueItems = batch.rows;
function validDay(value:unknown):value is string {
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
 const parsed=Date.parse(value+'T00:00:00Z');
 return Number.isFinite(parsed)&&new Date(parsed).toISOString().slice(0,10)===value;
}
export function uploadedCatalogueCurrent(row:UploadedCatalogueItem,now=Date.now()) {
 const checked=Date.parse(row.checkedAt);
 if(row.store.toLowerCase()==='aldi'||(row.page>=15&&row.page<=21)||!Number.isFinite(now)||!Number.isFinite(checked)||checked>now||!validDay(row.validFrom))return false;
 if(row.validTo!==null&&(!validDay(row.validTo)||row.validTo<row.validFrom))return false;
 // Date-only advertisements run through the entire end day in the edition's zone.
 // Unverified/national editions use the site's disclosed Sydney timezone.
 const zone=row.region==='NT'?'Australia/Darwin':row.region==='VIC'?'Australia/Melbourne':'Australia/Sydney';
 const parts=new Intl.DateTimeFormat('en-AU',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(now));
 const part=(type:string)=>parts.find(p=>p.type===type)!.value;
 const today=`${part('year')}-${part('month')}-${part('day')}`;
 if(today<row.validFrom)return false;
 return row.validTo?today<=row.validTo:now-checked<24*3600000;
}

// A price-sorted single source should not hide the other catalogue retailers.
export function diverseCatalogueRows(rows:UploadedCatalogueItem[]) {
 const groups=Array.from(new Set(rows.map(p=>p.store))).sort((a,b)=>a==='IGA'?-1:b==='IGA'?1:a.localeCompare(b)).map(s=>rows.filter(p=>p.store===s));
 const result:UploadedCatalogueItem[]=[];
 for(let i=0;i<Math.max(0,...groups.map(g=>g.length));i++)for(const group of groups)if(group[i])result.push(group[i]);
 return result;
}
