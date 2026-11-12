export const sourceLimits=store=>store==='Aldi'?{requests:13,bytes:12000000}:store==='Best & Less'?{requests:2,bytes:2000000}:store==='Coles'?{requests:5,bytes:4000000}:store==='Woolworths'?{requests:5,bytes:2000000}:store==='OzBargain'?{requests:4,bytes:250000}:{requests:store==='Big W'?28:26,bytes:8000000};
export const parserDrift=(previous,current)=>previous>=20&&current>0&&current<previous*.25;

// Latest first; saved retains the previous snapshot, so use audited row counts.
export const ZERO_ROW_FAILURE_LIMIT=3;
export function zeroRowCircuitOpen(history,threshold=ZERO_ROW_FAILURE_LIMIT){
 return Number.isInteger(threshold)&&threshold>0&&history.length>=threshold&&
  history.slice(0,threshold).every(r=>['failed','empty'].includes(r.status)&&r.rows===0);
}
