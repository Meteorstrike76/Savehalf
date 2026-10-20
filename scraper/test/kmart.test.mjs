import test from 'node:test';import assert from 'node:assert/strict';import {kmartLinks,kmartProduct} from '../src/lib/kmart-html.mjs';
const script=x=>`<script type="application/ld+json">${JSON.stringify(x)}</script>`;
const product={ '@type':'Product',name:'Cleaning brush',sku:'123',url:'https://www.kmart.com.au/product/brush-123/',image:'https://assets.kmart.com.au/123.jpg',offers:{price:1,priceCurrency:'AUD',availability:'https://schema.org/InStock'}};
test('Kmart uses published was price; no fabricated reduction when absent',()=>{
 const html=script(product)+script({props:{pageProps:{productDetail:{products:[{item:{data:{SavePrice:'WAS $1.5'}}}]}}}});
 assert.equal(kmartProduct(html).original_price,1.5);assert.equal(kmartProduct(script(product)).original_price,null);
 assert.equal(kmartProduct(script({...product,offers:{...product.offers,priceCurrency:'USD'}})),null);
 assert.equal(kmartProduct(script({...product,offers:{...product.offers,availability:'https://schema.org/OutOfStock'}})),null);
});
test('Kmart listing only follows retailer product links',()=>{assert.deepEqual(kmartLinks(script({'@type':'ItemList',itemListElement:[{url:product.url},{url:product.url},{url:'https://other.example/product/x'},{url:'https://www.kmart.com.au/account/'}]})),[product.url]);});
