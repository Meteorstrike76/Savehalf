export const DENSITY_KEY='savehalf-compact-cards-v1';
export function readCompact(){try{return localStorage.getItem(DENSITY_KEY)==='true';}catch{return false;}}
export function priceRangeError(minimum:string,maximum:string){
 for(const value of [minimum,maximum])if(value!==''&&(!Number.isFinite(Number(value))||Number(value)<0||Number(value)>5000))return 'Enter prices between $0 and $5,000.';
 return minimum!==''&&maximum!==''&&Number(minimum)>Number(maximum)?'Minimum price must be no higher than maximum price.':'';
}
export function catalogueDate(value:string){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return value;
 const date=new Date(value+'T12:00:00Z');
 return Number.isNaN(date.getTime())?value:date.toLocaleDateString('en-AU',{day:'numeric',month:'short',year:'numeric',timeZone:'Australia/Sydney'});
}

