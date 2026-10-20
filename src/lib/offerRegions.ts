export const OFFER_REGIONS=['All locations','Hide clearly interstate offers','NSW or national mentions'] as const;
export type OfferRegion=typeof OFFER_REGIONS[number];
const STATES=['NSW','VIC','QLD','WA','SA','TAS','ACT','NT'];
export function regionHint(title:string):{kind:'nsw'|'national'|'interstate'|'unknown';label:string}{
 // Only explicit location headings and exclusions: a casual city mention is not availability evidence.
 const excluded=[...title.matchAll(/\b(?:excl(?:ude|udes|uding)?\.?|except)\s*[:.]?\s*((?:(?:NSW|VIC|QLD|WA|SA|TAS|ACT|NT)\b[\s,/&]*)+)/gi)].flatMap(m=>m[1].toUpperCase().match(/\b(?:NSW|VIC|QLD|WA|SA|TAS|ACT|NT)\b/g)||[]);
 if(excluded.includes('NSW'))return {kind:'interstate',label:'Headline excludes NSW'};
 const heading=title.match(/^\[([^\]]{1,70})\]/)?.[1].trim().toUpperCase()||'';
 const locations=heading.split(/\s*[,/&+]\s*|\s+AND\s+/).filter(Boolean);
 if(locations.length&&locations.every(x=>STATES.includes(x)||['SYDNEY','NEW SOUTH WALES'].includes(x)))return locations.some(x=>['NSW','SYDNEY','NEW SOUTH WALES'].includes(x))?{kind:'nsw',label:'NSW mentioned; confirm participating stores'}:{kind:'interstate',label:`Location heading: ${heading}`};
 if(/\bnationwide\b|\bnational stores\b|\ball states\b|\baustralia.?wide\b/i.test(title))return {kind:'national',label:'National availability mentioned; confirm locally'};
 return {kind:'unknown',label:'Location unverified; check your store'};
}
export function matchesRegion(title:string,filter:OfferRegion){const {kind}=regionHint(title);return filter==='All locations'||filter==='Hide clearly interstate offers'&&kind!=='interstate'||filter==='NSW or national mentions'&&['nsw','national'].includes(kind);}
