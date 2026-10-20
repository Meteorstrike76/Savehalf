# Phase 1 and 2 release verification — 19 October 2026

Production: https://savehalf.vercel.app/ . Vercel deployment dpl_66Kw4tmL3xcNsEygDPHo9bRbJstk is READY. Supabase collector v18 is ACTIVE. Three additive SQL migrations applied; original 448 products, four favourites and two auth users preserved.

## Completed checks
- 42 frontend unit tests and 50 parser/pipeline tests passed.
- Eight affected browser-like UI regression scripts passed; typecheck, lint and production build passed.
- Transactional SQL fixture verified changes-only recording, unchanged check counters, monthly aggregation, units, bounded search and client execution denials; fixture rolled back.
- Anonymous production search for `cofee`, ALDI and $5–$10 returned ALCAFE Aroma Classic Instant Coffee 200g at $6.39, $3.20 per 100g. Live product details showed one recorded check and correctly withheld typical-price and complete 90-day-low claims.
- ALDI dry run returned 263 rows using 13 requests and 8,224,668 response bytes without writes.
- Backup encryption/decryption and tamper rejection tested with a local fixture only.

## Before / after
| Measurement | Before | After |
|---|---:|---:|
| Database size | 14,014,131 bytes | 15,062,707 bytes |
| Main JavaScript gzip | 125.85 KB | 126.67 KB |
| Lazy price history gzip | absent | 2.30 KB |
| CSS gzip | — | 14.79 KB |
| Lighthouse mobile performance/accessibility/SEO | not measured | not measured |
| Required 375/768/1280 screenshots | unavailable | unavailable |

Lighthouse 13.5.0 installed, but Chromium provisioning failed because downloads were truncated. No scores are inferred from unit tests or bundle size. The manual performance workflow and local capture tooling are included for a later real-browser run. `live-verification.jpg` is an actual production screenshot at the browser's existing viewport; it does not substitute for the requested responsive comparison.

## Not activated or proven
No Git remote is configured here. Scheduled GitHub scraping and encrypted weekly private artifacts are prepared but disabled behind repository variables; credentials and a private repository have not been configured. Existing Supabase Cron jobs remain active to avoid an unverified cutover. No real backup upload or full restore drill has been performed. Follow OPERATIONS.md before enabling the workflows.

Public source rights remain conditional; Woolworths automated retrieval is disabled and blocked sources are not represented as complete. Full retailer coverage, price alerts, maps, PWA and indexable route work are not claimed complete. Default Supabase SMTP limitations remain. Free hosting cannot guarantee uninterrupted service or prevent all abuse.

Implementation commits: 99a3f91, 38f744f, 9c5641d, bba0f89, a0ddeeb. See AUDIT-AND-ROADMAP.md for quotas, projections, trade-offs and remaining phases; SOURCE-REGISTER.md for source risks.

## Follow-up: crawlable guides
Added three build-generated HTML guides at /guides/, /guides/store-coverage/ and /guides/sydney-cheap-eats/, with canonical URLs, page-specific descriptions and Open Graph tags. Added sitemap.xml and robots.txt and a discoverable app footer link. These are editorial guides without prices or Product/Offer structured data; they do not make the app's product routes server-rendered. No database queries, hosted dependencies or paid services were added. Three HTML pages add approximately 13 KB uncompressed before transport compression. Typecheck, build, lint and the affected phase2 UI check passed. Responsive Lighthouse evidence remains outstanding; no claim of measured contrast or viewport certification is made.

## Five retailer directory follow-up / GitHub connection
The directory now has a five-store shortcut for Priceline, Chemist Warehouse, IGA, Officeworks and Sephora, with explicit coverage/permission notes. No direct collection was enabled and no prices were imported. Chemist Warehouse and IGA display domains without active directory links pending the consent described in their terms. Existing community feed definitions and backoff remain unchanged. Typecheck, build, lint and expanded directory UI regression passed; directory interaction adds zero network requests.

GitHub authenticated as Meteorstrike76. Verified Savehalf main contained only README.md at 817c07ea2c824dfaef9694c9c994028d62e80b53. A source-tree upload was rejected with 403 Resource not accessible by integration; no branch, commit, file or workflow changed remotely. Local origin now identifies https://github.com/Meteorstrike76/Savehalf.git. Write access and repository secrets are still required. Both discovered repositories are public, so the private-only backup workflow must remain disabled until an appropriate private destination exists.

## Inline retailer offers — replaces shortcut-only integration
Priceline, Chemist Warehouse, IGA, Officeworks and Sephora now have a directly rendered reported-offers section inside Deals results, not a modal/directory handoff. It has retailer filters, main-search matching, a title-based clearance toggle, twelve-card pagination and per-source timestamps/health. These are community-reported headlines from the existing snapshots, not newly scraped retailer-verified product records. They intentionally do not enter unit-price comparisons, basket totals or discount sorting. Three merchants had empty snapshots; no products were invented. Officeworks had eight saved headlines and Chemist Warehouse three; expiry/age validation can further reduce visible counts.

One five-row bounded read is cached for two minutes. No new collection requests, services or schema changes. Filters run locally. Allow up to 50 KB extra API egress per visitor per uncached visit as a conservative planning allowance; actual snapshot payload is currently much smaller. At two visits/month this adds up to 0.1 GB / 1 GB / 5 GB at 1k / 10k / 50k visitors; previous budget breakpoints must be reduced accordingly (about 12k visitors at the conservative total 0.4 MB/visitor plus 0.16 GB exports, before other traffic). Free quotas are not raised. Production main gzip is 129.10 KB, CSS 14.85 KB. Typecheck, lint, build, new inline-offer UI test and prior phase2 UI regression passed.

## Missing product diagnosis and collector v19
Root cause: default Deals mode required discount_pct > 0. The database had 285 fresh ALDI products without reference prices and 29 fresh Best & Less reductions. Therefore ALDI was correctly excluded from reductions but incorrectly hidden from the default discovery experience. Default browsing now opens the full collected catalogue sorted by lowest price; discount-first ranking would otherwise still put 24 Best & Less reductions ahead of all regular-price ALDI products. reductions remain an explicit Deals mode with a clear explanation and a return-to-products action. Shared filters and existing saved preferences still apply. Historical/expired records were not refreshed artificially.

Collector v19 ACTIVE adds an explicit AUD/InStock/single-price public JSON-LD fallback for ALDI when Nuxt product data is absent. It rejects ambiguous variants, random-weight titles, external product hosts and missing/foreign prices; never fabricates a reference price. Failed essential ALDI promotion-page requests now fail the run rather than silently presenting a healthy zero-sale result. Other failed category requests produce bounded diagnostics. Node and Edge share the same ALDI parser. No request budget was increased.

Live ALDI dry-run: 263 products, 13 requests, 8,224,671 bytes, no writes. Both public ALDI promotion pages currently publish no wasPriceDisplay for the examined products; no discount is inferred from category names. 53 pipeline tests passed. Typecheck/build/lint passed, plus catalogue-default, phase2 and inline-retailer UI checks. The production collector runs on its existing twice-daily ALDI schedule (06:10 and 18:10 Sydney during AEDT); next scheduled check after this release is 19 October 18:10 Sydney. Best & Less remains four times daily. A successful cron dispatch alone is not treated as evidence of imported rows; collection_status remains the run-outcome evidence.

Coles parser, Kmart/Target access and BIG W transport failures remain unresolved and explicitly paused/backed off. Woolworths direct collection remains policy-gated. No authenticated/private API, proxy, CAPTCHA evasion, new paid service or fabricated listings were added. GitHub write access remains blocked; workflows were not activated. The deployment improves coverage discovery and ALDI resilience, not complete national retailer coverage.

## WhichGrocer product integration
Personal Lite account verified active, no card, 200 monthly credits; four calls used four credits, leaving 196. Added 98 validated product snapshots across Coles (25), Woolworths (23), BIG W (25) and Kmart (25). Target is absent from the provider's retailer list. Public RLS read verified; anon insert and authenticated update privileges false. Relation size 114,688 bytes. Separate provider table preserves existing product histories/favourites and clearly distinguishes 30-day-average savings from retailer reference prices. Source timestamps were preserved (mostly 16 October), never reset to today's date. Frontend reads 12 selected-column rows per page, cached 120 seconds; tests verified paging, attribution, average labels and cache reuse. 55 pipeline tests plus provider/catalogue/phase2 UI checks, typecheck, build and lint passed. Provider source refresh remains manual through the authorised connection; no server API key or unattended provider job was configured. See WHICHGROCER.md for quota budget, attribution, expiry and exit procedure.

BIG W's separate catalogue HTML was reachable (307,854 characters, Publitas publication); robots URL returned 404. This is a discovered candidate, not an admitted product extractor or licensed feed. No new BIG W catalogue automation was enabled.

CLI migration scaffolding created a file but its invocation was subsequently rejected by automatic approval review for contacting a PostHog telemetry endpoint. No retry or alternate telemetry route was attempted. The SQL migration was applied through the existing Supabase migration API, and its local filename reconciled to server migration history. No provider key or local secrets were exported.
