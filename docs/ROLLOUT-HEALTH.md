# SaveHalf approved integration rollout — 22 October 2026

## What is active

- PR #4 merged as 2a7c8495b3869dc802dffd388bc784a3abdb660f. Production deployment dpl_4PokRAFRCXNg4ekXK1rJiP9tywaM is READY and assigned to savehalf.vercel.app. Deal Assistant Edge version 9 is active with JWT verification. Rule-first search and explicit budget planning are enabled. Barcode/OFF lookup is enabled with bounded private cache. The new scanner UI is released.
- Turnstile, Cloudflare analytics and Cloudflare model fallback remain OFF pending owner credentials/configuration. Better Stack monitors/heartbeat are not configured. Weekly health and encrypted backup workflows remain gated pending owner GitHub secrets/variables. No new accounts, payment methods, paid models or paid tiers were created.
- Existing auth users, favourites, URLs and collector schedules were preserved. Reports require an authenticated validated user and remain moderated; they never overwrite a public price.

## Validation evidence

- 120 unit/integration tests passed locally; 64 offline promptfoo router contracts passed, with telemetry off and zero provider calls. Existing 18 UI regressions passed. Frontend/Edge type checks and lint passed. Final-candidate app CI 39686944493 and performance/accessibility CI 39686944453 both passed before merge.
- Live tests: coffee returned a fresh ALDI source at $6.39 with source timestamp; explicit 2 milk/1 rice with a $20 budget returned 467 cents of matched products; injection was refused; OFF found barcode 3017620422003 as product identity; unauthenticated price-report submission was rejected. A catalogue-substring routing bug was found and fixed with a regression test. Barcode prices now require an explicit retailer barcode mapping, not a title similarity guess.
- The final successful three-width audit ran on release head 60d933d: GitHub run 39686944453. Before production / after local candidate: performance 90 / 99, accessibility 96 / 100, best practices 100 / 100, SEO 100 / 100. The extra experimental agentic-browsing category was 100 / 50; the candidate ran on a local host, so this is not treated as a production-domain score. Both before/after in this run used the same Lighthouse 13.5 engine. These are single lab runs with origin/network differences, not field metrics or a guaranteed improvement.
- axe found zero WCAG A/AA violations and zero page errors at 375, 768 and 1280 px in the final candidate. Automated checks cannot establish full accessibility compliance. Final candidate audit passed before merge.
- Candidate initial JS ~130.82 KB gzip locally versus previous measured 131.27 KB. Production-configured CI can differ slightly with public configuration strings. Assistant 14.14 KB gzip; barcode input 26.36 KB plus separate decoder 117.43 KB gzip, loaded only on opening/camera action. No OCR/map assets were installed.

Production browser verification: Deal Assistant v2 loaded on the production domain; a complete coffee query typed without focus loss and returned a sourced price with AI consent unchecked. Favourite changed to Saved and adding to the shopping list showed its success toast. Manual barcode lookup was checked; physical camera capture and signed-in report/list workflows were not exercised with a real account.

## Current usage and telemetry limitations

Read-only DB check: 16,750,259 bytes (~16.75 MB), versus ~16.57 MB at proposal time. One OFF cache entry, no pending price reports, no negative feedback. Seven-day agent-event sample: 8 ok, 1 no_data, 3 unavailable. These 12 logged events include rollout/owner smoke tests and omit some early rejections; 3/12 is not a representative production error rate. New rule responses record provider=rules with zero reserved model tokens.

The new scrape_runs table has no recent rows because existing production collectors still use collection_status. The health RPC now includes both. ALDI last succeeded 22 October 06:10 Sydney with 264 saved; Best & Less 06:35 with 20 saved. BIG W failed its last collection; Coles, Woolworths, Kmart, Target and OzBargain have failed/review-gated source states. Existing dated WhichGrocer snapshots are separate. This release does not claim to have repaired blocked retailer access or full catalogue coverage.

Account-wide billed Supabase egress, Vercel bandwidth and GitHub minutes were not accessible through these tools. The 1k/10k/50k figures in SERVICES-REGISTRY are estimates, not measured usage. At 10k users the modeled uncached egress margin is narrow; heavy planner use, bot traffic and shared-account projects can exhaust quotas sooner. No DDoS availability guarantee is made.

## Remaining risks and next work

- Complete owner-side Turnstile/Auth CAPTCHA setup, verify success/failure paths, then enable its flag. A frontend widget alone is not protection. Do not weaken Auth when configuring it.
- Configure Better Stack Free monitors/heartbeat and verify an actual alert; configure the analytics token only after privacy checks. Hosted error tracing remains deferred.
- Configure GitHub secrets for weekly reports/backup and perform an isolated restore. Do not expose backups or auth data in public repository artifacts.
- Production dependency audit: zero known advisories. Development tree still has 24 advisories (15 high, 7 moderate, 2 low) after replacing the obsolete LHCI wrapper and compatible tooling updates. Remaining direct Vite/Tailwind fixes require a major tooling migration; no forced breaking upgrade was applied. CI has read-only permissions, no production secrets for PR checks, and binds preview servers to loopback.
- Supabase security advisor retains its existing leaked-password-protection warning. Private service-only RLS tables intentionally have no client policies; anonymous grants/RPC access were explicitly checked as denied. RLS presence alone is not a complete policy audit.
