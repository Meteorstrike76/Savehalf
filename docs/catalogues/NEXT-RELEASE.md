# Catalogue collection: next release

Baseline: main merge `c8083587f5a1222c3d41f4b17dd559b7eb398943` (PR #37).
The older ACTIVATION.md is a preparation snapshot; its statements that PR #37 is
unmerged and variables are absent are superseded by this record.

## Configuration observed

The owner added the repository secret `VERCEL_TOKEN`; GitHub's secret-name listing
was checked on 14 November 2026. The value was not read. Presence is not validity.
Nine repository variables were saved: pilot mode, five rollout/review flags,
Vercel project/team IDs and CLI 65.16.0.
For clarity the exact nine names are:

| Variable | Saved value |
|---|---|
| SAVEHALF_CATALOGUE_MODE | pilot |
| SAVEHALF_CATALOGUE_STAGE_ENABLED | false |
| SAVEHALF_CATALOGUE_PUBLISH_ENABLED | false |
| SAVEHALF_CATALOGUE_SOURCE_REVIEWED | false |
| SAVEHALF_CATALOGUE_BUDGET_REVIEWED | false |
| SAVEHALF_CATALOGUE_FULL_REVIEWED | false |
| VERCEL_PROJECT_ID | prj_nPs0HfBKQI4wCBKFpwmAEmu3SKwC |
| VERCEL_ORG_ID | team_5vtuiNYLRKgK8jmgLl8idnDD |
| VERCEL_CLI_VERSION | 65.16.0 |

## Delivery order and evidence

| Work | Exit condition | State |
|---|---|---|
| V6-01: Vercel token/target probe | Reviewed-main manual workflow reports target_verified | Implemented; live test pending main adoption |
| V6-02: source admission | Written reuse scope or independently permitted alternative; retailer/region, images, retention and request limits recorded | Blocked: evidence absent |
| V6-03: shared free quota review | Timestamped Actions minutes/storage and Vercel usage/limits, allowance after other workloads and a no-paid-overage plan | Pending account review |
| V6-04: staging pilot | Both pilot stores pass fresh-run acceptance; review local scope, dates and evidence | Blocked by V6-02/03 |
| V6-05: controlled publication | Reviewed pilot, protected production rules, staged feed equality and promotion of tested build | Blocked by pilot/release review |
| V6-06: efficient expansion | Per-retailer admitted source, measured resource use and separate full-mode review | Pending pilot |

The first upgrade adds a manual, main-only, production-environment target check.
It sends one authenticated GET to Vercel's documented project endpoint. No CLI
installation, environment-variable retrieval, collection, deployment, promotion,
source request or activation setting change occurs. A read check cannot prove
deployment write permission. It emits only fixed status codes and booleans;
response bodies, credentials and exception strings are never logged. Redirects
and retries are disabled; timeout is 15 seconds and body cap 256 KiB.

After reviewed adoption on main, run **Catalogue Vercel read-only target check**
once, selecting main. A missing/invalid token, wrong target, forbidden access or
rate limit fails the job. Do not dispatch it from a feature branch or change its
branch guard to make testing easier. Existing **Catalogue activation readiness**
can independently report which collection gates remain closed.

## Source admission record to complete before enabling

- Source and rights holder; permission/reference evidence and review date.
- Permitted retailer, edition, region, fields and artwork; attribution wording.
- Retention/caching limits, discovered URLs, robots decision and request/byte caps.
- Revocation/stop procedure and independently permitted fallback.

Public availability and a true review flag do not establish these rights. Until
recorded, keep CatalogueOffers link-only and do not retrieve new catalogue assets.
Do not contact third parties automatically.

## Efficiency and release rules

Keep changed-asset hashes, local OCR, mode-isolated checkpoints and short evidence
retention. Prefer a useful reviewed partial feed over inflated coverage counts.
Compare measured requests/bytes/time with the hard pilot cap before expansion.
No paid API/model, new service account, schema/RLS change or paused-adapter resume
is part of this release. No new schedule is added by the target check.

Token stored at repository scope is visible to eligible repository workflows;
this check uses the production environment but does not itself move the token or
configure environment protection. Have the owner establish the intended main-only
release protection before publication. Never copy the token into code or chat.

## Verification

Validation on this branch: **86 offline catalogue tests passed**. These include fixed-target, wrong-branch, malformed,
oversized, wrong-identity, HTTP failure, redaction and redirect tests. Live token
verification remains explicitly unverified until the manual main workflow runs.

Reference: https://vercel.com/docs/rest-api/projects/find-a-project-by-id-or-name
