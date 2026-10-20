# Automation recovery release — 14 October 2026

## Shipped changes

- Collector failure categories now retain HTTP status, bounded Retry-After and up to five safe request diagnostics. Diagnostic paths exclude query strings. Generic listing failures no longer discard all underlying errors.
- Access, policy and parser failures pause until reviewed. Ordinary transient failures retain existing bounded backoff. No extra automatic retries or faster schedules were added.
- Kmart now uses the published Shop All Clearance path; Target uses its published clearance category. Generic collectors check robots before listing and product requests, and remain inside the existing per-source request limits. BIG W's listing selection is bounded.
- Public browsing, basket checks and watch refreshes use a security-invoker current catalogue view. Supermarket observations before the current Sydney Wednesday boundary require rechecking. Known reviewed offer expiries are enforced as well. Historical rows and saved snapshots are retained.
- New daily aggregate counters preserve completed import outcomes, row counts, source requests and downloaded bytes despite detailed-log pruning. Aggregates start with this release; they do not backfill a complete history. Retention is 30 days, with existing private detailed logs retained at most 30 rows per source / 14 days.
- Coverage cards provide official retailer handoffs, review-pause explanations, earliest transient retry and completed-import totals. These distinguish import outcomes from scheduler checks.
- A reviewed import CLI defaults to preview, caps batches, requires explicit review, source URLs, region/check time and current supermarket expiry, rejects duplicates and unsafe sources, and leaves collector health untouched. Publishing requires the existing server-side service credential and an explicit `--publish` flag; do not place credentials in frontend code or chat.

## Verified results and limitations

The Supabase function `catalogue-collect` is deployed as version 12, preserving its existing custom token authentication. Two SQL operation files are applied: `automation-recovery.sql` and `reviewed-source-metadata.sql`. The migration tool twice returned an expired-request error without applying changes; the supported direct SQL route applied them transactionally. These changes therefore have operation files rather than a new migration-tool history entry.

The hosted Coles recovery run still returned an unusable 424-byte response and is now paused for parser/access review. Woolworths remains paused after its existing HTTP 403. Do not describe either hosted collector as repaired.

A separate bounded maintenance fetch from this workspace returned legitimate Coles product data on the permitted public listing. The existing parser accepted 54 ordinary half-price rows. The exact thirty-row observation batch is retained in `scraper/observations/coles-20261014.json`. Thirty rows with explicit price/previous price, IDs and image URLs were imported, using the actual response timestamp (14 October 09:37:32 Sydney), source URL and the caveat "Online listing; store not selected — confirm local price". They are observations from a maintenance collection, not proof that the hosted cron collector works. No inferred offer expiry was added. The current promotion-week rule and 72-hour freshness cap apply.

The public-role verification returned 346 current products, including 30 Coles half-price observations; Coles remained review-paused. Prior-week Coles records were excluded from current browsing and not deleted.

BIG W, Kmart and Target revised collectors are deployed, but a second hosted run today was skipped by the existing one-run-per-Sydney-day cap. Their next scheduled attempts are 15 October at 06:15, 06:20 and 06:25 Sydney respectively. Their previous failed status is retained. A successful public page fetch from the workspace does not prove successful hosted collection. After the next attempt, inspect actual diagnostics before resuming or changing anything.

ALDI, Best & Less, OzBargain and Cheap Eats retain existing schedules and budgets. No paid service, billing change, AI API, proxy or token-consuming feature was introduced. Full account-wide provider usage remains outside the installed tools' visibility.

Verification: 40 parser/data tests before the reviewed-import additions, two reviewed-import validation tests, 33 frontend unit tests, basket-refresh and retention UI scripts, typecheck, lint and production build passed. Public-role reads and view security options were verified. Security advisors reported no new view/RLS issue; existing informational notices concern deliberately private RLS tables without public policies, and an existing Auth leaked-password-protection warning remains.

## Maintainer procedures

1. Inspect `collection_status` diagnostics and `collection_daily` counters; do not equate cron success with imports.
2. For access/policy blocks, keep `review_required=true` until permitted access is established. No CAPTCHA bypass, private session reuse, browser impersonation or network-route evasion.
3. For parser changes, capture a permitted response, keep a small sanitised fixture, verify IDs/variants/currency/price evidence and run parser checks. Missing price/stock data is a failed or quarantined result.
4. Before a controlled source retry, confirm budgets and daily caps. Only clear review state after a real fix or authorised access review. Resetting status alone is not a fix.
5. Keep prior observations timestamped honestly. Wednesday rechecking does not fabricate new prices or assume a repeated discount cycle.
6. Reviewed catalogue workflow: `node scraper/src/reviewed-import.mjs reviewed-products.json` creates a preview without database requests. After actual source review, add `--publish` in a trusted server-side credential environment. Records require `store`, `externalId`, `title`, `price`, optional `was`/`image`, `url`, `base`, `sourceUrl`, `region`, `checkedAt`, `reviewed: true`, and a verified `promotionEndsAt` for supermarkets. Never publish synthetic examples.
7. After recovery, pilot daily for seven scheduled runs and measure genuine outcomes before increasing frequency or adding retailers.

Production Vercel deployment verification: first recovery release dpl_Xd7NQhbP7Fks4i3JX6DPKwTxNhRS was READY on both public domains. Browser checks confirmed 30 Coles filter results, source pause explanations, official links, daily import outcomes and the product-region caveat. The final loading-state correction keeps product counts marked as loading until confirmed and uses Sydney dates for daily-stat filters.

## Rollback

Use the previous Vercel deployment for frontend rollback. Additive SQL tables/columns and current-view definitions can remain; do not delete history or new counters. Restore the previous Edge Function source from the repository history if needed, preserving custom authentication and byte/request limits. Keep inaccessible sources paused during rollback. To change the Wednesday review rule, modify the view and the local `promotionFreshness` helper together and rerun Sydney summer/winter boundary tests.

## 15 October follow-up

Collector version 13 fixes transport/policy classification, sanitises public errors and uses a host-specific HTTP/1.1 client for the observed BIG W HTTP/2 failure. BIG W is unpaused for its existing network backoff, earliest 16 October 06:15 Sydney. The source investigation and remaining Woolworths dependency are documented in WOOLWORTHS-SOURCE-INVESTIGATION.md. Website fallback improvements and the prior count-loading correction are included in the follow-up build. All 44 parser/data checks, typecheck, lint and production build passed. No source-access block was bypassed or marked successful.
