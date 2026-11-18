# Admin workbench release

Owner authorised all 32 planned admin capabilities on 19 November 2026 (Sydney). Entry: Administration after confirmed administrator sign-in and authenticator MFA. Existing owners are unchanged; delegation only grants editor/viewer access to an existing account UUID. No users were granted new access by this release.

## Capability adoption

| Plan | Implementation |
|---|---|
| 1 Overview | Product/draft/report counts and database usage |
| 2 Date filters | Sydney date range, maximum 90 days |
| 3 Page popularity | Aggregate page_view events for instrumented home page; no historical reconstruction |
| 4 Section popularity | Deals, catalogue and saved views; feature entries separately |
| 5 Product views | Opening the real product details |
| 6 Outbound clicks | Retailer link clicks in real product details |
| 7 Impressions | At least 50% card visibility for one second; per-client deduplication |
| 8 Retailer performance | Server-sourced retailer attribution and totals |
| 9 Category performance | Server-sourced category totals |
| 10 Search effectiveness | Search/zero-result counts; query text never stored |
| 11 Feature usage | Save/list/compare and named feature counts |
| 12 Analytics quality | Opt-in, DNT/GPC, admin/preview/auth exclusion, batching and conservative deduplication |
| 13 Product editor | Managed drafts; existing products can be adopted |
| 14 Publication | Separate draft, approve, publish, hide, archive actions |
| 15 Bulk actions | Maximum 20 actions, partial successes/failures reported |
| 16 Import centre | JSON/CSV to drafts, private PDF/image evidence attachment |
| 17 Import preview | 100 rows/200KB maximum; warnings before draft creation; no automatic publication |
| 18 Duplicates | Duplicate input rejection; server duplicate current retailer/title rejection |
| 19 Evidence | Exact source link, conditions, dates and private source files |
| 20 Price claims | Reference prices deliberately excluded from verified savings; no fabricated reductions |
| 21 Freshness | Mandatory recent evidence, region, future expiry; existing storefront freshness rules retained |
| 22 Images | Missing-image warnings, exact URL validation, explicit inspection link, permission gate |
| 23 Coverage | All 28 retailer directory entries, separately from admitted product collectors |
| 24 Collection health | Recorded status, failure kind, request/byte counts, last success |
| 25 Controls | Database collector pause and bounded test invocation retaining existing run guards |
| 26 Permissions | Owner records collection/display/image permissions and supporting evidence |
| 27 Quotas | Database usage, accepted daily analytics events, evidence upload cap; Vercel runtime usage remains in its dashboard |
| 28 Emergency | Analytics/import/database collection/assistant independent switches |
| 29 Permissions | Existing owner + MFA editor/viewer roles; server-authorised actions |
| 30 Audit | Actor/action/target internally recorded, account identities omitted from export |
| 31 Moderation | Existing suggestion review + new price report review/dismissal |
| 32 Recovery | Optimistic revisions, last 50 revision recovery as non-public draft, bounded JSON/CSV exports |

## Boundaries

This is an administration layer, not new retailer permission. Product publication remains restricted to the seven retailers supported by the current deals schema; other retailer records are coverage/source controls. CatalogueOffers GitHub automation flags are untouched and its confirmed WAF challenge remains unresolved. A queued test is not a successful collection. No proxies, challenge solvers, paid models or billing changes are introduced.

Analytics is off for each visitor until they opt in through About & data sources. Aggregates do not identify users, prove purchases, or guarantee human traffic. Collection may be blocked/declined/capped. No tracking of uninstrumented static pages is claimed. Guest saved products remain browser-local. Analytics event cap is 5,000/day; aggregate retention 90 days; batches max 20/8KB; ingestion throttled globally. Max 2,000 grouped analytic results per query, 50 admin records/page. No arbitrary search text or URL is accepted by telemetry. Quotas are conservative application guards, not a guarantee of platform-wide free-tier availability.

Private evidence uploads max 10MB/file (PDF/JPEG/PNG/WebP); total application budget approximately 50MB (new uploads stop at 40MB used, leaving room for one max-size upload). Concurrent trusted-administrator uploads can exceed that approximate application budget; provider limits still apply. Evidence signed links expire after ten minutes. Orphan/private evidence is not automatically deleted; review storage usage before further uploads.

Public wrappers use SECURITY INVOKER. Privileged implementations live in non-exposed admin_private with empty search paths, explicit grants, MFA and role checks. Direct table access is revoked and RLS enabled. No new service credentials are shipped. Server-enforced permissions apply even when requests bypass the UI.

## Verification

Run npm test --prefix tools/admin for PostgreSQL/PGlite role, mutation, freshness, permission, ingestion and storage checks. Run npm run typecheck, npm run lint, npm run build, node --test tests/*.test.cjs and npm run test:ui using CI public fixture environment. UI integration exercises actual bundled components with mock auth/API responses. Hosted validation uses rollback-only transactions and leaves no test products, roles or events. Native browser review must preserve MFA; no admin access bypass.
