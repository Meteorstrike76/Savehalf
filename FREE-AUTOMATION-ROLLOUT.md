# Free automation rollout — beauty and fast food

## Plan
1. Admission: test public OzBargain RSS for Adore Beauty, Sephora, McDonald's, KFC, Hungry Jack's, Domino's and Subway. Reject paid APIs, AI parsers, private account/app scraping and blocked/invalid sources.
2. Collection: reuse the existing 15-minute job; keep four requests per run (robots, front page, two oldest due merchant feeds), 250 KB per run and the existing shared 100 MB/day reservation ceiling. No additional cron, paid proxy or third-party account.
3. Data: at most 20 headlines/feed, original post links and published conditions, no inferred meal prices/was-prices or national availability. Known expiry filters remain; fast-food posts without a published expiry hide after 48 hours. Last check and source failures remain visible.
4. UI: Beauty and Fast food entry points and filters; direct official handoffs. Warn about app, membership, pickup/delivery, surcharges and participating stores. Keep restaurant menu data separate from community headlines.
5. Verify: parser rotation/failure/condition/freshness tests, build and typecheck. Verify backend deployment and scheduler without overriding its due guard. Publish UI only to the existing authorized Vercel project; retain pending source if team access remains denied.

## Capacity
With all 13 merchant feeds admitted, a merchant normally gets a turn within seven 15-minute runs (about 105 minutes). This is an expected healthy cadence, not a delivery guarantee. The front page still checks every 15 minutes. Hard maximum: 384 requests and 24 MB reserved feed data/day before retry/governor pauses. Daily platform-wide usage is not measured by those source limits alone. Storage stays bounded at 280 headline slots including the front page, with duplicates hidden in the UI.

## Release status
Updated after source admission and validation below. Vercel team access currently returns 403; no frontend publication claimed until a READY deployment is verified.

## Delivered and limits
- All seven candidate RSS endpoints returned HTTP 200 and RSS items. The seven-day beauty window contained no recent Adore Beauty or Sephora posts; feeds remain admitted for future posts. No fees or AI token use added.
- Initial eligible food headlines: KFC 1, Domino’s 1, Subway 2; McDonald’s and Hungry Jack’s 0. These are community posts, not verified local meal prices. Empty feeds never create invented offers.
- Backend catalogue-collect version 15 deployed ACTIVE. All 14 feed-key slots admitted with existing public SELECT RLS and custom collector authentication unchanged. Seed snapshots saved and counts read back.
- The existing */15 cron remains active. Normal merchant check interval rises from about 45 to about 105 minutes to retain the same free request budget. Hosted execution of the expanded rotation awaits the next due run; no guard was overridden.
- New Beauty / Fast food filters, home entry buttons, Cheap Eats handoff, 21 official directory links, condition notices and 48-hour unknown-expiry food cutoff implemented in the production build.
- Validation: 47 parser/data tests, 6 frontend utility tests and 3 built-UI scripts passed; TypeScript, lint and build passed. No new security-advisor finding; existing private-table INFO notices and disabled leaked-password protection remain unchanged.
- Frontend publication remains blocked: Vercel API returned 403 for cyber-expert2. No authenticated CLI is installed. Do not claim these UI features are live until released to the existing project.

## Rollback / failures
RSS sources back off individually; the shared request/byte caps remain in force. To retire a source, remove it from COMMUNITY_FEEDS in the backend and redeploy; its stale entries age out and source status remains visible. To roll back UI, retain the prior READY Vercel deployment. Existing restaurant menu collection is unchanged. This rollout does not resolve Woolworths direct half-price ingestion.
