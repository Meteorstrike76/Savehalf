# Demo readiness — 29 October 2026 (Sydney)

## Published data refresh

Four authorised WhichGrocer specials pages returned 100 rows; the existing stock, URL, currency and seven-day source freshness validator admitted 99: Coles 25, Woolworths 24, BIG W 25, Kmart 25. Source update date is 27 October. Four credits were used, leaving 181 of this account's 200 monthly credits. New retrieval timestamps reflect actual retrieval, not the source update time. No backend API key or unattended WhichGrocer schedule was provisioned. Attribution and 72-hour public snapshot expiry remain enforced; these are provider-average comparisons, not weekly half-price claims.

## Best & Less root cause and repair

A bounded ordinary request checked robots policy then fetched the permitted clearance listing (about 1.43 MB; two requests). All 48 structured variants carried the exact promotion text `20% Off Selected Styles Applied. Prices as marked.` The old parser rejected any nonempty promotion array, so it excluded all published prices.

The parser now accepts only the observed already-applied wording or an empty promotion array, retaining numeric price, stock, currency, product URL, image, deduplication and 20-variant caps. It uses the published sale_price directly and never applies another percentage. Member/coupon/unknown/mixed promotion strings are still rejected. Seven targeted tests cover these cases and a fail-closed empty result. A future zero-row result is a parser-review failure rather than a repeatedly empty collection.

Twenty real variants from the captured response were validated and imported as direct reviewed observations at the captured check time. An initial import failed atomically because the reviewed-import validator emitted `reviewed`, which is not an accepted deals.source_feed value. The validator and its test now use the existing `direct` provenance value. No constraint was weakened and no migration was needed. Collector status was not relabelled successful by this manual import; the next admitted scheduled collection must establish automatic recovery. Existing backoff and all other retailer pauses remain intact.

## User-facing improvements

Provider empty states explain the 72-hour expiry and that page refresh does not collect new prices. The collector summary explicitly counts empty attempts instead of leaving them unexplained. No extra queries, polling, dependencies, service accounts or paid resources were added.

## Demo journey and remaining boundaries

Browse current ALDI products, use search/category/store/price filters, inspect source evidence and unit prices, add products to the device shopping list and budget, then open Sydney Cheap Eats. Show WhichGrocer in its separate dated snapshot panel. Snapshots do not enter favourites, price history or basket arithmetic. Use an existing test account for authenticated favourites; do not create disposable accounts or send emails during an unattended smoke check. Google OAuth and email delivery require a real user-controlled flow and are not certified by build/UI checks.

Do not merge the React 19 dependency PR while React DOM remains 18. No new map/OCR/push/provider integration is in this demo release. Private backups, health credentials and unattended WhichGrocer access remain owner setup tasks. Retailer access restrictions are not bypassed.

## Test stability

The buying-decisions UI test sampled request count after a fixed 150 ms while lazy catalogue sections could still start their reads. It now waits for the main catalogue to settle and keeps optional sections outside the simulated viewport. The original calculation, focus and zero-extra-request assertions remain. This isolates the feature under test without hiding application requests.
