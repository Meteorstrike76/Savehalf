# Student Pack adoption — 28 November 2026

## Implemented, pending account activation

Keep Vercel/Supabase. Do not activate billing or use paid proxy/AI extraction.

| Service | Prepared implementation | Activation required |
| --- | --- | --- |
| Sentry Education | Lazy React error SDK; only public home page, privacy opt-outs honoured; messages, request data, user identity, breadcrumbs and replay omitted; 10% sampling, five-event page-session cap | Sign in/redeem Education, verify free entitlement expiry and disabled on-demand/overages; obtain public project DSN |
| Zyte Scrapy Cloud | Four-source discovery spider, robots respected, no retries/redirects, one concurrent request, 2 MB per response, 90-second job timeout; empty extraction reported as incomplete; no automatic publication | Redeem free unit, verify quota and source-use evidence, assign project ID and deploy with shub |
| BrowserStack | Manual GitHub workflow; one sequential Android browser session; public search/filter smoke test | Redeem Automate Mobile offer, confirm chosen device and Playwright version supported, save username/access key as GitHub secrets |

No student account has been authenticated or activated by this release. No secrets, paid plan or provider cron has been configured. Public Sentry Education page currently requires sign-in. Integrations must not be described as operational until an actual account test passes.

## Sentry configuration after redemption

Set public Vercel configuration only after verifying the entitlement and billing controls:
- `VITE_SENTRY_ENABLED=true`
- `VITE_SENTRY_DSN` = the project's public DSN (never an auth token)
- `VITE_STUDENT_PACK_VERIFIED_UNTIL=YYYY-MM-DD` = a date before benefit expiry

Absent/expired config means no SDK initialization or telemetry. The browser cap is not an account-wide quota: provider-side disabled overages and a project rate limit are still required. Add only the exact verified ingest hostname to CSP connect-src before activation, then redeploy and verify an intentionally generated, non-sensitive test error in a test project. Do not enable session replay, logs, AI, profiling or tracing. Disable environment flag to roll back.

## Zyte configuration after redemption

Use `tools/student-pack` as the Scrapy project. Configure a free unit only, deploy through the official `shub` CLI/GitHub integration, and set `STUDENT_PACK_FREE_PLAN_VERIFIED=true` only after checking the account. Record source-use evidence before changing individual `sources.json` flags. Run `scrapy crawl catalogues -O discovery.jsonl` locally first. Output is discovery evidence, never publishable product data; validate referenced catalogues separately. Missing candidates must never deactivate existing products or be labelled confirmed absence. No Zyte API, paid proxy, AI extraction or automatic schedule is included.

## BrowserStack configuration after redemption

GitHub secrets: `BROWSERSTACK_USERNAME`, `BROWSERSTACK_ACCESS_KEY`. Repository variable: `STUDENT_PACK_FREE_PLAN_VERIFIED=true` only while the redeemed offer is active. Dispatch `Student Pack mobile smoke` manually; it has no scheduled run. Check device access/version support on the redeemed account before first dispatch. Disable the variable when the offer expires. Do not include shopper accounts, authentication tokens or private URLs in tests.

## Official references checked

- https://education.github.com/pack
- https://sentry.io/for/education/
- https://docs.sentry.io/platforms/javascript/guides/react/configuration/options/
- https://www.zyte.com/scrapy-cloud-student-backpack/
- https://docs.zyte.com/scrapy-cloud/usage/deployment.html
- https://www.browserstack.com/github-students
- https://www.browserstack.com/docs/automate/playwright/playwright-capabilities

Offers differ between the Pack listing and provider landing pages. Account entitlement, not marketing wording, controls activation. Record redemption date, expiry, plan, caps and overage setting in the private service registry.
