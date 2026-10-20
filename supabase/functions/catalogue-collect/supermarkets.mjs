import {buildDeal,slugify} from './normalize.mjs';
import {robotsAllows} from './robots.mjs';
const COLES='https://www.coles.com.au',WOOLIES='https://www.woolworths.com.au';
export function colesPage(html){
 const script=String(html).match(/<script\b[^>]*\bid=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i);if(!script)throw Error('Coles product data missing; page requires review');
 const result=JSON.parse(script[1])?.props?.pageProps?.searchResults;if(!Array.isArray(result?.results))throw Error('Coles listing schema changed');
 const rows=result.results.map(p=>{const q=p.pricing||{};
  if(p._type!=='PRODUCT'||p.availability!==true||q.multiBuyPromotion||/MULTI|MEMBER|LOYALTY|COUPON/i.test(q.specialType||'')||p.restrictions?.tobaccoAgeRestrictionFlag||p.restrictions?.liquorAgeRestrictionFlag)return null;
  if(typeof q.now!=='number'||typeof q.was!=='number'||q.now<=0||q.was<q.now*2)return null;
  const title=[p.brand,p.name,p.size].filter(Boolean).join(' '),img=p.imageUris?.find(i=>i.type==='default')?.uri||p.imageUris?.[0]?.uri;
  return buildDeal({store:'Coles',externalId:p.id,title,price:q.now,was:q.was,image:img?'https://productimages.coles.com.au/productimages'+img:null,url:'/product/'+slugify(title)+'-'+p.id,base:COLES,defaultCategory:'Groceries',minDiscount:50});
 }).filter(Boolean);
 return {rows,start:Number(result.start),pageSize:Number(result.pageSize)||48,total:Number(result.noOfResults)||0};
}
export function wooliesPage(raw){
 const result=typeof raw==='string'?JSON.parse(raw):raw;if(!Array.isArray(result?.Bundles))throw Error('Woolworths product schema unavailable');
 const rows=result.Bundles.flatMap(b=>b.Products||[]).map(p=>{
  if(p.IsMarketProduct||p.IsForCollection===false&&p.IsForDelivery===false||p.IsAvailable===false||p.IsInStock===false||p.IsTobacco||p.IsLiquor||p.IsMemberPrice||p.IsRewardCardOffer)return null;
  if(typeof p.Price!=='number'||typeof p.WasPrice!=='number'||p.Price<=0||p.WasPrice<p.Price*2)return null;
  if(!p.Stockcode||!(p.Name||p.DisplayName))return null;
  const title=p.Name||p.DisplayName;
  return buildDeal({store:'Woolworths',externalId:p.Stockcode,title,price:p.Price,was:p.WasPrice,image:p.MediumImageFile||p.SmallImageFile,url:'/shop/productdetails/'+p.Stockcode+'/'+(p.UrlFriendlyName||slugify(title)),base:WOOLIES,defaultCategory:'Groceries',minDiscount:50});
 }).filter(Boolean);
 return {rows,count:result.Bundles.reduce((n,b)=>n+(b.Products?.length||0),0)};
}
export async function collectSupermarket(store,get){
 const base=store==='Coles'?COLES:WOOLIES;const robots=await get(base+'/robots.txt');let rows=[],attempted=1;const seen=new Set();
 for(let page=1;page<=4;page++){
  const url=store==='Coles'?base+'/on-special?filter_Special=halfprice'+(page>1?'&page='+page:''):base+'/apis/ui/browse/category';
  if(!robotsAllows(robots,url))throw Error(store+' robots policy does not permit this listing');
  const options=store==='Coles'?{}:{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify({categoryId:'specialsgroup.half-price',pageNumber:page,pageSize:36,sortType:'TraderRelevance',url:'/shop/browse/specials/half-price',location:'/shop/browse/specials/half-price',formatObject:'{"name":"Half Price"}',isSpecial:true,isBundle:false,isMobile:false,filters:[],token:''})};
  const raw=await get(url,options);attempted++;const parsed=store==='Coles'?colesPage(raw):wooliesPage(raw);
  if(store==='Coles'&&parsed.start!==(page-1)*parsed.pageSize)throw Error('Coles pagination changed; import held for review');
  const fresh=parsed.rows.filter(r=>!seen.has(r.external_id));for(const r of fresh)seen.add(r.external_id);rows.push(...fresh);
  if(store==='Coles'&&(parsed.start+parsed.pageSize>=parsed.total)||store==='Woolworths'&&parsed.count<36)break;
 }
 return {rows:rows.slice(0,200),attempted,sales:Math.min(rows.length,200)};
}
