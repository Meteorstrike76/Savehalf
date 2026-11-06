export type CoverageRow={store:string;products:number|string;category?:string;reductions?:number};
export function coverageSummary(rows:unknown):{store:string;products:number}[];
export function coverageMetadata(rows:unknown):{title:string;description:string};
export function applyCoverageMetadata(doc:Document,rows:unknown):void;
export function renderCoverageMetadata(html:string,rows:unknown):string;
