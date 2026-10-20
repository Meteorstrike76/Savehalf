import { browserListingAdapter } from './browserListing.mjs';
export default browserListingAdapter({
 store:'Target', base:'https://www.target.com.au', envVar:'TARGET_URLS',
 urls:[{url:'https://www.target.com.au/c/clearance',defaultCategory:'Clearance'}]
});
