# Woolworths source investigation — 15 October 2026

## Findings

The Half Price app listing advertises Coles/Woolworths half-price specials, state selection and Wednesday updates. It does not document a reusable feed or its collector implementation. Multiple similarly named apps/sites exist, so their claims cannot establish how the specific installed app obtains data.

Sources checked:

- https://play.google.com/store/apps/details?id=com.codylab.halfprice
- https://halfprice.app/
- https://halfpriceau.com/about — a separate site's description says it uses publicly published promotional information, not a retailer agreement.

The public Woolworths catalogue HTML references a SaleFinder retailer endpoint, but the exact referenced endpoint returned HTTP 404 in the bounded test. The official half-price HTML returned HTTP 200 with a Next.js page-props error of `fetch failed` and no product bundles. A content-service catalogue endpoint referenced by the official page returned HTTP 502. No failed HTML shell or marketing copy was imported as product data.

SaleFinder's published terms limit reuse and prohibit harvesting/republication; its content was not enabled as a SaveHalf feed. An old public catalogue-parser repository demonstrates a historical catalogue approach, but does not establish current access or reuse permission.

- https://www.woolworths.com.au/shop/catalogue
- https://www.woolworths.com.au/shop/browse/specials/half-price
- https://www.salefinder.com.au/cms/termsofuse
- https://github.com/szdc/catalogue

Hot Prices publishes an accessible Woolworths price-history snapshot. The checked compressed response was 1,707,647 bytes, with Last-Modified 14 October 2026 23:45:22 UTC. Its expanded payload exceeded the diagnostic 12 MB cap. A separate bounded schema inspection showed names, IDs, prices and change history, but no explicit current retailer was-price, offer-validity or stock fields. A file publication timestamp is not an individual product verification timestamp. This was not imported as a current half-price feed, and historical prices were not converted into retailer discount claims.

- https://hotprices.org/index.html
- https://github.com/Javex/hotprices-au

The open-source project's fetcher uses the same Woolworths browse-category API that currently returns 403 to our hosted collector. Copying it would not by itself fix that access failure. We did not adopt its browser-identity headers or repeated 403 retries.

## Fixes shipped

- Fixed a genuine classification bug: `robots.txt` inside a network exception no longer makes the failure a policy refusal.
- Public collector messages no longer include raw network exception text, internal addresses, full request URLs or runtime internals.
- BIG W requests use HTTP/1.1 when the Deno runtime exposes a custom HTTP client, specifically to address its observed HTTP/2 stream failure. TLS checks, declared identity, network route, timeout and request budgets remain intact. A successful hosted import remains unverified until the next due run.
- The wrongly paused BIG W transport failure was corrected; it will retry under the existing backoff schedule, earliest 16 October at 06:15 Sydney. Woolworths/Kmart/Target access blocks remain paused. No block was treated as a successful import.
- Added retailer-specific official/community handoffs directly in empty search results. The message distinguishes coverage gaps from a retailer having no offers, with no additional data requests.
- Finished the coverage-count loading correction and Sydney-date filtering from the interrupted prior release.

## Remaining dependency

A reliable Woolworths half-price collector still needs accessible permitted data containing current price, explicit previous-price/discount evidence, product/variant identity, region and promotion dates. Candidate publisher feeds need confirmed reuse terms and a bounded sample before scheduling. No paid service, AI API, billing change or trial-credit dependency was added.

Validation: 44 parser/data tests, typecheck and lint pass; production build and live UI verification are recorded with the release.
