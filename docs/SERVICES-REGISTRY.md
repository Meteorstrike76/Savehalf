# SaveHalf services registry — proposal, 22 October 2026 (Sydney)

Status: N1–N10 batch approved by the owner on 22 October 2026. Implementation and activation states are tracked below. Approval does not itself activate services, flags, billing or accounts. Existing production configuration remains unchanged.

## Operating rules

- Personal, non-commercial Vercel Hobby use only; no ads or affiliates.
- No credit card, trials that expire into paid plans, prepaid credits or automatic overage.
- New external integrations capped at four products: Turnstile, Better Stack Uptime, Open Food Facts, Cloudflare Web Analytics. Cloudflare Workers AI is an existing approved but inactive fallback.
- If onboarding contradicts published Free terms or asks for a card, stop that integration and use its fallback. Do not accept a paid substitute.
- All proposed flags below must default off until configured and tested. They are proposed names, not existing settings. Public clients receive only a public-safe flag projection; administrative config and credentials stay private.
- Every adapter needs a timeout, bounded payload, retry ceiling, circuit breaker where applicable, and a useful built-in fallback. No extra paid provider on failure.
- Usage thresholds are safety policies, not provider guarantees. Recheck official terms quarterly and before changing models or caps.

## Registry

| Resource/status | Purpose and verified allowance | Owner/account | Keys | Flag and degradation | Removal |
|---|---|---|---|---|---|
| Vercel Hobby / existing | Static SPA, 100 GB fast transfer/month; 1m CDN requests; 50k analytics events; personal non-commercial | CyberExpert team, existing savehalf project | Existing connector; only public Supabase config in Vite | Keep heavy features lazy; warn at 70/85%; disable optional downloads before quota | Static dist can be deployed elsewhere as a separately scoped migration |
| Supabase Free / existing | Database 500 MB, 5 GB uncached and separate 5 GB cached egress; 500k Edge invocations; 50k Auth MAU | Existing project mdbqlcnzbakimfjrfczz; billing-owner identity not independently verified | Provider/HMAC secrets in Edge secrets; service role never client | agent_config.enabled exists. New flags must be private/default-off. Stop optional writes before DB budget; retain existing CRUD/auth | Export SQL/data; adapter isolates API; preserve user/account IDs during any migration |
| Groq Free / existing active | GPT OSS 20B: public table 30 RPM, 1k RPD, 8k TPM, 200k TPD; actual account may differ | Owner-managed existing Free account; billing tier cannot be read here | GROQ_API_KEY in Supabase secrets | Existing enabled, 35 primary attempts/day, shared 150k reserved tokens/day, 4k reservation/attempt; built-in search on exhaustion | Disable AI flag; revoke secret; keep deterministic tools |
| Cloudflare Workers AI / approved, inactive | 10k neurons/day shared; use only allowlisted Free-compatible model | Owner-managed Cloudflare account, credentials absent at last activation check | CLOUDFLARE_ACCOUNT_ID + CLOUDFLARE_AI_TOKEN in Edge secrets | Existing fallback_enabled=false. At most 20 attempts/day, inside shared 150k token budget; never add budgets together | Disable fallback flag, revoke token |
| Turnstile / implemented, credentials pending A | Free 20 widgets, 10 hostnames/widget, unlimited challenge verification requests | Owner's existing Cloudflare account; exact account ID not read | Public site key in client; secret in Edge/Auth config | Proposed security.turnstile; no SDK needed. Outage: keep browsing and deterministic search; pause anonymous inference and sensitive actions rather than bypass verification | Revoke widget, disable flag; retain server quotas and Auth limits |
| Better Stack Uptime / implemented, credentials pending A | Free 10 monitors, 10 heartbeats, 3-minute checks; use only 2 monitors + one heartbeat | Owner account to be created/selected; email alert destination to use owner-configured account | No visitor key; heartbeat URL only GitHub secret | Proposed ops.heartbeat. Monitor public shell/content and a bounded data-health signal; never invoke LLM for uptime | Delete monitors, revoke heartbeat URL; GitHub failure notifications + health UI remain |
| Open Food Facts / implemented C | Product reads 15/min/IP; search 10/min/IP; more than a few hundred products: use offered exports rather than crawling API | Public read API, no account/key/card | None; identify SaveHalf in server User-Agent | Proposed enrichment.off; 12 uncached reads/min, max 500/day, TTL cache and negative cache, bounded retry. At limit use existing catalogue/manual barcode | Disable adapter; remove cache and attributed images; preserve retailer prices independently |
| Cloudflare Web Analytics / implemented, token pending D | Free; 10 non-proxied sites; no published page-view billing quota on cited limits page | Owner's existing Cloudflare account | Public beacon token, no secret in bundle | Proposed analytics.cloudflare; replace existing Vercel analytics beacon, never double-track; strip query strings/fragments; no prompts/account IDs/events with personal data | Disable flag/remove beacon; no effect on browsing |
| GitHub Actions / existing, implemented expansion A/B | Standard hosted runners in public repo free. Private backups have account-specific artifact/minute limits, verify before enabling | Meteorstrike76/Savehalf | Collector service-role and backup keys only in GitHub secrets; no provider keys needed for fixture evals | Existing workflow cutover gate stays off until no duplicate cron. Backups: encrypted before public-run upload or a verified private repository; never plaintext public artifacts | Disable schedules; retain manual CLI and existing collectors |
| promptfoo / implemented B, CI only | Open-source permissive license, no hosted quota. Model calls are NOT free just because runner is free | Repository maintained by owner; no cloud account | None for fixtures; tightly capped optional live smoke uses existing endpoint | Proposed CI fixture gate: >=60 cases, telemetry disabled, no LLM judge/red-team cloud dependency. Existing node tests remain fallback | Remove dev dependency and CI step; retain JSON eval cases and node assertions |
| TanStack Query / implemented B | MIT, on-device query caching; no hosted service | Repository | None | Wrap bounded read cache; TTL and schema/source-version invalidation. Supabase fetch remains fallback | Replace cache adapter; preserve query/filter contract |
| Zod / implemented B | MIT shared validation; no hosted service | Repository | None | Server validation remains mandatory; keep existing validators until parity tests pass | Restore validators behind same contract |
| Browser barcode / implemented C | Native API has browser support limits, no hosted quota; optional ZXing browser decoder with license notices | User device | Camera permission only after user gesture | Proposed input.barcode; decode locally, transmit GTIN only; numeric entry fallback | Disable scanner; retain numeric entry |
| Leaflet + OSM / later, not approved | Leaflet open source; OSM tiles best effort, no SLA or guaranteed traffic allowance; visible attribution/cache/no bulk prefetch | Public endpoints, no owner account | None | Proposed cheapEats.map; list view and outbound map links always work. No public Nominatim autocomplete or regular bulk geocoding | Remove map chunk; keep coordinates/list and required attribution for retained data |
| Tesseract.js / later, not approved | Apache-2.0; user-device CPU/memory, downloaded OCR assets still consume CDN bandwidth | User device | None | Proposed input.receipt; lazy worker, cancel/resolution/size caps, manual correction mandatory; never upload receipts | Remove OCR assets/dependency; retain manual spend entry |
| VAPID Web Push / later, not approved | Protocol has no purchased vendor tier; browser push services retain their own limits and delivery policies | Owner VAPID identity + user's browser service | VAPID private key server-only; subscriptions private with owner RLS | Proposed alerts.push; opt-in, daily total/user caps, expiry/backoff. In-app alerts fallback | Disable sender, revoke subscriptions; keep in-app watchlist |

## Privacy and licensing

No full prompts, receipts, audio, emails or account identifiers go to monitoring/analytics/enrichment. Model queries may still contain user-provided personal details despite redaction: warn users and provide no-AI mode. Do not claim Australian data residency. Turnstile processes security/browser signals; uptime receives owner's account/contact and public URLs; OFF receives product GTIN and server IP. Product images fetched directly also reveal visitor IP to their host: disclose this or use a separately budgeted lawful thumbnail route.

OFF database is ODbL, contents DbCL, images CC BY-SA. Store provenance/license per enrichment record and fulfill derivative-database/share-alike obligations; keeping tables separate alone does not remove those duties. OFF is not current retailer pricing or reliable allergy advice. OSM data is ODbL with visible attribution. Tile access is not an unlimited free CDN. Retain all library notices in THIRD_PARTY_NOTICES when dependencies are actually installed.

Voice dictation is deferred by default: Web Speech recognition may upload audio to a browser-vendor service. On-device-only recognition can be offered only where supported and explicitly selected; typed input remains available.

## Budget assumptions (planning estimates, not measured billing)

Each monthly user: four visits, eight 12 KB database responses/visit, three 6 KB assistant responses and 3 KB enrichment = 405 KB uncached DB/API egress. Add a fixed 0.30 GB/month ingest/ops allowance. Frontend transfer 2 MB/user/month, excluding retailer-hosted images. A later optional OCR scenario adds 10 MB per downloading user at 5% uptake. Authentication is conservatively modeled as every monthly visitor being a signed-in MAU.

| Metric | 1k users | 10k | 50k | Guardrail |
|---|---:|---:|---:|---|
| Supabase uncached egress GB/month | 0.705 | 4.35 | 20.55 | 5 GB; warn at 70%, act before 85%; cached allowance is not transferable |
| Frontend CDN transfer GB/month | 2 | 20 | 100 | 100 GB; images and other team projects add usage |
| With optional OCR downloads GB/month | 2.5 | 25 | 125 | OCR remains later; disable downloads before limit |
| Raw assistant requests/day | 100 | 1,000 | 5,000 | Deterministic mode must remain available independent of inference quota |
| Desired model attempts/day | 10 | 100 | 500 | Assumes 80% deterministic routing, then 50% cache hits; hypothesis to test |
| Served public model attempts/day ceiling | 10 | <=34 | <=34 | Current 150k/4k permits 37 total attempts/day, including 3 quality checks; provider/minute caps may lower this |
| OFF reads/month after 90% cache hits, 3 scans/user | 300 | 3,000 | 15,000 | 12/min app throttle and 500/day; queue bursts; do not build a bulk catalogue crawler |
| Uptime public-shell requests/month, 2 monitors at 3 min | ~28,800 | ~28,800 | ~28,800 | Use cheap static/content checks, not model calls or expensive DB queries |

At the modeled demand, AI capacity is the first deliberate degradation around 3.4k monthly users; uncached Supabase egress reaches 5 GB near 11.6k users. At 10k there is little egress safety margin. At 50k the proposed full experience does not fit: use bounded static snapshots/client caching and reduce optional asset transfer before making any scale claim. Rate limits, bot traffic, peak bursts and shared account use can bind earlier. No quota pooling, account multiplication or paid fallback.

Bound new enrichment cache to 2,000 records x 4 KB (8 MB payload), preferences to 1 KB/account (10 MB at 10k), reports/logs to 5 MB with pruning. Reserve <=50 MB including indexes/overhead for new structures as an engineering guardrail, not a measured prediction. No embeddings initially. A 50k x 384 float32 embedding payload alone is 76.8 MB before rows/indexes.

## Evidence checked 22 October 2026

- https://vercel.com/docs/plans/hobby
- https://vercel.com/docs/limits/fair-use-guidelines
- https://supabase.com/pricing
- https://supabase.com/docs/guides/platform/manage-your-usage/egress
- https://supabase.com/docs/guides/functions/pricing
- https://console.groq.com/docs/rate-limits
- https://developers.cloudflare.com/workers-ai/platform/pricing/
- https://developers.cloudflare.com/workers-ai/platform/data-usage/
- https://developers.cloudflare.com/turnstile/plans/
- https://betterstack.com/uptime
- https://betterstack.com/community/comparisons/better-stack-vs-uptime-kuma/
- https://openfoodfacts.github.io/documentation/docs/Product-Opener/api/
- https://openfoodfacts.github.io/documentation/docs/Product-Opener/api/tutorials/license-be-on-the-legal-side/
- https://developers.cloudflare.com/web-analytics/about/
- https://developers.cloudflare.com/web-analytics/limits/
- https://docs.github.com/en/billing/concepts/product-billing/github-actions
- https://github.com/promptfoo/promptfoo/blob/main/LICENSE
- https://www.promptfoo.dev/docs/configuration/telemetry/
- https://operations.osmfoundation.org/policies/tiles/
- https://operations.osmfoundation.org/policies/nominatim/
- https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition
- https://developer.mozilla.org/en-US/docs/Web/API/BarcodeDetector
- https://github.com/naptha/tesseract.js

## Current measured baseline

Read-only check: DB 16,570,035 bytes; all 27 public tables have RLS enabled (not a full policy audit); agent enabled, public, fallback off, daily token budget 150k. Latest main production deployment READY at 5fd3d9fe956c92e941294e914de60d3a6f2750a7. Prior initial JS measured 131,268 gzip bytes; no new build/score measured for this proposal. Current account-wide billed egress/minutes/error rates were not accessible, so estimates above are not current usage totals.


## Rollout implementation status

- SQL migration 20261021220934 adds non-secret public feature flags, private bounded counters, service-only OFF cache, owner-readable moderated reports and a nullable indexed retailer barcode. All new tables use RLS; all privileged RPCs revoke PUBLIC/anon/authenticated execution. No imported barcode is guessed from a title. No source data or favourites were replaced.
- v2 is rule-first for explicit searches, comparisons, UUID-selected history, catalogue FAQ and explicit quantity/budget lists. Complex requests use the existing provider adapter only with consent and within existing quotas. Built-in calls have a separate 20 anonymous/50 account/day and 6000 total/day cap. No claim of unlimited AI at 10k users.
- Turnstile adapter verifies hostname/action server-side and refreshes single-use challenges. It remains OFF until the owner adds TURNSTILE_SECRET_KEY and the public siteKey; enable Supabase Auth CAPTCHA only after testing all auth flows. No management connector or secret setter is available for this account here.
- OFF metadata is held privately for seven days (missing products one day), <=2000 entries and <=4 KB each, under 12 uncached reads/minute and 500/day. No nutrition/ingredient advice is shipped. Enrichment is presented separately with attribution and provenance. Public derivative-database sharing obligations remain a condition for any broader data export; do not merge OFF metadata into proprietary price-history exports.
- Barcode scanner and ZXing download only on explicit opening/camera action. No camera frame is uploaded. Numeric entry always works.
- TanStack Query is isolated to the lazy assistant and caches barcode results for 30 seconds; it does not freeze retailer source prices.
- No Vercel analytics beacon remains in the rendered app. Cloudflare beacon is OFF until a public beacon token is configured; DNT/GPC, preview and callback exclusions apply.
- Better Stack has no account/management connection here. Create two public-content monitors and a collector heartbeat only on its no-card Free plan. Do not mark monitoring active until a real failure/recovery alert is verified.
- Weekly health workflow runs Sunday 21:15 UTC (Monday 08:15 Sydney during AEDT), gated by SAVEHALF_HEALTH_ENABLED and owner GitHub secrets. Collector cutover and backup gates remain unchanged. Private encrypted backups must be restored in an isolated database before being considered verified.
- Maps, voice, receipts, push and other deferred candidates are not installed or activated by this batch.
