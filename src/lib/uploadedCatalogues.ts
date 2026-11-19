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
