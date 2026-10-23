# Further reliability and startup upgrades — 22 October 2026

## Changes and why

Optional WhichGrocer snapshots, retailer community offers and collection-health sections now load their code and begin their existing queries when approaching the viewport (400 px), or when a keyboard user selects Show. The main catalogue and product URLs keep their original behaviour. Without IntersectionObserver, sections load normally. Sections are not unmounted when scrolled away, avoiding repeated downloads and lost pagination. There is no new library, service, timer or database table. Explicit Show actions retain keyboard focus on the loaded section. A local error boundary isolates a failed optional chunk/render so the main catalogue remains usable, with a user-initiated reload instead of automatic retry loops.

The first local production entry is 125.47 KB gzip versus the preceding measured 130.82 KB (~4.1% smaller). This measures the entry, not all lazy chunks or images. Visitors who scroll through all feeds still pay for those downloads and queries. Near-viewport sections may load during startup on some screen sizes. The UI regression verifies zero offscreen provider/community/health queries before activation, and that Show loads only the chosen feed. Existing pagination, source dates and licensing text remain.

Compatible lockfile updates reduce known root dependency audit findings from 24 to 12 (7 high, 3 moderate, 2 low); production-only audit has zero known findings. No major Vite/Tailwind migration or new direct dependency was added. Remaining tooling findings still need remediation; binding development servers to loopback and isolating CI reduces exposure but does not fix advisories.

Weekly health previously sent a success heartbeat after any successful DB read, even if required collectors were failing. It now checks nonempty counts, valid last-success timestamps, failure/review states and freshness before sending success. Missing telemetry fails closed. Default required stores are ALDI and Best & Less, the currently admitted healthy collectors; paused sources remain visible in reviews and are never resumed by this script. A running attempt is acceptable only with a fresh previous success and product count. The default 36-hour age is an operator policy, not a platform limit. Do not configure a longer policy merely to conceal failures.

The manual performance workflow now installs from the root lockfile and runs the pinned local Lighthouse/Playwright tools, instead of downloading Lighthouse ad hoc and installing a separate legacy browser dependency tree. The shell audit restricts its target to SaveHalf production or loopback. PR screenshot/axe audits explicitly load deferred sections before checking them, so deferral cannot hide their accessibility/runtime errors.

## Read-only collector diagnosis

Use Node 22 with existing public frontend configuration exported as VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (or SUPABASE_URL / SUPABASE_ANON_KEY):

```bash
node tools/rollout/diagnose.mjs
```

It performs one GET of at most eight public collection-status rows, prints bounded recovery advice and never requests a retailer, changes a schedule, reads a service-role key or unpauses a source. No provider tokens are used. Do not paste credentials into issues or logs.

Current evidence: ALDI and Best & Less last succeeded. Coles needs parser review. BIG W records a transport failure with backoff. Kmart, Target, Woolworths and OzBargain are review-paused after access denials. These changes improve recovery visibility; they do not establish new retailer access or repair blocked sources. Obtain permitted access or use licensed/manual reviewed data rather than bypassing controls.

## Health configuration and verification

Existing owner-only workflow remains gated by SAVEHALF_HEALTH_ENABLED and existing GitHub secrets. Optional variables:

- SAVEHALF_HEALTH_STORES: comma-separated canonical stores, defaults to `Aldi,Best & Less`.
- SAVEHALF_HEALTH_MAX_AGE_HOURS: 1–72 hours, defaults to 36.

Run `node tools/rollout/health.mjs` with the existing owner environment to write the report. Successful heartbeats require a healthy assessment. Without Better Stack credentials it still writes the report and exits nonzero for failures; no monitoring account is created. A GitHub Actions scraper cutover must also update telemetry/expected-store policy before legacy collectors are retired.

Unit tests cover missing, failed, stale, future-dated and zero-row states, review pauses, URL restrictions and the actual health runner withholding a heartbeat on failure. CI also runs existing unit/eval/UI tests and a three-width accessibility audit. No real account sign-in, physical camera or external alert delivery is claimed by these tests.

## Free-tier impact and remaining gates

No paid resource, new external service, database growth or additional scraping cadence. Optional queries and JS are deferred, not eliminated for full-page visitors. Health makes one aggregate RPC per existing weekly run; diagnosis makes one bounded public query per owner invocation. CI stays on the existing standard runners and seven-day audit retention. Actual account-wide bandwidth/egress/minutes remain unmeasured; use the assumptions and limits in SERVICES-REGISTRY, not a scale guarantee.

Turnstile, Cloudflare analytics, Better Stack setup and private backup/health credentials remain owner configuration gates. No gate was silently enabled. Backups still require a verified private restore. A smaller initial bundle is not proof of a production Lighthouse improvement: record repeated live-domain measurements separately from localhost.

## Sources

- https://react.dev/reference/react/lazy — lazy code loading.
- https://react.dev/reference/react/Suspense — loading boundaries.
- https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API — near-viewport observation.
- docs/SERVICES-REGISTRY.md — current free-tier budget and official platform sources checked for the approved batch.
