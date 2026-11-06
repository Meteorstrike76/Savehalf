# Phase 2 implementation evidence

Baseline: 6af3c927cde26e49c3c5f0004f799c143a98e640. Branch: review/phase-2.

Scope: B01, B02, B10, B11; B04 migration file and regression only. No database migration file was executed. The B04 test extracts ONLY the parser definition, renames it into review_test, and compiles it inside disposable in-memory PostgreSQL (PGlite); no application tables, data backfill, or production connections exist in that harness.

## Exact focused commands and captured output

### B01

Command: `node --test tests/review-b01.test.cjs`

```text
✔ B01 cards qualify reference reductions beside the price (0.992747ms)
✔ B01 static fallback metadata makes no unsupported store claim (0.501491ms)
ℹ tests 2
ℹ suites 0
ℹ pass 2
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 115.844287
```

### B02

Command: `node --test tests/review-b02.test.cjs`

```text
✔ B02 SSR metadata uses only stores with fresh products, escapes HTML (83.169213ms)
✔ B02 unknown, failed, invalid and empty coverage fail closed without store names (40.031683ms)
✔ B02 browser metadata changes with coverage instead of retaining vanished stores (13.046448ms)
ℹ tests 3
ℹ suites 0
ℹ pass 3
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 587.791749
```

### B10

Command: `node --test tests/review-b10.test.cjs`

```text
✔ B10 catches render failure, offers recovery and preserves device data (132.105112ms)
ℹ tests 1
ℹ suites 0
ℹ pass 1
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 675.416222
```

### B11

Command: `node --test tests/review-b11.test.cjs`

```text
✔ B11 late User A reads cannot populate User B or signed-out state (4.389262ms)
✔ B11 read failures are explicit; rapid same-item toggles write once (2.735921ms)
✔ B11 rejected and thrown mutations restore state and show an error (1.271368ms)
✔ B11 restarting a StrictMode store invalidates earlier loads and writes (3.424748ms)
ℹ tests 4
ℹ suites 0
ℹ pass 4
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 211.211755
```

### B04

Command: `node --test tests/review-b04.test.cjs`

```text
PASS "Rice 2 x 2kg" -> {"basis":"100g","quantity":4000}
PASS "12 x 25g" -> {"basis":"100g","quantity":300}
PASS "2 large eggs" -> {"basis":"each","quantity":2}
PASS "Air fryer 5L" -> null
PASS "500ml" -> {"basis":"100ml","quantity":500}
PASS "1.5L x 6" -> {"basis":"100ml","quantity":9000}
PASS "2 x 500g x 3" -> null
PASS "Rice approx 1kg" -> null
PASS "400g + 100g bonus" -> null
✔ B04 PostgreSQL parser body handles all requested cases (1971.707505ms)
ℹ tests 1
ℹ suites 0
ℹ pass 1
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 2108.8242
```

## RLS/grants correction

Actual tables, ACLs, policies and pg_default_acl were queried first. The current schema has 34 public tables with RLS, 23 policies. The read-only tests/sql/rls-grants.sql was then submitted verbatim to the connected Supabase execute_sql tool. Returned result:

```
PASS: 34-table grants and synthetic-user read isolation; warnings are separate
```

The previous expectation that authenticated has NO UPDATE grant on saved_deals was a false positive: Supabase's default ACL grants UPDATE, but the absence of an UPDATE policy denies row updates. An RLS policy on community_feeds does not grant SELECT; this table is actually service-only. The security-invoker current_deals view also has default write grants, but underlying table grants and RLS still apply. The test deliberately separates ACL assertions from policy and actual read-isolation checks; it does not claim to test mutation isolation.

TRUNCATE is a separate real warning, not an RLS false positive: anon/deals, authenticated/deals, authenticated/saved_deals, authenticated/user_preferences have TRUNCATE privileges. RLS does not govern TRUNCATE. No such command was executed and no grants were modified. These grants do not by themselves establish an exposed REST truncate endpoint; separately review DB-role access and any privileged RPC exposure.

## Metadata behaviour

The existing STABLE SECURITY INVOKER catalogue_counts RPC groups current_deals. A request-time Vercel HTML function uses the public client key, never visitor credentials or service_role, to obtain this small aggregate. Only positive-count store names appear in title, description and OG tags. Error/empty coverage produces generic text without store names. HTML is no-store. Client coverage expires after 60 seconds and refreshes on focus/visibility; static build fallback is generic. One read-only aggregate and one Vercel function invocation per HTML request are added; browser focus reads are bounded by a one-minute cache. Preview routing, packaged template location and runtime public env configuration still need deployed verification.

## Earlier failures and corrections

- Initial rendered B02 test observed the document title before React committed the coverage panel; it now waits for visible coverage.
- Initial UI run had 26/28 passing: the B01 wording assertion needed updating, and adding an independent coverage read doubled legacy aggregate reads. Shared read handling was introduced; upstream then independently replaced category counts with filtered facets. The branch was rebased, preserving that newer hook and its tests. Coverage uses the separate unfiltered aggregate for store-wide metadata.
- Git shell push failed: no HTTPS credentials. Connected GitHub API is the publication fallback.
- Chromium installation failed in the earlier review. No new Lighthouse score or real-browser account mutation result is claimed.

## Owner actions

1. Keep this PR draft; do not apply the B04 migration or any generated-column backfill without separate approval. Function replacement alone will NOT recalculate existing stored generated values.
2. In Supabase Authentication settings, verify the server password minimum (12+), confirmation requirement, exact production/approved-preview redirect allowlist, CAPTCHA server enforcement and rate limits. Frontend settings do not prove these controls.
3. Configure Vercel Preview runtime VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY with the appropriate public client configuration. Do not put service-role credentials in either variable. Verify the preview's initial HTML metadata as well as browser metadata.
4. No privileged credential leak was established. The workflow's anon key is public client configuration. If replacing it as requested, migrate to a publishable/public client key, update the frontend, metadata function and workflow configuration together, verify, then retire the old public key where supported. Do not rotate the project JWT signing secret just because an anon key is public. No rotation was performed here.
5. Request a separate grant-hardening change for the TRUNCATE warnings. This PR intentionally does not alter production permissions.
