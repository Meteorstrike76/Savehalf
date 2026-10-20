export function providerFresh(p:{source_updated_at:string;retrieved_at:string},now=Date.now()){
 const source=Date.parse(p.source_updated_at),retrieved=Date.parse(p.retrieved_at);
 return Number.isFinite(source)&&Number.isFinite(retrieved)&&source<=retrieved&&retrieved<=now&&now-retrieved<72*3600000&&now-source<7*86400000;
}
