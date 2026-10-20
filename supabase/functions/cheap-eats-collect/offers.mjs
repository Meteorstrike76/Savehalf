export const CAMPAIGN='https://www.ikea.com/au/en/campaigns/ikea-family-fridays-pubb5f98bd0/';
export const BISTRO='https://www.ikea.com/au/en/stores/restaurant/ikea-bistro-pub7d957560/';
export const EATCLUB='https://eatclub.com.au/venues/sydney';
export const TERMS='https://www.ikea.com/au/en/files/pdf/87/fa/87fa38aa/ikea-au-loyalty-members-offer-ikea-family-friday-september-2026-terms-and-conditions.pdf';
export const VENUES=[['tempe','Tempe'],['rhodes','Rhodes'],['marsden-park','Marsden Park']];
export function plain(html){return html.replace(/<!--[\s\S]*?-->/g,'').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;|&#160;/gi,' ').replace(/&amp;/g,'&').replace(/&#39;|&apos;/g,"'").replace(/&quot;/g,'"').replace(/\s+/g,' ').trim();}
export function blocks(html){return [...html.matchAll(/<h3\b[^>]*>([\s\S]*?)<\/h3>([\s\S]*?)(?=<h3\b|$)/gi)].map(m=>({name:plain(m[1]),text:plain(m[2]),raw:m[0],offset:m.index}));}
export function ikeaRows(html,kind,now=new Date()){
 const list=blocks(html);const rows=[];
 if(kind==='friday'&&now.toISOString().slice(0,10)>'2026-12-18')return rows;
 const meals=kind==='friday'?['Regular vegetarian breakfast','Regular breakfast','Fish balls','Plant balls','Falafel and couscous','Swedish meatballs']:['Veggie dog','Hot dog','Chicken tenders'];
 for(const name of meals){const b=list.find(b=>b.name.toLowerCase()===name.toLowerCase());if(!b)continue;
 const match=kind==='friday'?b.text.match(/IKEA Family price:\s*\$\s*(\d+(?:\.\d+)?)/i):b.text.match(/^.{0,180}?\$\s*(\d+(?:\.\d+)?)/i);if(!match)continue;
 const price=Number(match[1]);if(!Number.isFinite(price)||price<=0||price>15||(kind==='friday'&&price!==5))continue;
 for(const [slug,area] of VENUES)rows.push({id:`ikea-${slug}-${kind}-${name.toLowerCase().replace(/\W+/g,'-')}`,venue:`IKEA ${area}`,area,title:name,price,discount_pct:null,kind:kind==='friday'?'weekly':'menu',source_url:kind==='friday'?CAMPAIGN:BISTRO,venue_url:`https://www.ikea.com/au/en/stores/${slug}/`,terms_url:kind==='friday'?TERMS:null,available_days:kind==='friday'?[5]:[0,1,2,3,4,5,6],expires_on:kind==='friday'?'2026-12-18':null,conditions:kind==='friday'?`Fridays only. IKEA Family card required. ${name.toLowerCase().includes('breakfast')?'Breakfast until 11 am.':'Main dishes after 11 am.'} Participating stores; while stocks last.`:'Bistro item, not a full meal deal. Confirm local menu, opening hours and availability.',last_verified_at:now.toISOString(),is_active:true});
 }return rows;
}
export function eatclubRows(html,now=new Date()){
 const rows=[];const seen=new Set();
 for(const b of blocks(html)){
 const pct=b.text.match(/\b(\d{1,2})\s*%\s*off\b/i);if(!pct||Number(pct[1])>50||Number(pct[1])<=0||!b.name||b.name.length>100)continue;
 // Venue headings may be wrapped in an anchor or contain one.
 const prior=html.slice(Math.max(0,b.offset-500),b.offset);const href=(b.raw.match(/href=["']([^"']+)["']/i)||[...prior.matchAll(/href=["']([^"']+)["']/gi)].at(-1))?.[1];
 let url;try{url=new URL(href,EATCLUB);}catch{continue;}if(url.hostname!=='eatclub.com.au'||!/^\/venues?\//.test(url.pathname)||url.pathname==='/venues/sydney'||seen.has(url.pathname))continue;
 const areaMatch=b.raw.match(/<a\b[^>]*href=["']\/venues\/sydney\/[^"']+["'][^>]*>([\s\S]*?)<\/a>/i);
 seen.add(url.pathname);rows.push({id:'eatclub-'+url.pathname.replace(/\W+/g,'-'),venue:b.name,area:areaMatch?plain(areaMatch[1]):'Sydney',title:'Restaurant discount',price:null,discount_pct:Number(pct[1]),kind:'discount',source_url:url.href,venue_url:url.href,terms_url:'https://eatclub.com.au/terms',available_days:[],expires_on:null,conditions:'Discount listed on EatClub, not a confirmed meal price or reservation. Check live times, eligibility and redemption/payment conditions in the EatClub app before visiting.',last_verified_at:now.toISOString(),is_active:true});if(rows.length>=20)break;
 }return rows;
}
export async function getPage(url){
 if(![CAMPAIGN,BISTRO,EATCLUB].includes(url))throw Error('Source not allowed');
 const response=await fetch(url,{redirect:'error',signal:AbortSignal.timeout(12000),headers:{'User-Agent':'SaveHalf/1.0 (+https://savehalf.vercel.app; daily public offer check)'}});
 if(!response.ok||!response.headers.get('content-type')?.includes('text/html'))throw Error('Source unavailable');
 const reader=response.body.getReader();const parts=[];let bytes=0;try{for(;;){const {done,value}=await reader.read();if(done)break;bytes+=value.length;if(bytes>2500000)throw Error('Source too large');parts.push(value);}}finally{await reader.cancel();}
 const merged=new Uint8Array(bytes);let pos=0;for(const p of parts){merged.set(p,pos);pos+=p.length;}return new TextDecoder().decode(merged);
}
export async function collectOffers(get=getPage,now=new Date()){
 const results=[];for(const [key,url] of [['friday',CAMPAIGN],['bistro',BISTRO],['eatclub',EATCLUB]]){
 try{const html=await get(url);const rows=key==='eatclub'?eatclubRows(html,now):ikeaRows(html,key,now);results.push({key,rows,status:rows.length?'ok':'review',message:rows.length?`${rows.length} offers checked`:'No recognised offers. Source layout or promotion needs review.'});}catch{results.push({key,rows:[],status:'failed',message:'Source unavailable; previous checks are not refreshed.'});}
 }return results;
}
