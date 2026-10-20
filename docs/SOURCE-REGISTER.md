# Source permissions and operational status

Reviewed 19 October 2026. This is a risk register, not a legal clearance. A robots Allow rule is not a copyright/data licence or permission to republish photos. No source uses authenticated sessions, fingerprint spoofing, CAPTCHA solving, rotating proxies or private APIs in the new scheduled path. A 403/401 stops for review; 429 preserves Retry-After; unknown permissions are not silently marked approved.

| Retailer/source | Present data path | Risk / release decision |
|---|---|---|
| Woolworths | Public-source link and separately labelled OzBargain headlines; direct collector paused | HIGH: official site terms clause 1.4(b)(viii) prohibit automated retrieval/indexing. New GitHub runner refuses direct collection. Permission/licensed feed needed. |
| Coles | Public specials adapter paused for parser review; community headlines | HIGH/uncleared: pricing-data ownership exception is not a blanket right to copy descriptions/photos. No private API/browser fallback. Review terms and product data access before enabling. |
| ALDI | Existing public HTML catalogue pilot; robots plus twelve categories within 13 requests | Permission/republication rights not independently cleared by this audit. Existing pilot, not a complete catalogue; review terms and image rights before GitHub cutover/expansion. |
| Best & Less | Existing public sale HTML pilot, two requests including robots | Permission/republication review remains open. Variants are distinct identifiers. Never infer absent inventory from capped results. |
| BIG W | Direct adapter transport-failed, scheduled backoff | UNCLEARED. A transport workaround is not permission. No anti-bot evasion; marketplace rows require seller attribution and remain excluded. |
| Kmart | Public clearance path, HTTP 403, review pause | HIGH operational risk / terms not cleared. Do not retry around the block or acquire shopper cookies. |
| Target | Public clearance path, HTTP 403, review pause | HIGH operational risk / terms not cleared. Leave paused until permitted access is established. |
| Chemist Warehouse | Official-source link + community headline discovery | No direct catalogue adapter admitted. RRP comparisons, membership and fulfilment need attribution. Terms/image permissions still require review. |
| Officeworks | Official clearance link + community headlines | No direct catalogue adapter admitted. No complete stock/price claims; terms and product-photo reuse unverified. |
| Priceline | Official specials link + community headlines | No direct catalogue adapter admitted. Terms, member pricing and photo reuse unverified. |
| IGA | Official value/local-store handoff + community headlines | No national direct price feed admitted. Store-specific prices and local publisher permissions required. |
| Sephora | Official clearance discovery + existing community feed | No direct collector admitted. Terms retrieval was blocked/unavailable; public robots allows some catalogue paths but is not a reuse licence. |
| OzBargain | Public RSS titles/metadata with original post links | Lower content scope than article/comment copying, but not an unrestricted redistribution licence or SLA. Respect robots/conditional requests. Recurrent 403 means paused; no bypass. No logos/articles/comments copied. |
| Cheap Eats sources | Existing bounded Friday/bistro/EatClub discovery | Source checked does not establish every venue's current hours, participating outlet, availability or “open now”. Preserve original links and check dates; map/time claims await structured evidence. |

Lowest-risk expansion path: retailer-provided expressly licensed feed/API or written permission; public specials/catalogues only where their terms allow the intended collection/reuse; otherwise user-initiated official links. No official free licensed full-catalogue feed was verified for the requested new retailers. Do not turn a public HTML page or an RSS endpoint into a claim of permission.

Official terms reviewed:
- Coles: https://www.coles.com.au/important-information/terms/website-terms-conditions
- Woolworths: https://www.woolworths.com.au/shop/services/terms-and-conditions
- OzBargain API information is not a licence for a retail catalogue: https://www.ozbargain.com.au/wiki/help:api

## Admit a new store

1. Record the publisher, exact public URLs, permission/terms review date, image rights, robots decision, expected region, conditions and whether coverage can genuinely be complete.
2. Add a small fixture with exact item/variant identifier, explicit AUD price, declared size and canonical source URL. Test missing prices, RRP/member offers, unsafe URLs, expired products, empty and changed HTML.
3. Add a bounded adapter to the shared HTTP collector. No private endpoint fallback. Keep stable identity `(store_category, external_id)`; do not match items by approximate title.
4. Set request/byte/concurrency/time limits; include robots in the request cap. Add the store in a migration and the approved workflow allowlist only after review.
5. Dry-run first, then one leased monitored run. A complete snapshot needs total/coverage evidence; `snapshot_complete` stays false for these capped pilots. Only a complete snapshot may drive disappearance expiry. Current freshness/expiry timestamps remain the safe fallback.
6. Check source attribution and “last checked” in the UI, failure metrics, row-count drift, RLS and quota consumption. Expand slowly rather than promising every retailer's full catalogue.

## Requested five-store review — 19 October 2026
- Chemist Warehouse: current terms clause 8.1(c) prohibits crawler tools, and 2.5 requires prior consent for links. Direct collection stays disabled; directory shows its domain without an active link pending permission. https://www.chemistwarehouse.com.au/help-centre/terms-and-policies/terms-and-conditions
- IGA: general terms restrict republication and require prior consent for links. Directory shows its domain without an active link; local-store prices cannot be promoted as national. https://www.iga.com.au/terms/
- Officeworks: terms reserve website/product content rights; no catalogue licence established. Clearance URL remains discovery-only. https://www.officeworks.com.au/information/policies/terms-of-use
- Priceline AU: sale HTML and robots available, but terms retrieval alternated with a JavaScript interstitial; no automation/reuse permission inferred. The US travel company is unrelated. https://www.priceline.com.au/priceline-policies/terms-and-conditions-of-use
- Sephora AU: terms unavailable to the retrieval tool; robots permission on selected paths is not a republication licence. No new requests or direct adapter enabled. https://www.sephora.com.au/robots.txt
All five already have community source definitions. Existing publisher backoff is preserved, not bypassed. The new directory shortcut costs no additional database reads or collection requests. No fresh products were invented or imported from search snippets.
