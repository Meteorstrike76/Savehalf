# SaveHalf audit and phased upgrade — 19 October 2026

This audit was reported in chat before implementation. The baseline was production revision ecbec5c / source ledger 220b7d4. Scope: Vite/React remains; Phases 1–2 implemented where account access and source rights permit. No new hosted provider, billing, ads, affiliate links or AI inference was added.

## 1. Prioritised audit

### P0 — Source reliability and the scheduler differ from the product description

Only ALDI and Best & Less currently have healthy direct imports. Of 448 retained products, 314 were fresh at audit: 285 ALDI and 29 Best & Less, including 21 half-price sale variants. ALDI's latest import had no verified previous-price reductions. Do not confuse catalogue entries with discounts. Priceline, Chemist Warehouse, IGA and Officeworks have community discovery feeds and official-source links, not comprehensive direct catalogues.

Active production runs are Supabase Cron → authenticated Edge Functions → Postgres. The local checkout has NO configured Git remote. A legacy daily GitHub workflow exists but its installation, secrets, Actions minutes, repository visibility and execution are unverified. Recent releases used the Vercel deployment API. Therefore “deployed from GitHub” is not established by the available evidence.

Schedules are UTC: ALDI 07:10/19:10, Best & Less 01:35/07:35/13:35/19:35, Cheap Eats 19:30 daily, OzBargain every 15 minutes; Coles/Woolworths hourly scheduler checks with due/backoff guards; BIG W/Kmart/Target daily scheduler checks. Sydney is currently UTC+11; DST changes must not be hard-coded as year-round offsets. A scheduled check can be skipped for review, overlap, quota or backoff.

OzBargain failed with HTTP 403 again on 17 October 07:00 UTC; last success 06:45. The earlier recovery was temporary, not proof of unattended reliability. Individual merchant feeds are separately backed off. BIG W transport failure persists; Coles parser and Woolworths/Kmart/Target access reviews remain paused.

The old GitHub path acquired Woolworths session cookies and used private browse API/browser fallbacks. It also expired unseen IDs after a capped import. Both violate the new design requirements: capped samples cannot establish disappearance. The scheduled entry point now uses bounded public HTTP only. Retired adapters remain as historical parser fixtures, not an enabled fallback.

### P1 — Data, RLS, indexes and growth

Before changes: 13.36 MiB database; 448 products; 4 favourites; 2 auth users; 0 current preferences; 0 reports. Table relation sizes included deals 560 KiB, community feeds 272 KiB, Cheap Eats 136 KiB, audit 96 KiB. Every public table had RLS enabled. Exact post-change metadata is in `schema-audit.json`.

Original tables: deals (public read); saved_deals (owner-only SELECT/INSERT/DELETE); user_preferences (owner-only CRUD); price_feedback (owner-only read, authenticated throttled report RPC); community_feeds, cheap_eats_sources, collection_status and collection_daily (public read); cheap_eats (fresh/active public read); collection_audit, collection_budget, cheap_eats_run and retired meal_ai_usage (no client policy, intentionally private). New scrape_runs is service-only. New price_changes/price_monthly allow public reads, service writes; history triggers are in the non-exposed private schema.

Existing unique (store_category, external_id) protects idempotency. Existing feed/freshness and owner foreign-key indexes were retained. New indexes cover full-text vectors, trigram text matching, active price/newest/unit sorts. We did not create an index for every possible filter combination: excess indexes consume disk and amplify writes. The typo fallback uses an explicit similarity calculation, so it can scan candidates; a measured cold range/typo RPC completed in approximately 36 ms on this tiny dataset. This is not a concurrency benchmark.

No reliable historical DB size series exists, so observed growth/day cannot be stated. The measured increase to about 14.3 MiB after the first two migrations includes indexes and retained baselines, not a measured daily growth rate. Changes-only history increments a counter on repeat checks. Monthly rows aggregate actual observed checks, not invented daily prices.

### P1 — Performance and egress

Browse queries already select named columns, debounce typing and load 24 rows. Favourites retain their existing bounded 500-row account read to avoid silently losing saved products; a proper account pager is Phase 3. Radar is lazy and fetches 14 saved feeds; source/counter panels have short caches. New public catalogue/history caching is bounded to 40 entries and two minutes; it is not an auth/private-state cache. No realtime subscriptions or per-visitor scraping were introduced.

Baseline main JS: about 125.9 KB gzip (Vite reports 125.85 KB). The new history panel is lazy-loaded; see release notes for final sizes. Product images are lazy/async with source fallback and no Supabase Storage copies. ALDI sample URLs specify a publisher-provided 580px rendition. One HEAD measurement returned HTTP 200, JPEG, 27,305 bytes; this single product is not an average or distribution. This does not establish every image's transfer size, successful hotlinking or republication rights. Vercel image optimisation is not used: transformations/invocations are zero by design.

Lighthouse 13.5.0 installed, but this environment could not provision Chromium: downloads were truncated. No mobile scores, image-weight distribution, Core Web Vitals, or 375/768/1280 before/after screenshots were measured. Tools and a manual GitHub workflow are supplied for those deliverables. They must not be represented as completed evidence.

### P1 — UX, trust and security

The current page uses remembered store/category preferences. A separate first-visit preference hook exists but is not connected to the current Feed; a modal onboarding redesign is Phase 4. Existing optimistic favourites, list/budget tools, hide/undo, source links, last-checked dates, report RPC and expiry guards were preserved.

Retailer reference/was values are not always evidence of a typical selling price. New copy calls them reference prices; the observed-history comparison is separate. Automatic exact cross-store matching is not claimed without GTIN and reliable variant identifiers. Manual comparisons sort within 100g, 100ml and each groups, never across dimensions.

Frontend configuration contains the public anon key, as expected. Service credentials remain outside frontend builds. Existing collection-token-authenticated Edge functions remain in place during cutover; Supabase's built-in service role cannot be “removed” while those working functions still use it. New Actions credentials belong only in GitHub secrets. Maintainer metrics and write RPCs deny anon/authenticated access. RLS protects ownership but does not prevent repeated public-read requests or guarantee DDoS availability. Vercel's edge protection does not shield direct Supabase API URLs.

The existing leaked-password-protection warning remains; no paid setting was enabled. Five no-policy information notices after these changes describe intentionally private tables, not a reason to create permissive policies. Current collection budgets: 100 MB upstream body reservations/day, internal DB stop 64 MiB, bounded per-store requests, overlap locks, exponential backoff and review stops. These are not a platform-wide monthly egress meter. Usage warnings now recognise the earlier internal 50/60/64 MiB thresholds.

### P2 — SEO and privacy

The server sends a root shell with a generic title/description/OG text, but no per-product HTML, sitemap or robots.txt. Google can render JavaScript; the SPA is not categorically invisible. However, discoverable links, distinct URLs and non-JS link-preview metadata are weak. Cheapest Phase 4 fix: prerender a small number of store/category landing pages with Vite, sitemap and static metadata. Only embed Product/Offer prices when a verified fresh snapshot and expiry rules support them. Avoid a large stale static price catalogue.

Optional Next.js/ISR migration: 5–10 developer days plus auth/URL/cache regression work, separate approval required. More server execution and cache behaviour add quota risk; it is not justified by 314 fresh products alone.

Public auth email delivery remains unverified. The default Supabase SMTP is a test service limited to team-member addresses and currently two messages/hour. Google OAuth startup reaches the normal Google login screen; complete user login/confirmation has not been performed. Email alerts/custom SMTP require separately approved provider setup and potentially an already-owned verified domain. No provider was added. Privacy/account deletion needs a carefully authenticated Phase 3 endpoint; do not expose service-role user deletion to the browser.

## 2. Verified free-tier limits and budget

Official pages checked 19 October 2026:

| Service | Limits relied on | Design consequence |
|---|---|---|
| Supabase Free | 500 MB DB; 5 GB egress; separate 5 GB cached egress; 1 GB Storage; 50,000 MAU; 2 active projects | No image storage, bounded reads, changes-only history; do not treat cached Storage allowance as extra uncached DB API bandwidth |
| Vercel Hobby | 100 GB Fast Data Transfer; 10 GB origin transfer; 1M CDN requests; 50k analytics events/month; 5k image transformations | Static Vite deployment; no scraping functions; no image transformations; analytics can pause before bandwidth is exhausted |
| GitHub Free private repos | 2,000 standard runner minutes/month; 500 MB artifacts; cache allowance 10 GB/repository | Daily job timeout 10m ≈310m/month maximum; weekly backup ≈50m maximum; reserve the rest for CI/manual audits |
| Supabase availability | Free projects may pause after seven days of low activity | Real daily database writes supply useful activity, but $0 cannot guarantee no pausing; no fake ping promise |

Assumptions AFTER Phase 2: 2 sessions/visitor; 0.35 MB static app delivery/visitor after browser caching; 0.30 MB database responses/visitor including occasional history/Radar/food; 12 CDN requests/visitor; 2 analytics events/visitor; 10% login MAU. These are capacity scenarios, not observed traffic. They allocate the full allowance to SaveHalf; other apps must be deducted wherever provider account/organisation quotas are shared. Images requested directly from publishers are additional third-party/user bandwidth, not Vercel/Supabase transfer. No reliable measured mean image weight is available.

| Monthly resource | Current measured use | 1k visitors | 10k visitors | 50k visitors | Free limit / breakpoint |
|---|---|---:|---:|---:|---|
| Supabase API egress, modeled | Actual billing total unavailable | 0.30 GB | 3 GB | 15 GB | 5 GB; ~16.7k before exports/maintenance |
| Backup export allowance, modeled | No backup executed | +0.16 GB | +0.16 GB | +0.16 GB | Four ~40 MB compressed exports/month; deduct from egress headroom |
| Vercel transfer | Billing total unavailable | 0.35 GB | 3.5 GB | 17.5 GB | 100 GB; ~286k under these assumptions |
| CDN requests | Billing total unavailable | 12k | 120k | 600k | 1M; ~83k |
| Analytics events | Billing total unavailable | 2k | 20k | 100k | 50k; ~25k |
| Login MAU | 2 stored users, not measured MAU | 100 | 1,000 | 5,000 | 50k; signup delivery can constrain far earlier |
| Vercel server/image calls for scraping/images | None designed | 0 | 0 | 0 | Avoid consuming these products |
| DB storage | ~14.3 MiB after initial migrations | Depends on products/history, not visits | Same | Same | 500 MB platform; earlier 64 MiB internal collector stop |
| Supabase Storage images | No new image objects | 0 | 0 | 0 | 1 GB |
| GitHub scheduled runner maximum | Not connected/verified | ~360 min | ~360 min | ~360 min | 2,000 min shared with CI; no visitor-triggered jobs |
| Encrypted backup artifacts | None created | ≤120–160 MB retained | Same | Same | 500 MB shared artifact/Packages quota; 21-day retention, 40 MB per export cap |

About 16k monthly visitors is the first conservative modeled egress breakpoint including exports. At 50k, this design does NOT fit uncached Supabase egress, even though static Vercel bandwidth does. Shared CPU bursts and email delivery can limit practical capacity sooner. API caching inside a browser does not create cross-user CDN caching. Keeping $0 beyond that point means limiting features/traffic or serving selected public static snapshots, not promising unlimited scale.

12-month DB projection (assumptions: 400 bytes/indexed price-change row, 240 bytes/monthly rollup, steady product count, 2 changes/product/week, 90-day detail, 12-month rollups): 2,000 products imply ~20.6 MB detail +5.8 MB rollups +~14–20 MB base/catalogue/index overhead, around 40–47 MB total. Months 1/3/6/12 are approximately 22/37/40/46 MB, model only. 5,000 products imply ~51.4 MB detail +14.4 MB rollups +base/index overhead, roughly 80–90 MB: below 500 MB but ABOVE the existing 64 MiB collector stop. That larger scope requires an explicit guardrail review. Ten changes/week at 5k products can add ~257 MB of detail; observation rate matters more than visits. Bloat, migrations, backups and new user data add uncertainty; measure monthly.

## 3. Phased roadmap and free-tier impact

| Phase | Scope | Estimated focused effort | $0 impact/status |
|---|---|---|---|
| 1 | Public runner, leases/shared budgets, transactional idempotent upserts, run telemetry, failure exit, private encrypted backups, owner usage CLI | 12–20h including integration/cutover | Implemented code/migration; GitHub activation and backup restore validation blocked on repository/secrets; keeps existing production schedules until cutover |
| 2 | FTS/typo search, min/max/discount filters, unit groups, changes-only history, monthly rollups, chart and cautious observed-price comparison, bounded caching | 16–24h including data/UX tests | Implemented; storage/egress rise modestly; requires actual observations to build trustworthy history |
| 3 | Improve existing list/budget split tools; paginated favourites; exact-ID comparison where evidence exists; opt-in alerts; Cheap Eats map/suburb/time metadata; private shared lists; deletion flow | 20–35h | Lists/calculations local; alerts and map tile/provider use need approval and verification; no unverified “open now” claim from incomplete hours |
| 4 | First-visit picker, tested light/dark tokens and WCAG AA/48px audit, offline PWA shell/manifest/icons, static landing-page SEO, metadata/OG/clean links, device performance evidence | 16–28h | Keep static hosting; no SSR migration; daily/static builds and assets remain bounded; OSM tiles cannot be bulk/offline-prefetched |

Attribution, licence/ToS reviews and source reliability are release prerequisites, not feature checkboxes. No ads or affiliate monetisation on Hobby; commercial use requires suitable hosting terms/plan before introducing monetisation.

## Sources

- https://supabase.com/pricing
- https://vercel.com/docs/plans/hobby
- https://docs.github.com/en/billing/concepts/product-billing/github-actions
- https://supabase.com/docs/guides/deployment/going-into-prod
- https://supabase.com/docs/guides/auth/auth-smtp
- https://supabase.com/docs/guides/platform/backups
- https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics
- https://operations.osmfoundation.org/policies/tiles/
- https://www.coles.com.au/important-information/terms/website-terms-conditions
- https://www.woolworths.com.au/shop/services/terms-and-conditions
