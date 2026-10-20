# Retailer expansion — 9 October 2026, Sydney

## Released now

The More stores directory contains 13 official retailer links. Filtering and searching happen in the browser. No database reads, retailer requests, image downloads or automated scraping are added by opening this directory. Clicking a link opens the retailer's own site. These retailers are not integrated into the collected catalogue.

| Phase | Candidates | Reason / collection caution |
| --- | --- | --- |
| First pilot | JB Hi-Fi, Officeworks, Best & Less | Adds electronics, office essentials and family fashion. Test page access, identifiers and verified reductions first. |
| Second pilot | Bing Lee, The Good Guys, Cotton On, Kathmandu | More electronics and fashion. Model variants, RRP labels and clearance stock need care. |
| Later | UNIQLO, rebel, IKEA, Supercheap Auto | Seasonal campaigns, multibuys, member prices and location-specific stock need explicit labels. |
| Link-first | Bunnings, Chemist Warehouse, Priceline | Marketplace seller attribution, location and changing promotion categories; personal care only in any future imported feed. |

## Proposed collection budget — not enabled

- Test at most three new retailers, once per day each.
- Per retailer: one listing request plus at most five detail requests, and at most 20 verified offers saved.
- Total ceiling: 18 source requests and 60 offers per day, or 558 source requests in a 31-day month. This is a request ceiling, not a promise that pages will yield products.
- Use existing Supabase collection infrastructure only after checking current account execution, storage and egress usage. No paid services, AI APIs, tokens, proxies or extra analytics.
- Skip inaccessible sources; back off after failures. Respect source access rules. Never synthesize prices, reductions or photos.
- Keep existing collectors unchanged during the pilot. Replace a failing source before expanding again. Retain the current 72-hour public product freshness rule.
- Expand by two retailers only after seven days of reliable parsing and measured quota headroom. Do not schedule all 14 candidates at once.

## Release checks

The released UI prioritises products before source diagnostics, groups the two budget tools, adds removable active filter chips and shorter mobile navigation, and uses local styles and icons. Directory cards provide explicit external-link labels, keyboard focus outlines and reduced-motion support. No new dependencies or recurring jobs were added.


## Pilot enabled — 9 October 2026

Best & Less returned 20 sale variants with current/original prices, variant IDs, colours, sizes and images. The hosted Supabase test saved all 20 from two source requests in about two seconds. The new daily job `savehalf-bestless` runs at 19:35 UTC: 06:35 Sydney during daylight saving, 05:35 in winter. Its first scheduled run is 10 October; the 9 October run was a manual verification.

The adapter checks robots.txt then one sale page, with at most 20 imported variants and no pagination or detail requests. It rejects missing AUD context, absent prices/photos, out-of-stock variants and products with conditional promotions. It uses published sale_price and price values; it does not compute member discounts. Titles include the listed variant colour/size. Prices and size availability must still be confirmed at checkout.

Only one run per Sydney day is allowed. Failed runs pause this pilot for three days; skipped days make no Edge invocation from the cron helper. Existing collectors retain their limits and schedules. Source bodies are streamed with a 3.5 MB cap (robots 50 KB), a 12-second timeout, and no redirects for this pilot. The feed still excludes products older than 72 hours.

JB Hi-Fi and Officeworks returned HTTP 403 during the direct access test. They remain discovery links with no scheduled collector. Best & Less is now in the product feed, leaving 13 external-only directory entries.

Database size at review was 12,752,563 bytes versus the documented 500 MB free allowance. Account-wide egress and invocation usage are not available through the installed tools; this is not a claim of a complete billing review. The added schedule is capped at 31 collection invocations / 62 source requests in a 31-day month, before failure pauses. No AI tokens, paid service or billing change was introduced.
