export type Suggestion={id:string;kind:string;retailer:string;title:string;source_url:string|null;price:number|null;conditions:string;status:string;review_note:string;created_at:string};
export const SUGGESTION_COLUMNS='id,kind,retailer,title,source_url,price,conditions,status,review_note,created_at';
export function safeSource(value:string|null){try{const url=new URL(value||'');return url.protocol==='https:'&&!url.username&&!url.password?url.href:undefined;}catch{return undefined;}}
