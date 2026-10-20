# SaveHalf household release — 10 October 2026

The upgrade builds on the discovery release. Open **My shop → Household tools** for cupboard, spending, trips, price evidence, backup and privacy. Cheap meals combines one to three authored recipes, scales one to eight servings and subtracts matching cupboard quantities once before rounding whole packs. Missing sizes/prices remain unknown. No AI calls, paid integration, billing activation or paid notification service was added.

## What is delivered

- Device cupboard quantities, user-entered dates, use-first ordering and fixed-recipe ranking; no food safety guarantee.
- Vegetarian/plant recipe choices, portion scaling, combined ingredient quantities and an explicitly selected bean swap for lentil pasta.
- Manual receipts, weekly envelope, current basket estimate versus receipt, and user-entered reference savings. Actual spending is not inferred from catalogue reductions.
- Price-rise scenarios, travel/time detour calculations, manual store order, equal or assigned bought-item shares with exact cents, plain-text handoff and calendar files. No payments or paid routing.
- Previewed/validated device backup/import with rollback on storage failure, scoped clearing, printable lists, optional offline checklist and mobile navigation.
- Food weekday planning, three saved areas, publisher condition mentions, meal reminders and reviewed student/community/surplus service handoffs.
- Device-local price evidence: at most 50 watched IDs, 30 observations each, 90 days. Fresh exact variants only; three Sydney dates required for lowest observed. Sale intervals need repeated observed entries and never guarantee the next discount.
- User-reviewed product pairs and known-unit comparisons. **This adapts the curated global equivalence proposal; it does not implement a globally verified mapping.** Publisher terms plus personal condition notes adapt the universal promo-classifier proposal.
- Per-store fresh category counts, readable latest health, private bounded audits, parser row-drop quarantine, replay tests and a source admission checklist.
- Owner-only account store preference save/review/apply/delete; private stale-price feedback, capped at three per user/day and 1,000 retained reports globally. Feedback never updates a price automatically.
- Lazy household panel and five-minute in-memory deduplication for public food/grocery/health reads. Auth and account data are excluded from that cache.

## Automation and budgets

Retailer and food schedules remain those already configured. A new database-only retention job runs at **19:45 UTC daily** (06:45 Sydney during daylight saving; 05:45 in standard time). It retains collector audits for 14 days and at most 30/store, reports for 90 days, and reservations for 14 days.

Before upstream collection, private authenticated admission reserves 12 MB for ALDI, 4 MB for Best & Less or 8 MB for other sources, against a **100 MB per Sydney day** ceiling. New runs pause above **64 MiB database size**. Existing per-day start caps, concurrency guard and three-day failure/empty pauses remain. During collection, streamed returned HTML is checked against per-run byte budgets, with 13/2/28/26 request limits respectively. A final streaming chunk may cross the boundary before cancellation; these are application guards, not exact network billing measurements.

A successful live ALDI check refreshed **286 products**, using **13 requests and 8,937,412 HTML bytes**. Failed or quarantined checks do not refresh old price timestamps. Other retailers can still block or omit listings. No old Wednesday offers are automatically renewed.

The browser offline worker caches the dedicated checklist and public hashed JS/CSS only. It does not cache Auth routes, account responses or retailer/API data. Offline prices are explicitly last-known estimates. Preparing the checklist is user initiated.

## Verification and remaining limits

Typecheck, lint and production build pass. Tests cover ingredient unit matching/expiry/whole-pack rounding, exact cents, invalid backup rejection, observed-history thresholds, streamed budgets, parser regressions, calendar escaping/folding and offline text-safe rendering. Nine DOM screen regressions check focus, lists, recovery logic, images, food, household tools and discovery. Database ownership/spam tests used two transaction-local fixtures and were rolled back. Service-only tables intentionally have no client RLS policies.

Google provider completion, consent configuration and actual confirmation email delivery remain external integration checks. Required Google callback remains `https://mdbqlcnzbakimfjrfczz.supabase.co/auth/v1/callback`. No new OAuth client secret is embedded in the frontend. No successful real Google/mail sign-in is claimed.

Accessibility has bounded semantic/focus/reduced-motion checks, not a full WCAG audit or certification. New custom Vercel firewall settings could not be read through the connected account (configuration returned 404); no custom bot rule or Attack Mode was enabled. Vercel's documented automatic protection covers requests to Vercel, not direct Supabase traffic. Auth, RLS, bounded reads and private writes reduce exposure, but do not guarantee zero abuse, downtime or quota exhaustion. The observed database size was about 12.97 MB; platform-wide bandwidth/billing headroom was not verified.

Free-provider quotas are finite. Continue one retailer pilot at a time; do not add paid proxies, AI parsing, maps, email campaigns, global unbounded history or provider subscriptions to fill missing coverage.

Production deployment `dpl_8yxuH6m5Dv2nnmkowWdnU5dTN418` is READY. Public home, JS/CSS, lazy household chunk, offline page and worker return 200 with the intended cache/security headers. Live desktop browser checks confirmed panel loading, stable amount focus and no horizontal overflow at 1363 × 936. Wider phone/zoom/assistive-technology audits remain outstanding.
