# Deal Radar and bounded fast refresh — 12 October 2026

Production: https://savehalf.vercel.app/ and https://savehalf-au.vercel.app/

## What shipped

- Lazy-loaded Deal Radar, using three public OzBargain RSS feeds: front page, Coles and Woolworths. Headlines link to the original publisher. No article bodies or comments are republished.
- Search; Coles, Woolworths, electronics, fashion and food filters; newest, community-vote and ending-soon sorting; expiry indicators; automatic expired-post suppression; duplicate removal; up to 60 device bookmarks and saved-only view.
- Device bookmarks participate in the existing backup, restore and privacy controls. Expired or removed posts do not become current simply because they were bookmarked.
- One-click Coles and Woolworths half-price product filters. These query verified product rows, not community headlines.
- Warm paper/forest/rust noticeboard styling, mobile layout, keyboard controls and reduced-motion support. Search components preserve focus.
- Explicit current/previous-price supermarket parsers; no inferred was-prices, no recycled Wednesday sale cycles, no paid proxy or AI parser.

## Active schedule

Supabase pg_cron schedules the existing private Edge collector. Cron is UTC; Wednesday logic and daily counters use Australia/Sydney, including daylight saving.

| Source | Healthy refresh target | Bound per run | Current evidence |
|---|---|---|---|
| OzBargain | Every 15 minutes, UTC :00/:15/:30/:45 | Robots + 3 feeds; 250 KB; 20 headlines/feed | Hosted import succeeded: 38 initial headlines before cross-feed deduplication |
| Coles half-price | Every 2 hours; hourly Wednesday 05:00–12:59 Sydney | Robots + at most 4 pages; 4 MB; at most 200 product rows | Hosted page did not expose product data; failure backoff active |
| Woolworths half-price | Every 2 hours; hourly Wednesday 05:00–12:59 Sydney | Robots + at most 4 pages; 2 MB; at most 144 products | Hosted robots request returned HTTP 403; failure backoff active |
| ALDI | Twice daily, 07:10/19:10 UTC | 13 requests; 12 MB | Existing successful collector |
| Best & Less | Four times daily, 01:35/07:35/13:35/19:35 UTC | 2 requests; 2 MB; 20 variants | Existing successful collector |
| BIG W / Kmart / Target | Existing daily slots, 19:15/19:20/19:25 UTC | Existing request/page limits | Access failures remain visible; no claimed fresh coverage |
| Sydney cheap eats | Existing daily 19:30 UTC | Existing bounded collectors | No cadence change in this release |

The supermarket cron jobs wake hourly (:00 Coles, :05 Woolworths), but the database skips network invocations until the source is due. Healthy targets are not uptime guarantees. A 30-second admission tolerance prevents scheduler jitter from unintentionally doubling intervals. Maximum daily starts: OzBargain 96, each supermarket 18, ALDI 2, Best & Less 4, other retailers 1.

Failures back off: supermarket/retailer checks 6/12/24/48 hours (or their longer normal interval), RSS failures 30/60/120/240/360 minutes. Parser drift is quarantined. Individual feeds retain their prior snapshots on failure; timestamps and source health remain honest. Direct Woolworths product coverage has **not** been demonstrated. Its OzBargain community feed works, but is not equivalent to an official product catalogue.

## Coles verified snapshot

51 unique half-price products were parsed from the official half-price listing retrieved at **2026-10-11 23:07:35 UTC / 12 October 10:07 Sydney**. They were imported incrementally with that actual observation timestamp and `source_feed=direct`. Existing rows were not expired by this incomplete snapshot. This is a one-off verified import, not evidence that hosted Coles automation succeeded. The standard 72-hour freshness cutoff applies. Product availability and location-specific prices must still be checked at the retailer.

## Cost and security controls

- No billing activation, paid services, AI tokens, paid email, proxies or new npm runtime dependencies.
- Shared collector admission reserves at most 100 MB of source responses per Sydney day. Completion returns unused reservations exactly once. Crashed runs retain reservations conservatively. Request/stream byte caps stop oversized responses.
- The existing 64 MiB database safety threshold pauses new collector runs. Database measured approximately 13.2 MB during this release.
- Conditional RSS requests use ETag/Last-Modified; unchanged responses reuse snapshots. Feed storage is bounded to three rows, each at most 20 headlines. The UI performs one bounded read only when opened, shares a one-minute cache and does not poll the backend.
- These source-download limits do **not** measure total Supabase/Vercel egress or guarantee free service under unlimited public traffic. Existing project usage still needs periodic review. A free limit is a stop condition, not permission to upgrade.
- Public clients can select only the necessary feed columns, cannot write feed state and cannot read HTTP validators. Collector admission/completion functions are service-only and require the Vault-held token. No service-role key is shipped to the browser.
- Headlines are rendered as text. XML declarations/entities, unsafe post URLs, future/old posts and published expired posts are rejected. Publisher articles are never injected as HTML.
- Existing audit retention: at most 30 rows per store, up to 14 days; feedback 90 days; budgets 14 days. Optional pruning of old pg_cron execution logs was declined by automatic approval and was **not applied**. Monitor scheduler log growth separately.

## Verification

TypeScript, ESLint and production build passed. 57 unit/parser/data tests and 10 screen regression scripts passed. Tests cover robots rules, conditional prices, changed pagination, RSS expiry/URL/entity rejection, 304 reuse, lazy public reads, bookmarks, typing focus, offline checklist and existing shopping flows. Database checks in a rolled-back transaction confirmed invalid-token rejection, duplicate-run rejection, correct unused-byte refunds, no double refund and restricted public permissions.

The local CLI collector now reuses the production HTTP parsers. Existing GitHub workflow files are packaged but no remote repository is connected; they are not the active scheduler. Supabase is running the automation.

## Applied configuration

- Edge function `catalogue-collect`, version 10, ACTIVE. JWT verification remains disabled because the existing custom token admission authenticates each request.
- Applied migrations: `bounded_rss_and_supermarket_refresh` and `discovery_schedule_jitter`.
- Reviewed SQL copies: `supabase/operations/fast-discovery.sql` and `supabase/operations/discovery-schedule-jitter.sql`. These are operation records, not invented migration history.
- Production deployment: `dpl_2b17C1QDMrieoBLQAgDZExR3UoH3`.
