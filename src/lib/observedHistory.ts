export type PriceChange={id:number;title:string;price:number;was:number|null;observed_at:string;last_confirmed_at:string;checks:number};
export function validChange(x:unknown):x is PriceChange{const p=x as PriceChange;return !!p&&typeof p.title==='string'&&Number.isFinite(Number(p.price))&&Number(p.price)>0&&Number(p.price)<=5000&&Number.isFinite(Date.parse(p.observed_at))&&Number.isFinite(Date.parse(p.last_confirmed_at))&&Date.parse(p.last_confirmed_at)>=Date.parse(p.observed_at)&&Number.isInteger(p.checks)&&p.checks>0;}
export function observedStats(rows:PriceChange[],title:string,now=Date.now(),truncated=false){
 const data=rows.filter(validChange).filter(r=>r.title===title&&Date.parse(r.last_confirmed_at)<=now+300000&&Date.parse(r.last_confirmed_at)>=now-90*86400000&&Date.parse(r.observed_at)<=now).sort((a,b)=>Date.parse(a.observed_at)-Date.parse(b.observed_at));
 const checks=data.reduce((n,r)=>n+r.checks,0),from=data.length?Math.max(now-90*86400000,Date.parse(data[0].observed_at)):null;
 const span=data.length?Math.max(...data.map(r=>Date.parse(r.last_confirmed_at)))-from!:0;
 let median:number|null=null;
 if(!truncated&&checks>=3&&span>=14*86400000&&data.every(r=>Date.parse(r.observed_at)>=now-90*86400000)){let weight=0;for(const r of [...data].sort((a,b)=>Number(a.price)-Number(b.price))){weight+=r.checks;if(weight>=checks/2){median=Number(r.price);break;}}}
 return {data,checks,from,lowest:!truncated&&data.length?Math.min(...data.map(r=>Number(r.price))):null,median};
}
