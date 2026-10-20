# SaveHalf upgrade release — 17 October 2026

Production Vercel deployment: dpl_DCp4owQbKEmmMkUJoAj6FYfHJmzz. Application revision ecbec5c. Supabase catalogue-collect v17 ACTIVE, SHA 6c85fa3e3689523e932ff2f0fe71e211241c0029f825bb85a18a47c0b3f182b9.

## Delivered

- Conservative headline location hints: NSW, national, explicitly interstate or unknown; two optional filtering modes. Unknown availability is never promoted to confirmed Sydney availability.
- Six main Radar category tabs, a full retailer/category selector, responsive location controls, 44px controls and live result announcements.
- New app, new-customer, minimum-spend and pickup-only condition hints and exclusions. These are wording heuristics, not eligibility verification.
- Four shopping missions with explicit per-product caps and reusable existing saved-search controls.
- Catalogue followed words and exclusions can be remembered on the device, included in validated backups, and applied to loaded products without extra data requests. Brand inference is not claimed.
- Public collector health summary separates last-state counts and last-attempt requests from daily platform usage.
- Safe request-path diagnostics distinguish robots/feed failures without retaining credentials or query strings. Community success checks its database status write and clears obsolete failure fields.
- Valid empty RSS is accepted as a zero-headline success; malformed RSS remains rejected. Regression coverage verifies one merchant failure cannot prevent an independently successful feed.

## Production recovery and verification

After a bounded public policy/feed review, one production OzBargain probe succeeded at 16 October 21:57 UTC / 17 October 08:57 Sydney. Four requests, 31,181 returned bytes, front page refreshed. The review pause was cleared; existing cron and download reservations remain unchanged. McDonald's and Subway failed independently and retain six-hour backoff. This is not evidence of a full successful merchant rotation. v17 deployed after this successful v16 probe; its empty-feed behavior is fixture-verified and awaits a scheduled live observation.

39 frontend unit tests and 49 parser/data tests pass. Seven affected built UI scripts pass, including region filtering, shopping missions, saved preferences, signup email focus, mocked password recovery, backups/privacy, discovery and directory. Typecheck, lint and build pass. A legacy standalone storefront script also passes but is not counted as current built-app coverage. The discovery fixture was corrected to recognise current_deals instead of its obsolete deals-only mock.

Browser verification: live missions render four options; Fast-food location control excludes the explicit WA/QLD offer and keeps three other unexpired community posts. Google OAuth startup reaches Google's normal login page with no redirect_uri_mismatch; no credentials were entered and completed login/return remains unverified. Real email delivery and confirmation are also unverified.

## Remaining upgrade ledger

| Area | Status / dependency |
| --- | --- |
| Complete healthy OzBargain rotation | Observe scheduled runs; individual McDonald's/Subway retries remain pending |
| Big W direct collection | Transport failure remains unresolved; existing backoff preserved |
| Coles direct collection | Hosted parser review unresolved; old maintenance import is not full automation |
| Woolworths/Kmart/Target direct collection | Access review remains paused; requires usable permitted source |
| Price matching | Existing conservative kg/L calculations retained; exact cross-retailer identity and stronger pack-size matching still pending |
| Google and email end-to-end | Requires a user-controlled real account and confirmation email; startup only verified |
| Mobile/accessibility | Responsive controls and keyboard/focus regressions checked; complete device/reflow/screen-reader audit still pending |
| Adaptive source cadence | Existing oldest-due rotation and per-feed backoff retained; productivity-based prioritisation deferred until recovery is observed |
| Deployment automation | No remote Git connection in this checkout; tested API releases and git-bundle archive retained |
| Security | Four no-policy RLS information notices are intentional private telemetry tables. Existing leaked-password-protection warning remains; no paid feature enabled. Remediation: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection |
| Disaster recovery | Source bundle updated; a full database restore and rollback drill still pending |

No paid services, proxies, additional AI features, token-consuming calls, new external credentials or increased scrape limits were introduced. This release does not complete every historical 100-feature roadmap item.
