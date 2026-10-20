import { browserListingAdapter } from './browserListing.mjs';

// Verify these URLs in a browser; override with BIGW_URLS="https://...,https://..." if they move.
export default browserListingAdapter({
  store: 'Big W',
  base: 'https://www.bigw.com.au',
  envVar: 'BIGW_URLS',
  urls: [
    { url: 'https://www.bigw.com.au/clearance', defaultCategory: 'Clearance' },
    { url: 'https://www.bigw.com.au/sale', defaultCategory: 'Clearance' },
  ],
});
