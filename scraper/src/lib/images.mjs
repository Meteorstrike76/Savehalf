const KEYS=['contentUrl','url','src','uri','href','imageUrl','imageURL','image_url','image','images','primaryImage','thumbnail','thumbnailUrl','imageUris'];
export const decodeEntities=s=>String(s).replace(/&amp;|&#38;|&#x26;/gi,'&').replace(/&quot;|&#34;/gi,'"').replace(/&apos;|&#39;/gi,"'").replace(/&nbsp;/gi,' ');
export function imageUrl(value,base,depth=0){
 if(depth>6||value==null)return null;
 if(typeof value==='string'){
 const raw=decodeEntities(value).trim();if(!raw||raw.length>4000||/[{}]/.test(raw)||/^(?:data|javascript|blob):/i.test(raw))return null;
 try{const u=new URL(raw,base);if(u.protocol!=='https:'||u.username||u.password||/(?:^|\/)(?:placeholder|no[-_]?image|missing[-_]?image|spacer|transparent|logo)(?:[_.\/]|$)/i.test(u.pathname))return null;return u.href;}catch{return null;}
 }
 if(Array.isArray(value)){for(const v of value.slice(0,20)){const u=imageUrl(v,base,depth+1);if(u)return u;}}
 else if(typeof value==='object'){for(const k of KEYS){const u=imageUrl(value[k],base,depth+1);if(u)return u;}}
 return null;
}
export function jsonProducts(scripts){
 const found=[];const visit=(v,depth=0)=>{if(!v||typeof v!=='object'||depth>6)return;if(Array.isArray(v)){v.slice(0,100).forEach(x=>visit(x,depth+1));return;}
 const type=Array.isArray(v['@type'])?v['@type']:[v['@type']];if(type.includes('Product')){found.push(v);return;}if(v['@graph'])visit(v['@graph'],depth+1);};scripts.forEach(s=>visit(s));return found;
}
function attributes(tag){return Object.fromEntries([...tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)].map(m=>[m[1].toLowerCase(),decodeEntities(m[2]??m[3])]));}
export function productImage(html,product,base){
 const primary=imageUrl(product?.image??product?.images,base);if(primary)return primary;
 const metas=[...html.matchAll(/<meta\b[^>]*>/gi)].map(m=>attributes(m[0]));
 for(const key of ['og:image:secure_url','og:image','twitter:image','twitter:image:src']){const m=metas.find(m=>(m.property??m.name)?.toLowerCase()===key);const u=imageUrl(m?.content,base);if(u)return u;}
 // Lazy images must identify this product; never choose a logo or recommendation.
 const title=decodeEntities(product?.name??'').trim().toLowerCase();const sku=String(product?.sku??'');
 for(const match of html.matchAll(/<img\b[^>]*>/gi)){const a=attributes(match[0]);const identity=title&&a.alt?.trim().toLowerCase()===title;const src=[a['data-src'],a['data-lazy-src'],a.src].find(s=>s&&sku.length>=4&&s.includes(sku));if(!identity&&!src)continue;
 const srcset=a['data-srcset']??a.srcset;const choices=srcset?[...srcset.matchAll(/(?:^|,\s*)(\S+)\s+(\d+)w/g)].sort((a,b)=>Number(b[2])-Number(a[2])).map(m=>m[1]):[];
 const u=imageUrl([...choices,a['data-src'],a['data-lazy-src'],a.src],base);if(u)return u;
 }return null;
}
