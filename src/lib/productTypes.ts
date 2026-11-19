export const PRODUCT_TYPES=['All types','Fresh','Meat & seafood','Frozen','Sweets','Snacks','Drinks','Dairy & eggs','Pantry','Health & beauty','Household','Home','Tech'] as const;
export type ProductType=(typeof PRODUCT_TYPES)[number];
// Browsing labels inferred from the advertised title; not dietary/allergen claims.
export function productTypes(title:string):ProductType[]{
 const t=title.toLowerCase(),tags:ProductType[]=[];
 if(/dishwash|laundry|detergent|toilet|fabric conditioner|disinfectant|cleaner|sanitiser|\bbref\b|\bomo\b/.test(t))return ['Household'];
 if(/razor|cleansing|cleanser|moisturiser|body (?:milk|lotion)|pimple|wax strips|revitalift|gentle wash|voltaren|metamucil|shampoo|toothpaste|makeup|suncare/.test(t))return ['Health & beauty'];
 if(/printer|monitor|laptop|notebook|tablet|smartphone|galaxy|television|\btv\b|headphones|speaker/.test(t)&&!/tv unit|tv cabinet|tv stand/.test(t))return ['Tech'];
 if(/cabinet|bookcase|curtain|shelving|trolley|sofa|chair|table|stool|bed frame|frying pan|buffet|tv unit|tv cabinet|tv stand/.test(t))return ['Home'];
 const frozen=/frozen|ice cream|ice blocks|water ice|zooper dooper|magnum sticks|paddle pop|drumstick|maxibon|calippo|cyclone|party pies|sausage rolls/.test(t);
 if(frozen)tags.push('Frozen');
 if(/\b(?:beef|ham|pork|lamb|chicken|turkey|bacon|steak|prawns?|salmon|basa|barramundi|tuna|seafood|fish|squid|calamari)\b/.test(t)&&!/flavou?r|hamper/.test(t))tags.push('Meat & seafood');
 if(/chocolate|freddo|caramello|mars chocolate|lollies|liquorice|allsorts|bullets|ferrero|favourites|baubles|marshmallow|protein bar|ice cream|drumstick|maxibon|calippo|paddle pop|ice blocks/.test(t))tags.push('Sweets');
 if(/chips|crackers|shapes|popcorn|twisties|burger rings|cheetos|doritos|pringles|jatz|clix|kettle/.test(t))tags.push('Snacks');
 if(/drink|water\b|cordial|coca-cola|fanta|sprite|schweppes|pepsi|coffee|red bull|powerade|gatorade/.test(t))tags.push('Drinks');
 if(/cheese|yoghurt|yogurt|butter\b|\beggs?\b|milk\b|cream\b/.test(t)&&!frozen)tags.push('Dairy & eggs');
 if(!frozen&&!/tinned|canned|cooking sauce|pasta sauce|sundried|juice/.test(t)&&/\b(?:tomatoes|lettuce|onions|beetroot|salad|avocado|mango|lemon|lime|mandarin|strawberr|cucumbers|potatoes|broccoli|basil|coriander|apples|bananas|grapes)\w*\b/.test(t))tags.push('Fresh');
 if(/rice\b|pasta\b|noodles|tinned|beans?|cereal|rolled oats|cooking sauce|sauce|sugar\b|baking mix|olive oil|sunflower oil|spaghetti|pesto|flour|glaze/.test(t)&&!tags.includes('Sweets')&&!tags.includes('Household'))tags.push('Pantry');
 return tags;
}
export function catalogueDepartment(title:string,store:string){const tags=productTypes(title);return tags.includes('Tech')?'Electronics':tags.includes('Home')||tags.includes('Household')||tags.includes('Health & beauty')||store==='IKEA'?'Home & Living':'Groceries';}
