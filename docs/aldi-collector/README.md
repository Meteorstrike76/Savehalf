# ALDI collector incident: diagnosis, fix and release notes

Repository: `Meteorstrike76/Savehalf`. Branch: `fix/aldi-collector`.
Baseline: `a16bb1dee400e6e9adda8fa523a6928816016c8d` (`main`).
Investigation: 12 November 2026. No production writes or collector invocations.

## Root cause and evidence

The configured ALDI lower-prices category moved. Four public requests were made,
using the existing declared SaveHalf identity, no redirects followed, no cookies,
no private API and no browser. The first request read robots; its wildcard rules
permit both category paths. Each response had a 15–20 second timeout and a body
limit (50 KB robots; 3.5 MB HTML). There were no requests to Big W.

| Request | Observed response | Result |
| --- | --- | --- |
| `/robots.txt` | 200, public wildcard rules | Category paths permitted |
| `/products/lower-prices/k/1588161425841179` | 301, zero body bytes | `Location: https://www.aldi.com.au/products/new-low-price/k/1588161425841179` |
| `/products/super-savers/k/1588161426952145` | 200, 579,368 bytes | Existing parser extracts 6 rows |
| `/products/new-low-price/k/1588161425841179` | 200, 737,757 bytes | Existing parser extracts 18 rows |

The relevant baseline code is
[`http-collect.mjs:28–38`](https://github.com/Meteorstrike76/Savehalf/blob/a16bb1dee400e6e9adda8fa523a6928816016c8d/supabase/functions/catalogue-collect/http-collect.mjs#L28):
the old lower-prices URL is required, twelve category pages are attempted in
batches of three, and any rejected essential page becomes a new
`CollectionError(..., 'upstream')`, discarding the original error and diagnostics.
[`http-collect.mjs:71–72`](https://github.com/Meteorstrike76/Savehalf/blob/a16bb1dee400e6e9adda8fa523a6928816016c8d/supabase/functions/catalogue-collect/http-collect.mjs#L71)
uses `redirect: 'error'`, so the 301 rejects fetch and becomes a transport error.
[`index.ts:36`](https://github.com/Meteorstrike76/Savehalf/blob/a16bb1dee400e6e9adda8fa523a6928816016c8d/supabase/functions/catalogue-collect/index.ts#L36)
then sees only the wrapper: kind upstream, status null, stage fetch, path `/`.
Other categories have already downloaded, explaining nonzero total bytes despite
zero imported rows. The redirect itself has zero bytes.

Replaying the captured redirect with the captured valid product shape reproduces
that exact upstream/null exception on the unmodified baseline. See
[`before-tests.txt`](before-tests.txt): 1 passed / 8 failed, including the
`CollectionError` stack at baseline `http-collect.mjs:38`.
This establishes a current reproducible cause consistent with the supplied
production failure signature; it does not prove the response on every historical
failed date, whose original bodies were not retained.

Read-only production inspection confirmed deployed Edge version 24 contains the
same wrapper and URLs. It also confirmed ALDI failure_count 7 and the latest four
audits have 13 requests, zero rows and approximately 7.68 MB. At inspection time
ALDI's retained `saved` field was 264; this field is not a count of fresh rows.
Big W had transport failures and `review_required=false`, so it was not actually
permission-paused in the inspected deployment. This PR adds an explicit Big W
permission gate; it takes effect only when deployed. No production pause setting
was changed during this investigation.

## Exhaustive null-upstream path review

| Baseline path | Could produce upstream + null after bytes? | Finding |
| --- | --- | --- |
| Essential ALDI page rejection at `http-collect.mjs:38` | **Yes** | Any fetch rejection, redirect rejection, HTTP failure, stream failure, body cap, or parser exception for either promotion page is replaced by the same statusless upstream wrapper. Other pages can have supplied the recorded bytes. This is the only explicit upstream/null constructor in these files. |
| All category requests reject, `http-collect.mjs:34` | Not directly | Plain Error defaults to transport, loses individual diagnostics; now preserves them. |
| Non-OK HTTP response, `http-collect.mjs:74` | Not directly | Upstream kind for e.g. 5xx includes a numeric HTTP status; the essential-page wrapper used to erase it. |
| Streaming/body/time limits, `http-collect.mjs:71–80` | Only through the essential-page wrapper | Shared cap remains 12 MB; each HTML cap remains 3.5 MB; fetch timeout remains 12 seconds. These stay enforced. After-body failures now preserve HTTP status and `read_body` stage. |
| `aldi-html.mjs` markup/shape handling | Only thrown parser errors through wrapper | Captured current Nuxt data parses unchanged. A valid response yielding zero rows previously returned healthy `empty`, rather than parser review; this is separately fixed. No product eligibility checks relaxed. |
| `governance.mjs` drift guard / `index.ts:22–24` | No | A positive count below 25% of a prior count ≥20 is quarantined as parser; zero was excluded from that guard. Guard remains unchanged; zero listings now fail at parse stage. |
| `index.ts` database/status errors | No | Different stage and generic transport classification, not explicit upstream/null. |
| `supermarkets.mjs` | No ALDI path | Only Coles/Woolworths dispatch there; unchanged. |

## Changes

1. Replace only the obsolete ALDI category path with the observed canonical URL.
   No automatic redirect following or new access workaround.
2. Preserve actual essential-page kind, HTTP status, path and stage. Empty parsed
   ALDI HTML and malformed product shapes are `parser`, stage `parse`, HTTP 200.
   They retain prior products and require review. Nonessential rejected pages
   remain visible as bounded per-page diagnostics on an otherwise valid result.
3. Three consecutive audited zero-row failures open the ALDI circuit. It reads
   the latest three audit rows, ordered by timestamp then id. A success, positive
   quarantine, or successful probe breaks the streak. No schema change required.
4. As explicitly approved during this task, an open circuit permits **two total
   source requests: fresh robots + one listing probe**, instead of thirteen.
   The handler enforces that request limit independently of the adapter. A failed
   robots check stops at one. This narrow circuit applies to ALDI; it does not
   change the other retailers' adapters or their review pauses.
5. A positive probe records `collection_audit.status='probe_ok'` and observed
   candidate count, never writes deals or refreshes `last_success_at`, `saved`,
   `sales` or product timestamps. Collection status remains `empty` with an
   explicit probe-only message. The next **due** run may attempt full collection.
   It does not run extra pages during the probe invocation.
6. Reservation, next-run/backoff, byte charging and review-stop remain in the
   existing database functions. `finish_catalogue_run` is still called in
   `finally`, including probe success/failure. No counter/backoff reset or cron
   dispatch was added. An empty probe sets parser review, so a maintainer must
   clear the existing review stop after verifying a future parser repair.
7. Big W stays permission-paused in the Edge handler and shared Node collector. Generic transport errors
   now expose only an allowlisted `transport_reason`: `dns`, `tls`, `timeout`,
   `refused`, `other`, with stage `robots` for robots fetch failures. Nested
   causes/codes are considered, but raw exception messages/addresses never enter
   diagnostics. Existing HTTP/1 transport code is unchanged; no workaround added.
8. Node mirrors are explicit re-exports of the canonical Edge implementation,
   including new governance/recovery mirrors. Identity tests ensure both runtimes
   execute the same functions; no second parser copy can drift.

## Fixtures and tests

[`scraper/test/fixtures/aldi-2026-11-12`](../../scraper/test/fixtures/aldi-2026-11-12)
contains the sanitised redirect metadata, applicable robots rules, and the public
product-only Nuxt reference graphs from the two successful pages. Public product
amounts, identifiers and structure are unchanged. App state, arbitrary scripts,
cookies and response headers are omitted. Original HTML hashes and byte counts
are in `capture.json`. Fixtures are for tests only and are never imported as live
catalogue observations.

Run the regression and full collector suites:

```sh
node --test scraper/test/aldi-recovery.test.mjs scraper/test/edge-circuit.test.mjs scraper/test/transport-diagnostics.test.mjs
npm ci --prefix scraper
npm test --prefix scraper
```

`before-tests.txt` records the pre-fix failing regressions.
`after-tests.txt` records the final complete collector run. Handler tests execute
the actual TypeScript entrypoint with stripped types, a stub Deno host and fake
REST/source responses. They verify reservation denial, review stop, two-request
probes, no partial ingestion, next-due full recovery, failed audit handling,
original drift quarantine, Big W zero-network pause and reservation completion.
They do not claim to emulate the Deno network stack or a live database transaction.

Final local validation:

| Command | Result |
| --- | --- |
| `npm ci` / `npm ci --prefix scraper` | Passed |
| `npm run typecheck` | Passed |
| `npm run lint` | Passed |
| CI-fixture `npm run build` | Passed |
| `node --test tests/*.test.cjs` (after build) | 193/193 passed |
| `npm test --prefix scraper` | 79/79 passed |
| `npm ci --prefix tools/evals --ignore-scripts` / `npm test --prefix tools/evals` | 64/64 passed, fixture router only, no model calls |
| `npm run test:ui` | 28/28 passed |
| `git diff --check` | Passed |

Build uses the existing workflow's public test configuration:
`VITE_SUPABASE_URL=https://savehalf-ci.invalid` and
`VITE_SUPABASE_ANON_KEY=savehalf-ci-public-fixture`. No real credential is needed.
Existing dependency deprecation/Zod build-annotation warnings remain. The new
handler tests emit Node's experimental type-stripping warning.

## Exact Edge deployment required — not performed

After PR review/approval, deploy **only `catalogue-collect`**, preserving its
existing authentication configuration (`verify_jwt=false`, collection-token
validation inside the handler), environment secrets and cron configuration.
Upload the entire existing `supabase/functions/catalogue-collect/` module tree.
The changed production files are exactly:

- `index.ts`
- `http-collect.mjs`
- `governance.mjs`
- `recovery.mjs`

Their unchanged imports must remain bundled: `aldi-html.mjs`, `bestless-html.mjs`,
`community.mjs`, `images.mjs`, `kmart-html.mjs`, `normalize.mjs`, `robots.mjs`,
`supermarkets.mjs`, plus `deno.json`.

No migration, SQL operation file, RLS policy, new secret, website/Vercel deployment,
retailer unpause, cron change, GitHub workflow dispatch or retired ETL deployment
is required. The scraper shims/tests/docs belong in GitHub, not in the Edge bundle.
Production can remain on its current backoff schedule after deployment. Inspect
the first due probe audit (≤2 source requests, no product refresh), then the next
due full result (≤13 requests). Any policy/access/parser review stop remains in
force; do not clear it automatically. Confirm fresh observations rather than
manually extending the 72-hour window. Rollback by redeploying the previous Edge
bundle; no data/schema rollback is needed.

## Verification limits

Only two current ALDI product pages were downloaded, not all categories; no claim
is made that 308 rows or any particular number will return. Full 13-request and
recovery lifecycle checks replay sanitised fixtures offline. Historical failing
HTML is unavailable. No live Big W request was made, so its actual DNS/TLS/timeout
cause is not claimed; subtype tests are simulated. Deno is unavailable locally:
the production Deno network/runtime and a deployed fix have not been tested. No
production writes, deployment, paid services, schema or RLS changes were made.
