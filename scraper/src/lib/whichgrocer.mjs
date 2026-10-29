import {classify} from './normalize.mjs';
const stores={coles:['Coles','www.coles.com.au'],woolworths:['Woolworths','www.woolworths.com.au'],big_w:['Big W','www.bigw.com.au'],kmart:['Kmart','www.kmart.com.au'],chemist_warehouse:['Chemist Warehouse','www.chemistwarehouse.com.au'],priceline:['Priceline','www.priceline.com.au']};
export function providerRows(pages,now=Date.now()){
 if(!Array.isArray(pages)||pages.length>8)throw Error('At most eight provider pages');
 const rows=new Map();
 for(const page of pages){if(!Array.isArray(page.data)||page.data.length>25)throw Error('Expected provider page of at most 25 products');for(const p of page.data){
  const store=stores[p.store],updated=Date.parse(p.updated_at);if(!store||p.currency!=='AUD'||p.out_of_stock!==false||p.archived||!Number.isFinite(p.price)||p.price<=0||p.price>5000||typeof p.id!=='string'||p.id.length>120||!p.id.startsWith(p.store+'_')||typeof p.name!=='string'||p.name.length<3||!Number.isFinite(updated)||updated>now||now-updated>=7*86400000)continue;
  let u;try{u=new URL(p.url);}catch{continue;}if(u.protocol!=='https:'||u.hostname!==store[1]||u.username||u.password)continue;
  const avg=p.price_stats?.average_30d;rows.set(p.id,{id:p.id,store:store[0],title:p.name.slice(0,200),price:p.price,average_30d:Number.isFinite(avg)&&avg>0?avg:null,product_url:u.href,image_url:typeof p.image_url==='string'&&p.image_url.startsWith('https://images.whichgrocer.com/')?p.image_url:null,category:classify(p.name,['coles','woolworths'].includes(p.store)?'Groceries':'Clearance'),source_updated_at:new Date(updated).toISOString()});
 }}return [...rows.values()];
}
export function projectedProviderCount(current,rows,existingIds){
 if(!Number.isInteger(current)||current<0)throw Error('Invalid stored row count');
 const existing=new Set(existingIds);return current+new Set(rows.map(p=>p.id).filter(id=>!existing.has(id))).size;
}
