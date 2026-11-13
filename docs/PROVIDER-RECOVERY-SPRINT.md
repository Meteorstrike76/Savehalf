# Provider recovery and safe import sprint

Branch: `fix/provider-recovery`, from main `a16bb1d`. Collector PR #35 and
`review/phase-2` are not merged or modified by this work.

## Operational changes, 14 November 2026 (Sydney)

- Confirmed the deployed `catalogue-collect` version is 25 and contains ALDI's
  canonical URL, bounded circuit probe and Big W permission gate.
- ALDI's last probe parsed 18 rows in two requests but imported none. Its next
  eligible run is 18:10 Sydney on 14 November. It cannot complete within this
  morning's two-hour sprint without overriding the existing schedule/backoff.
- Best & Less is healthy; its next eligible run is 12:35 Sydney. No extra
  collection was triggered for either store.
- Fetched exactly two provider pages: health-beauty specials, one page each for
  Chemist Warehouse and Priceline, 25 products per page. Used 2 existing credits:
  175 before, 173 after the calls. No provider account or billing setting changed.
- Validated all 50 rows using the existing `providerRows` eligibility/host/date
  rules. Published 25 per pharmacy, preserving source dates and recording actual
  retrieval at `2026-11-13T21:15:53.907Z` (08:15 Sydney, 14 November).
- Imported 42 new IDs and updated 8 existing IDs. Projected provider table size
  was 374, below the existing conservative 1000-row cap. No stale rows were
  artificially refreshed and no retailer reference prices were invented.
- Fresh provider records increased from 99 to 149. Together with 25 fresh direct
  Best & Less records, fresh coverage increased from 124 to 174 records. Counts
  are records from sampled sources, not complete retailer catalogues.
- Read-back verification matched all 50 source prices and source/retrieval dates
  exactly. Provider averages matched the existing `numeric(12,4)` storage
  precision; the database represents averages to four decimal places. No schema
  precision was changed. The raw connector capture retains the full response.
- Aligned Big W's existing database review flag with its deployed code-level
  permission stop: `review_required=true`. Historical failure diagnostics,
  timestamps, counters and schedules were not rewritten. No Big W request made.
- Other retailer review stops, RLS, schema, credentials and cron settings remain
  unchanged. Provider imports do not mark direct collectors healthy.

## Import bug and fix

The old CLI assigned `retrieved_at=new Date().toISOString()` on every import.
Replaying a saved file could therefore extend its apparent retrieval freshness.
The fixed publisher requires a capture envelope, rejects invalid/future/captures
older than one hour, and stores the original capture time on every row. Replaying
the same envelope cannot renew that timestamp. Source dates still expire under
the existing seven-day rule. Capture time is operator-supplied provenance: this
does not cryptographically prove a fetch occurred, so record it when the actual
connector returns, never when preparing a later import.

Raw `pages.json` arrays remain supported for preview only. Do not edit the user's
raw download or add guessed fields to product objects. Prepare a separate import
envelope immediately after authorised connector retrieval:

```json
{
  "retrieved_at": "<actual ISO timestamp recorded at connector completion>",
  "pages": [{"data": ["<unchanged connector product objects>"]}]
}
```

The placeholders above describe the format; they are not a valid import fixture.

```sh
# Preview performs no database or provider requests.
node scraper/src/whichgrocer-import.mjs capture.json

# Existing server-only environment; never put credentials in this file.
node scraper/src/whichgrocer-import.mjs capture.json --publish
```

Limits: 2 MiB file; at most 8 pages of 25 products; at most 200 unique candidate
rows; existing 1000-row projected table cap. Database calls have a 15-second
timeout and retain caller cancellation. The publisher makes at most three
database calls, stops on any error, and does not silently retry a failed write.
The projected-count guard is not a cross-process reservation; do not run multiple
publishers concurrently. The existing database upsert is idempotent by product ID.
Source prices with more than two decimal places are rejected before any write,
so the existing cents column cannot silently round them into different prices.

## Read-only health check

Run `docs/operations/collection-health.sql` with an authorised database connection.
It reports direct collection and provider coverage separately, flags runs overdue
by more than 30 minutes, distinguishes recovery probes from completed imports,
and shows seven-day request/byte costs. Review-paused sources are not reported as
overdue jobs. Stored product totals are not labelled as fresh counts.

This is a manual operational report, not an enabled scheduled alert. It does not
fetch retailer pages, consume provider credits or alter any database objects.

## Tests and release boundaries

Run `npm ci --prefix scraper && npm test --prefix scraper`. New tests exercise
capture replay, expiry/future checks, rejected/duplicate counts, empty imports,
row capacity, database errors and cancellation. Existing provider price, stock,
currency and host tests remain intact. Also preview the actual pharmacy envelope
without `--publish` to verify the production data through the new CLI.

Final checks completed during this sprint:

| Check | Result |
| --- | --- |
| Provider branch `npm test --prefix scraper` | 72/72 passed |
| Deployed collector parity | All 13 deployed files exactly match PR #35 |
| PR #35 collector suite, separate checkout | 79/79 passed |
| App `node --test tests/*.test.cjs` | 193/193 passed |
| `npm run test:ui` | 28/28 passed |
| `npm test --prefix tools/evals` | 64/64 passed; fixture router, no model calls |
| `npm run typecheck`, `npm run lint`, CI-fixture production build | Passed |
| Actual pharmacy envelope preview with new CLI | 50/50 accepted, zero rejected/duplicate, original retrieval retained |
| Production read-back | 50/50 prices and dates exact; averages match existing four-decimal storage |
| Health SQL executed in production | Read-only; no eligible overdue runs at the check |
| Final production fresh counts | 25 direct + 149 provider = 174 records |
| Credit balance rechecked | 173 remaining |

The two collector test suites overlap; report them as separate runs rather than
adding their counts together. Existing npm deprecation/Zod build warnings remain.
No browser visual check was performed: production verification is at database
level, and no frontend files are changed. Deno runtime is not emulated by the
Node fixture tests; actual deployed-source parity is verified separately.

The new importer is an operator CLI, not an Edge Function or website bundle. No
Vercel deployment, Edge redeployment, schema/RLS change or new secret is needed
to use it. Review the PR before adoption; no automatic merge is enabled.

Remaining blockers: Aldi's full-run eligibility; direct retailer permission and
parser stops; stale community feeds; fully automatic provider refresh with a
shared credit reservation. This sprint does not claim those are resolved.
