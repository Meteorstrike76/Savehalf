export interface ReviewRow {
 store:string;
 externalId:string;
 title:string;
 price:number;
 was?:number;
 url:string;
 sourceUrl:string;
 region:string;
 checkedAt:string;
 promotionEndsAt:string;
 reviewed:boolean;
 image?:string;
}
export const MANUAL_STORES: string[];
export const MANUAL_COLUMNS: string[];
export function validateCandidate(row:ReviewRow,now?:number):string[];
export function importCandidates(csv:string,now?:number):ReviewRow[];
export function checkedBatch(rows:ReviewRow[],now?:number):ReviewRow[];
export function reviewedCsv(rows:ReviewRow[],now?:number):string;
