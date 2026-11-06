# PR #31 follow-up: merge-readiness evidence

Scope: only review/phase-2. Five follow-up commits, one for each requested item. No main push, merge, workflow dispatch, production data/configuration changes or Phase 3 work.

## 1. Move B04

Used git mv to move the proposal to docs/proposed-migrations/20261106093109_review_unit_price_parser.sql. Tests and documentation now use that path. README states exactly: **Proposed, not approved, do not apply.**

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
✔ B04 PostgreSQL parser body handles all requested cases (1443.090307ms)
ℹ tests 1
ℹ suites 0
ℹ pass 1
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 1554.12114
```

Commands (both returned no paths):

```sh
git diff --name-only origin/main...HEAD -- supabase/
git diff --name-only origin/main...HEAD -- supabase/migrations/
```

## 2. Render B01 and negative control

The real feed card was extracted without rewriting its markup into src/components/FeedDealCard.tsx and App renders that component. Existing standalone DealCard/SavedPage behaviour was preserved. Existing jsdom + React server rendering is used; no testing dependency was added.

Command: `node --test tests/review-b01-render.test.cjs`

```text
✔ B01 rendered actual card qualifies the price comparison (90.82497ms)
✔ B01 rendered actual card contains no bare discount/saving claim (10.943562ms)
ℹ tests 2
ℹ suites 0
ℹ pass 2
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 587.863986
```

Command: `B01_LEGACY_REF=origin/main node --test tests/review-b01-render.test.cjs`

The adapter reads main's actual inline article JSX using git show, supplies the same fixture and executes the SAME visible-text assertions. It does not checkout, stash or modify main. Expected exit: 1. Actual output:

```text
✖ B01 rendered actual card qualifies the price comparison (73.938854ms)
✖ B01 rendered actual card contains no bare discount/saving claim (10.020245ms)
ℹ tests 2
ℹ suites 0
ℹ pass 0
ℹ fail 2
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 597.332891

✖ failing tests:

test at tests/review-b01-render.test.cjs:27:1
✖ B01 rendered actual card qualifies the price comparison (73.938854ms)
  AssertionError [ERR_ASSERTION]: The input did not match the regular expression /Retailer-reported 50% reduction/. Input:
  
  '50% OFFImage unavailableGROCERIESAldiFixture rice 1kg$4.00Ref. $8.00$4.00 / kg · estimated from pack sizeSave $4.00Checked 06/11/2026Hide this findWatch priceAdd to listAdd to mealView find Compare'
  
      at TestContext.<anonymous> (/workspace/scratch/31d8442668b7/Savehalf/tests/review-b01-render.test.cjs:28:34)
      at Test.runInAsyncScope (node:async_hooks:227:14)
      at Test.run (node:internal/test_runner/test:1402:25)
      at Test.start (node:internal/test_runner/test:1262:17)
      at startSubtestAfterBootstrap (node:internal/test_runner/harness:387:17)
      at process.processTicksAndRejections (node:internal/process/task_queues:104:5) {
    generatedMessage: true,
    code: 'ERR_ASSERTION',
    actual: '50% OFFImage unavailableGROCERIESAldiFixture rice 1kg$4.00Ref. $8.00$4.00 / kg · estimated from pack sizeSave $4.00Checked 06/11/2026Hide this findWatch priceAdd to listAdd to mealView find Compare',
    expected: /Retailer-reported 50% reduction/,
    operator: 'match',
    diff: 'simple'
  }

test at tests/review-b01-render.test.cjs:30:1
✖ B01 rendered actual card contains no bare discount/saving claim (10.020245ms)
  AssertionError [ERR_ASSERTION]: bare % OFF must not be visible
      at TestContext.<anonymous> (/workspace/scratch/31d8442668b7/Savehalf/tests/review-b01-render.test.cjs:31:27)
      at Test.runInAsyncScope (node:async_hooks:227:14)
      at Test.run (node:internal/test_runner/test:1402:25)
      at Test.processPendingSubtests (node:internal/test_runner/test:974:18)
      at Test.postRun (node:internal/test_runner/test:1542:19)
      at Test.run (node:internal/test_runner/test:1467:12)
      at process.processTicksAndRejections (node:internal/process/task_queues:104:5)
      at async startSubtestAfterBootstrap (node:internal/test_runner/harness:387:3) {
    generatedMessage: false,
    code: 'ERR_ASSERTION',
    actual: false,
    expected: true,
    operator: '==',
    diff: 'simple'
  }
```

Initial harness import-resolution and extraction-related unused-import/type errors were fixed before the reported passing run. The negative control above fails on assertions against visible old wording, not on compilation/import errors.

## 3. Native PostgreSQL CI

.github/workflows/b04-native-postgres.yml uses a postgres:17 service. There are no Supabase credentials, published ports or manual-dispatch trigger. It runs on pushes to review/phase-2 and PR events targeting main when the proposed SQL, generator or this workflow changes. A normal branch push/PR synchronise event triggers it; it was not manually dispatched.

After checkout and SQL generation, every service-container network is disconnected and zero attached networks asserted BEFORE copying/executing SQL. psql runs inside the service over /var/run/postgresql. The runner needs network for checkout/image provisioning; the actual parser execution has no attached Docker networks. No production endpoint is used.

Only the parser definition is extracted, renamed review_native.pack_measure, and loaded into the disposable CI database inside a rollback transaction. It does not load any application migration. Assertions require PostgreSQL major version 17, compare actual JSON with expected JSON using IS NOT DISTINCT FROM (including nulls), print every case PASS/FAIL, and fail if any case differs:

| Input | Expected quantity | Basis |
|---|---:|---|
| Rice 2 x 2kg | 4000 | 100g |
| 12 x 25g | 300 | 100g |
| 2 large eggs | 2 | each |
| Air fryer 5L | null | null |
| 500ml | 500 | 100ml |
| 1.5L x 6 | 9000 | 100ml |
| 2 x 500g x 3 | null | null |
| Rice approx 1kg | null | null |
| 400g + 100g bonus | null | null |

Local command: `node --test tests/review-b04-native-ci.test.cjs` — 2 passed, 0 failed. This validates harness generation and workflow isolation requirements; it is NOT a native PostgreSQL execution result. Native Docker/PostgreSQL are unavailable locally. The automatic CI run must supply that result after publication.

## 4. Public anon-key variable

.github/workflows/rollout-audit.yml now uses `${{ vars.SAVEHALF_SUPABASE_ANON_KEY }}` for VITE_SUPABASE_ANON_KEY. A guard fails clearly if the repository variable is missing, rather than silently auditing sample mode.

Owner: GitHub repository Settings > Secrets and variables > Actions > Variables > New repository variable. Name: **SAVEHALF_SUPABASE_ANON_KEY**. Value: the project's public legacy anon JWT, three base64url segments separated by dots, whose decoded payload has role **anon**. Copy it from Supabase API settings. Never supply service_role, a database password or a JWT signing secret. No key value is printed in this report; no settings were changed.

Command: `node --test tests/review-public-key-config.test.cjs` — 1 passed, 0 failed. Test confirms the variable reference, absence of a complete JWT literal and the missing-variable guard. Historical literals remain in Git history; this commit does not rewrite history or rotate keys.

## 5. Changed files by risk

### Hosting/runtime — medium/high; review routing and read-only metadata fetch

- `api/storefront.mjs`
- `vercel.json`

### Account state — medium/high; regression-test isolation and rollback

- `src/hooks/useFavourites.ts`
- `src/lib/favouritesStore.ts`

### Workflow — medium; automatic CI/audits, no hosted SQL application

- `.github/workflows/b04-native-postgres.yml`
- `.github/workflows/rollout-audit.yml`

### Client UI/metadata — medium; render and fixture regressions

- `index.html`
- `shared/coverage.d.mts`
- `shared/coverage.mjs`
- `src/App.tsx`
- `src/components/AppErrorBoundary.tsx`
- `src/components/FeedDealCard.tsx`
- `src/components/LiveCoverage.tsx`
- `src/components/ShoppingList.tsx`
- `src/lib/catalogueCoverage.ts`
- `src/main.tsx`

### Development dependencies — low runtime risk

- `package-lock.json`
- `package.json`

### Proposals/documentation — inert, not executable migration discovery

- `docs/proposed-migrations/20261106093109_review_unit_price_parser.sql`
- `docs/proposed-migrations/README.md`
- `docs/review/history-scan.md`
- `docs/review/phase-2.md`
- `docs/review/pr31-merge-readiness.md`

### Tests and test-only generator — disposable fixtures

- `tests/catalogue-default-ui.cjs`
- `tests/review-b01-render.test.cjs`
- `tests/review-b01.test.cjs`
- `tests/review-b02.test.cjs`
- `tests/review-b04-native-ci.test.cjs`
- `tests/review-b04.test.cjs`
- `tests/review-b10.test.cjs`
- `tests/review-b11.test.cjs`
- `tests/review-coverage-ui.cjs`
- `tests/review-public-key-config.test.cjs`
- `tests/sql/rls-grants.sql`
- `tools/review/b04-native-sql.py`

## Sensitive paths and automatic behaviour

The PR changes exactly these hosting/workflow paths:

- .github/workflows/b04-native-postgres.yml
- .github/workflows/rollout-audit.yml
- vercel.json

No changed file under supabase/ remains. tests/sql/rls-grants.sql is a read-only diagnostic and is not invoked by any workflow. docs/proposed-migrations is not Supabase's migration discovery path.

No changed workflow applies SQL to a hosted database, runs supabase db push, deploys Supabase functions, changes cron, or deploys production. The native test intentionally creates only an isolated CI function and rolls back. The rollout workflow performs normal read-only production Lighthouse checks and builds/tests locally.

It would be inaccurate to say "nothing applies automatically": existing GitHub/Vercel integration may create preview deployments on branch updates and deploy the frontend on a future merge. vercel.json changes that future deployment's routing. External Supabase integrations/settings cannot be ruled out from repository files; the owner must check them. No merge or manual workflow dispatch was performed.

## Validation and remaining gates

- Typecheck, lint and fixture production build passed locally.
- `node --test tests/*.test.cjs`: 147 passed, 0 failed.
- `npm run test:ui`: 29/29 UI regression scripts passed.
- Native PostgreSQL and workflow network-isolation execution require the automatic CI result; no local native result is claimed.
- Missing GitHub public-key variable will intentionally fail the rollout audit until the owner adds it.
- Protected Preview initial HTML, production Auth settings, external migration integrations and any production backfill remain unverified/unmodified.

Manual order: (1) add the public repository variable; (2) review the automatic native PostgreSQL job's version/network/nine-case output and all PR checks; (3) check external migration/deployment integrations and protected Preview; (4) review/merge PR #31 yourself if satisfied; (5) confirm it is merged and say START PHASE 3 before Phase 3 work resumes. Do not apply proposed SQL as part of these steps.
