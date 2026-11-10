# SaveHalf: manually verified deals and licensed provider feeds

Prepared for review only. No promotions, collector schedules, account settings or production database rows were changed.

## Enter a verified retailer promotion

1. Copy scraper/templates/reviewed-deals.csv into a separate local CSV. Its committed template has a header only; no stale or invented products.
2. Enter one row per exact product/variant. Supported store names: Coles, Woolworths, Aldi, Big W, Kmart, Target and Best & Less.
3. Use retailer-identifiable externalId, exact product title and numeric AUD price (example format 4.50). Previous price 'was' is optional and must be the retailer's comparable previous selling price, never a provider average or RRP.
4. Manually check both retailer HTTPS URLs, correct region/store, current price, product size, and whether the promotion is still offered. Record checkedAt in ISO UTC (less than 72 hours ago). Coles/Woolworths require verified promotionEndsAt within eight days. Use reviewed=true only after checking.
5. Preview with: node scraper/src/reviewed-import.mjs path/to/reviewed-deals.csv. No database calls or credentials are loaded during preview.
6. Following separate owner approval and fresh review, the existing server-only --publish path can upsert the whole validated batch. Do not put service credentials or unlicensed provider dumps into Git.

CSV limits: max 150 products/batch, max 30 Coles and 30 Woolworths, max 20 per other retailer, up to 128 KiB. Bad prices, unreviewed entries, invalid CSV and duplicate variants are rejected. JSON support remains.

## Avoid repeatedly scraping Coles/Woolworths

- First choice: retailer or independently licensed publisher API/CSV feed whose terms expressly permit collection, attribution, display and retention. Record license, source URL, image rights, quota, geographic coverage, update cadence and revocation terms.
- Existing WhichGrocer adapter: scraper/src/whichgrocer-import.mjs takes authorised page JSON with timestamps, stock flags, AUD price and canonical retailer product URL. It publishes separately labelled provider_products, not direct deals. The provider's average_30d is NOT a retailer previous price or a half-price claim. This integration exists but unattended credential-backed refresh is not enabled; see docs/WHICHGROCER.md.
- Existing community/RSS leads can link users to the original offers. A third-party headline or copied catalogue is not independent evidence of a current selling price.
- Do not work around 403s, retailer conditions, access controls or disallowed scraping by bouncing through mirrors or other sites. Third parties may lack the right to sublicense the underlying data.

## Automation deployment gate (not activated)

After confirming permission, current feed/API documentation and an independently issued server-side credential, use one bounded daily collection with conditional downloads/caching where supported. Validate stable product IDs, currency, source timestamps, stock, regional scope, original links and authorized image usage. Enforce monthly/provider request caps and stop on 401/403/429, quota exhaustion, schema drift or missing freshness. Dry-run with fixtures, inspect RLS, database quota and errors, then request a distinct production schedule approval. Expire provider snapshots through the existing freshness and retention mechanisms. Never silently promote provider prices into retailer direct discounts.
