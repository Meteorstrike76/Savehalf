export const RETAILER_GROUPS = ['All', 'Food & drink', 'Groceries', 'Tech & office', 'Fashion & sport', 'Home & auto', 'Beauty & care'] as const;
export type RetailerGroup = typeof RETAILER_GROUPS[number];
export const MORE_RETAILERS: {name: string; group: Exclude<RetailerGroup, 'All'>; url: string; note: string}[] = [
 {name:'IGA',group:'Groceries',url:'https://www.iga.com.au/value/',note:'Local catalogue offers; choose your IGA store to confirm prices'},
 {name:'Adore Beauty',group:'Beauty & care',url:'https://www.adorebeauty.com.au/c/specials.html',note:'Beauty specials; check codes, gifts and subscription conditions'},
 {name:'Sephora',group:'Beauty & care',url:'https://www.sephora.com.au/pages/clearance',note:'Beauty markdowns; membership and exclusions may apply'},
 {name:"McDonald's",group:'Food & drink',url:'https://www.mcdonalds.com/au/en-au/value.html',note:'Value offers and MyMacca’s app; eligibility varies'},
 {name:'KFC',group:'Food & drink',url:'https://www.kfc.com.au/menu/colonels-offers',note:'Colonel’s offers; select your restaurant for local prices'},
 {name:"Hungry Jack's",group:'Food & drink',url:'https://www.hungryjacks.com.au/vouchers',note:'Vouchers and app offers; check participating stores'},
 {name:"Domino's",group:'Food & drink',url:'https://www.dominos.com.au/offers',note:'National vouchers; store acceptance and surcharges vary'},
 {name:'Subway',group:'Food & drink',url:'https://order.subway.com/en-au/order/offers',note:'Local and app offers; participating restaurants only'},
 {name:'JB Hi-Fi',group:'Tech & office',url:'https://www.jbhifi.com.au/collections/clearance-corner',note:'Clearance electronics and entertainment'},
 {name:'Officeworks',group:'Tech & office',url:'https://www.officeworks.com.au/shop/officeworks/c/clearance',note:'Office essentials, tech and stationery'},
 {name:'The Good Guys',group:'Tech & office',url:'https://www.thegoodguys.com.au/clearance',note:'Appliances and electronics clearance'},
 {name:'Bing Lee',group:'Tech & office',url:'https://www.binglee.com.au/categories/clearance',note:'Clearance appliances and tech'},
 {name:'Cotton On',group:'Fashion & sport',url:'https://cottonon.com/AU/co/co-sale/',note:'Clothing and accessories on sale'},
 {name:'UNIQLO',group:'Fashion & sport',url:'https://www.uniqlo.com/au/en/spl/end-of-season-sale',note:'Seasonal clothing markdowns'},
 {name:'rebel',group:'Fashion & sport',url:'https://www.rebelsport.com.au/sale-and-offers/sale-clearance-and-multibuys',note:'Sport, footwear and multibuy offers'},
 {name:'Kathmandu',group:'Fashion & sport',url:'https://www.kathmandu.com.au/collections/clearance-sale',note:'Outdoor clothing and gear clearance'},
 {name:'IKEA',group:'Home & auto',url:'https://www.ikea.com/au/en/offers/',note:'Home offers; some require IKEA Family'},
 {name:'Supercheap Auto',group:'Home & auto',url:'https://www.supercheapauto.com.au/clearance',note:'Auto, tools and outdoor clearance'},
 {name:'Bunnings',group:'Home & auto',url:'https://www.bunnings.com.au/campaign/online-clearance-event',note:'Clearance campaign; check seller and location'},
 {name:'Chemist Warehouse',group:'Beauty & care',url:'https://www.chemistwarehouse.com.au/shop-online/promotions',note:'Health and beauty promotions; savings may compare with RRP'},
 {name:'Priceline',group:'Beauty & care',url:'https://www.priceline.com.au/c/sale',note:'Health, beauty and personal care sale'},
];

// These are discovery entries, not admitted catalogue collectors.
export const REQUESTED_RETAILERS = ['Priceline','Chemist Warehouse','IGA','Officeworks','Sephora'];
export const RETAILER_COVERAGE: Record<string,{status:string;detail:string;linkAllowed?:boolean}> = {
 Priceline:{status:'Source review pending',detail:'Sale page available; automated collection and reuse permissions need review. Pulse member prices can differ.'},
 'Chemist Warehouse':{status:'Permission required',detail:'Website terms prohibit crawlers and require consent for links. No direct collection is enabled.',linkAllowed:false},
 IGA:{status:'Local-store prices · permission required',detail:'Choose a local store. National prices are not assumed; republication and linking require consent.',linkAllowed:false},
 Officeworks:{status:'Source review pending',detail:'Clearance discovery only. Product-content reuse rights and local stock need confirmation.'},
 Sephora:{status:'Source review pending',detail:'No admitted direct collector. Check shade, size, Beauty Pass eligibility and exclusions.'},
};
