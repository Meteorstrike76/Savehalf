# Automatic collection activation preparation

Status on 14 November 2026: preparation only. Production remains on the previously
released application. No schedules, repository variables, credentials or permissions
are changed by this preparation commit.

## Verified and unknown

- The existing Vercel project is SaveHalf, using Vite; expected project/team IDs are
  pinned by the readiness check and supplied in the non-secret variable template.
- PR #37 is unmerged. `main` has no `catalogue-stage.yml`. A Vercel deployment of the
  feature branch does not install its GitHub schedule.
- The available GitHub connector cannot inspect repository secrets/variables or
  write them. No authentication secret has been fetched or requested in chat.
- Actual remaining account-wide quotas and the recorded source-use basis are not
  verified by a boolean readiness check. Verify them before attesting to either.

## Configuration prepared

Use [activation-variables.example.json](activation-variables.example.json) for the
repository/protected environment variables. All activation/review switches default
false. `VERCEL_CLI_VERSION` is deliberately empty: select a reviewed existing exact
release rather than installing a guessed version. Configure `VERCEL_TOKEN` directly
as a protected production environment secret, never in this file or in chat.

The readonly **Catalogue activation readiness** workflow produces a fixed-schema
report in its log and step summary. It receives only token-presence booleans, not
the token. It runs on matching PR updates and can be dispatched once adopted on
`main`. Report-only checks can succeed as a workflow while reporting `ready=false`;
this is not proof that collection can run.

A repository-only readiness job cannot see production-environment-only secrets.
Its `token_visible_to_job=false` means not visible in that job, not necessarily
missing everywhere. Publication checks execute inside the production environment.

## Controlled activation order

1. Review and adopt PR #37 on `main` under the owner's merge policy. Preparation
   does not grant or perform this merge.
2. Review source use and available included quotas. Set the respective REVIEWED
   flags only after these checks. The flags are attestations, not permission grants
   or automatic quota verification.
3. Keep mode `pilot`, publication disabled, and enable staging when authorised.
   The pilot covers Coles/Woolworths only: **20 total requests, 2 viewers, 2 new
   images, 2 specials pages**. Collection and publication have separate switches.
4. Run one pilot and inspect source dates, rejected rows, region labels, byte/request
   counts, snapshots/checkpoints and the exported feed. A successful parser alone
   does not prove prices are locally applicable or stock is available.
5. Configure the existing Vercel target, reviewed CLI version and protected secret.
   Restrict the production environment to reviewed `main` and the owner's release
   policy. Publication preflight must pass before any deployment credential is used.
6. Enable publication only after the pilot feed is reviewed. The workflow stages a
   production build, compares its served feed, and then promotes it.
7. Set mode `full` only after separately reviewing the pilot and setting FULL_REVIEWED.
   Full mode remains bounded at 80 requests / 4 viewers / 5 new images / 14 specials
   pages per run. It does not promise complete retailer coverage.

## Budget and stop rules

Two scheduled runs daily can mean **62 runs in a 31-day month**. With the existing
10-minute limits, scheduled staging can consume up to **620 runner minutes** and
staging plus publication up to **1,240**, excluding CI, other repositories, manual
runs and package/artifact costs. This is a planning estimate, not reserved capacity,
verified available allowance or a billing guarantee. State/evidence retention also
consumes included storage. No billing, paid plan or new account is authorised here.

A wrong repository/branch, missing source/budget attestation or invalid rollout mode
fails staging preflight before upstream requests. Full mode additionally requires its
own review flag. A wrong Vercel target, non-exact CLI version or unavailable token
fails publication preflight before credential-bearing deploy steps.

Disable staging/publication flags to stop future activity. Existing browser expiry
checks continue to hide stale offers. Use the recorded prior Vercel production
release for an application rollback; no database migration or adapter unpause needs
undoing.

## Local preparation checks

```sh
python3 -m unittest discover -s tools/catalogues/tests -v
python3 tools/catalogues/preflight.py
```

The local readiness command reads only named configuration fields and prints only a normalised rollout mode, boolean results and fixed instructions.
It does not print credentials or arbitrary supplied values. It makes no network requests or mutations.
`--require stage` and `--require publish` return exit code 2 when blocked. Do not
pass real credentials to this script; it needs only `VERCEL_TOKEN_PRESENT`.
