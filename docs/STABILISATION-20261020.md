# SaveHalf staged stabilisation — 20 October 2026

Production: https://savehalf.vercel.app/
Final code merge: 3f71017. Deployment dpl_Ck6pkBQ3e2rvVBiAHYJgxCKPQzVz READY.
Feature branch: fix/stabilise-20261020, locally merged only. GitHub branch creation rejected with HTTP 403 Resource not accessible by integration. No remote push or GitHub merge occurred.

## Stage 1 — checked statistics before changes
| Metric | Before | After | Interpretation |
|---|---:|---:|---|
| Database bytes | 15,988,403 | 15,988,403 | 15.25 MiB; about 3.2% of 500 MB allowance |
| Stored direct products | 455 | 455 | No product deletion or fabricated refresh |
| Fresh direct products | 317 | 317 | Freshness-filtered view at observation time |
| Provider snapshots | 98 | 98 | Separate dated product records |
| Favourites / auth users | 4 / 2 | 4 / 2 | Preserved |
| Internal collection budget today | 12,452,219 bytes | 12,452,219 bytes | About 12.5% of internal 100 MB cap; not billed egress |
| WhichGrocer credits | 4 / 200 used | 4 / 200 used | No card on connected Personal Lite account; no paid calls made |
| Main JS gzip | 130.53 KB | 130.80 KB | About 0.27 KB increase; no new dependency |

Supabase monthly egress, Vercel monthly bandwidth/build-minute totals and account-wide GitHub billed minutes are NOT available through connected tool capabilities. They are unknown, not zero. Do not infer platform-wide quota safety from DB size or internal incoming collection bytes. At 10,000 visitors the main JS increase alone is roughly 2.7 MB before caching effects, not a measured billing figure.

Main GitHub repository: zero Actions runs. Old savehalf-etl repository: one failed run (38476402552), job duration 17 seconds; that elapsed duration is not account billing usage. Standard public runner execution and private-minute allowances have different billing rules. Existing prepared workflows are not active in the main remote repository.

Official limits rechecked:
- https://supabase.com/pricing — 500 MB DB, 5 GB egress, separate 5 GB cached egress, 1 GB Storage. Leaked-password protection is not included in Free; do not enable a paid upgrade to clear that advisor warning.
- https://vercel.com/docs/plans/hobby — 100 GB fast transfer; noncommercial use. No monetisation added.
- https://docs.github.com/en/billing/concepts/product-billing/github-actions — standard public runner billing differs from the private Free allowance. No account-wide usage endpoint was available in this connection.

## Stage 2 — root causes and changes
1. Cache race: a failed old request deleted a newer entry with the same key. Eviction now checks promise identity. Regression covers replacement survival and normal failure recovery.
2. Provider import capacity counted all incoming rows as new, falsely blocking idempotent refreshes near its 1,000-row guard. It now looks up existing IDs and counts only new unique IDs. Provider IDs must match their retailer prefix.
3. Five UI failures were stale test contracts: old product endpoint, unscoped status/section selectors and wrong counting of inline versus modal feed reads. Updated the mocks to real bounded endpoints and assertions to the intended section; did not remove the expiry, no-refetch, image recovery or calculator checks.
4. Live verification found misleading zero-results copy below valid provider results. Direct counts and the direct empty state now explicitly distinguish provider/community sections.
5. Old remote ETL fails on Gemini model 404. It still installs google-genai and passes GEMINI_API_KEY, contrary to project rules. Do not upgrade the model as a workaround. Remote writes remain blocked, so retirement is NOT applied. A manual-only replacement is supplied in legacy-etl-workflow.yml; apply to the old repository only when authorised write access is restored.

## Stage 3 — upgrades and commits
- 087b476: cache eviction fix and regression.
- 3010552: provider capacity fix and corrected scoped UI fixtures.
- e3bfbaa: open-tab snapshot expiry, full UI runner, pinned CI actions and ten-minute job cap; updated history-retention explanation.
- f0a70c2: distinguish direct product counts from provider listings.
- Local merge commits 2c3644a and 3f71017 followed passing checks.

Provider cards now re-evaluate freshness every visible minute and when a tab becomes visible. They hide after 72 hours since retrieval or seven days since source update without issuing background network requests. Server RLS remains the authoritative filter. No provider prices enter native price history, half-price filters or account favourites. CI now runs all 17 UI scripts, rather than only a subset. No new dependency/service was installed.

## Stage 4 — verification and limits
- Production build, typecheck and lint passed.
- 45 frontend unit tests, 56 parser/pipeline tests, all 17 built-UI regression scripts passed.
- Full UI suite repeated after the final copy fix: 17/17 passed.
- Live final asset confirmed /assets/index-CDRyF7qi.js. Production showed 98 matching provider products, 12 per page; search sakata showed five matches and a separately labelled zero direct-catalogue count.
- Browser captured extension-origin metadata errors; no application-origin console exception was observed in the inspected interactions. This is scoped inspection, not a guarantee of no errors in every browser/user flow. Real Google sign-in was not exercised with private credentials.
- Vercel 30-minute initial and five-minute final error/fatal searches returned no records. Initial one-hour request failed retention validation; shortened window worked. Static SPA errors are not comprehensively captured by function runtime logs.
- Supabase function/postgres error-text searches returned no matching records in available logs; paused collector failures are recorded in collection_status.
- Latest successful automated imports verified against exact timestamps: ALDI 263 rows at 2026-10-19T19:10:08.308Z (20 October 06:10 Sydney); Best & Less 20 rows at 2026-10-20T01:35:02.164Z (20 October 12:35 Sydney). Matching database rows confirm writes, beyond a successful cron dispatch. No fresh manual live scrape was forced, and no failed collector was marked healthy.
- Screenshot stabilised-production-20261020.jpg shows the final production homepage at the existing browser viewport. It is not a 375/768/1280 responsive/Lighthouse certification; those remain outstanding from the earlier audit.

## Unresolved / next priorities
1. Restore GitHub repository write access, retire the old Gemini workflow, publish reviewed source and activate the existing guarded CI workflows. The provided legacy replacement stops scheduled AI collection but is not remotely applied.
2. Provision an independently issued WhichGrocer server key through a secrets manager and verify HTTP documentation before implementing unattended refresh. ChatGPT connector access is not a website backend credential. Do not extract it, put keys in the client or substitute recurring AI jobs. Current provider snapshots expire if not renewed.
3. Coles parser remains paused; Kmart/Target direct requests remain blocked; BIG W transport remains failed/backed off; Woolworths requires permitted direct access; OzBargain is paused after 403. Provider listings are an attributed alternative, not proof that these direct collectors are fixed. Empty source responses never produce invented products.
4. Obtain actual billing dashboards' egress/bandwidth/build-minute totals and compare account-wide usage before expanding traffic. Database size alone is healthy; egress remains the scaling risk.
5. Execute a real private backup and isolated restore drill after repository/secret prerequisites are met. These have not been claimed complete.

No database migration, auth setting, public URL or existing user-owned record changed in this stabilisation release. Existing Supabase Cron collection continues. Paid services and new dependencies were not added.
