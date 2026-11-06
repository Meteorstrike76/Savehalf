# Full reachable-history scan — 6 November 2026

TruffleHog 2.2.1, all fetched remote branches, max_depth 100000, default regex scan and custom Supabase JWT/secret, Google API key and GitHub token rules with entropy enabled. Legacy repository also scanned with default regex + entropy. No credential validity requests were sent.

Exit 1 means candidates were found. Raw JSON contains candidate values and is kept only in restricted scratch files, never committed or uploaded. This tool cannot recover deleted/unreachable Git objects, GitHub secrets, or guarantee detection of every credential format.

The sole JWT candidate decodes to role `anon`: public client configuration, not a privileged credential. The URL-password candidate is a deliberately hostile parser fixture. SHA/integrity/deployment candidates are identifiers, not secrets. Generated minified-bundle constants remain unverified; no privileged credential was established. Scanner commit IDs are scanner-reported diff commits, not necessarily the original introduction commit.

| File | Scanner commit | Key / candidate name |
|---|---|---|
| .github/workflows/agent-health.yml | cc33917018e4cf25c20fde27f1a5baa9c80ae225 | PINNED_ACTION_OR_COMMIT_SHA |
| .github/workflows/agent-health.yml | dec836f247f36bc0d441cf8845f3d60e11aec64c | PINNED_ACTION_OR_COMMIT_SHA |
| .github/workflows/agent-health.yml | f61ba1aac8dcd107129dc18aced720f3336c50f1 | PINNED_ACTION_OR_COMMIT_SHA |
| .github/workflows/backup.yml | 6c2bbfe778cfd4ecfca17e994d919e044fcb0489 | PINNED_ACTION_OR_COMMIT_SHA |
| .github/workflows/backup.yml | f4c07028050ffb3a7149f4f5e873cdbe79c06be3 | PINNED_ACTION_OR_COMMIT_SHA |
| .github/workflows/check.yml | dec836f247f36bc0d441cf8845f3d60e11aec64c | PINNED_ACTION_OR_COMMIT_SHA |
| .github/workflows/check.yml | f4c07028050ffb3a7149f4f5e873cdbe79c06be3 | PINNED_ACTION_OR_COMMIT_SHA |
| .github/workflows/check.yml | f61ba1aac8dcd107129dc18aced720f3336c50f1 | PINNED_ACTION_OR_COMMIT_SHA |
| .github/workflows/performance.yml | 6c2bbfe778cfd4ecfca17e994d919e044fcb0489 | PINNED_ACTION_OR_COMMIT_SHA |
| .github/workflows/performance.yml | 6c5dd09cff4afe53ddfc401581c346b8a04c9f9f | PINNED_ACTION_OR_COMMIT_SHA |
| .github/workflows/performance.yml | dec836f247f36bc0d441cf8845f3d60e11aec64c | PINNED_ACTION_OR_COMMIT_SHA |
| .github/workflows/performance.yml | f4c07028050ffb3a7149f4f5e873cdbe79c06be3 | PINNED_ACTION_OR_COMMIT_SHA |
| .github/workflows/performance.yml | f61ba1aac8dcd107129dc18aced720f3336c50f1 | PINNED_ACTION_OR_COMMIT_SHA |
| .github/workflows/rollout-audit.yml | 6c2bbfe778cfd4ecfca17e994d919e044fcb0489 | PINNED_ACTION_OR_COMMIT_SHA |
| .github/workflows/rollout-audit.yml | cc33917018e4cf25c20fde27f1a5baa9c80ae225 | PINNED_ACTION_OR_COMMIT_SHA |
| .github/workflows/rollout-audit.yml | cc33917018e4cf25c20fde27f1a5baa9c80ae225 | VITE_SUPABASE_ANON_KEY |
| .github/workflows/rollout-audit.yml | dec836f247f36bc0d441cf8845f3d60e11aec64c | PINNED_ACTION_OR_COMMIT_SHA |
| .github/workflows/rollout-audit.yml | f61ba1aac8dcd107129dc18aced720f3336c50f1 | PINNED_ACTION_OR_COMMIT_SHA |
| .github/workflows/scrape.yml | dec836f247f36bc0d441cf8845f3d60e11aec64c | PINNED_ACTION_OR_COMMIT_SHA |
| .github/workflows/scrape.yml | f4c07028050ffb3a7149f4f5e873cdbe79c06be3 | PINNED_ACTION_OR_COMMIT_SHA |
| .github/workflows/scrape.yml | f61ba1aac8dcd107129dc18aced720f3336c50f1 | PINNED_ACTION_OR_COMMIT_SHA |
| ANALYTICS.md | f4c07028050ffb3a7149f4f5e873cdbe79c06be3 | VERCEL_DEPLOYMENT_ID |
| RELEASE-FRESHNESS.md | f4c07028050ffb3a7149f4f5e873cdbe79c06be3 | VERCEL_DEPLOYMENT_ID |
| RELEASE-REGIONS-MISSIONS.md | f4c07028050ffb3a7149f4f5e873cdbe79c06be3 | PINNED_ACTION_OR_COMMIT_SHA |
| docs/AUTOMATION-REPAIRS-20261023.md | 0169d0f9230f3d3f1b9a8a75af2daa008a6213f6 | PINNED_ACTION_OR_COMMIT_SHA |
| docs/MEAL-VARIETY-RELEASE.md | c4806b2f10460d8fa41b8be79ef83dc28c49f25b | PINNED_ACTION_OR_COMMIT_SHA |
| docs/RELEASE-VERIFICATION.md | f4c07028050ffb3a7149f4f5e873cdbe79c06be3 | VERCEL_DEPLOYMENT_ID |
| docs/ROLLOUT-HEALTH.md | 3e0b6acc7c917641b446fc7b09599689edb1bfaa | PINNED_ACTION_OR_COMMIT_SHA |
| docs/SERVICES-REGISTRY.md | cc33917018e4cf25c20fde27f1a5baa9c80ae225 | PINNED_ACTION_OR_COMMIT_SHA |
| package-lock.json | 0566e4c7dbc80c554cdeef7f4db2bfcd695e5e2a | PACKAGE_INTEGRITY_HASH |
| package-lock.json | 1638c55bdae948bb47f858f42f5347c648eda4d9 | PACKAGE_INTEGRITY_HASH |
| package-lock.json | 41735374de3c1d0e2633f187f2759697f9afc3dc | PACKAGE_INTEGRITY_HASH |
| package-lock.json | 7f7f2ae038db553af71d7d804def1764bc9399b8 | PACKAGE_INTEGRITY_HASH |
| package-lock.json | cc33917018e4cf25c20fde27f1a5baa9c80ae225 | PACKAGE_INTEGRITY_HASH |
| package-lock.json | f1a1eeccf0a529f03df822500988d81aee2472cb | PACKAGE_INTEGRITY_HASH |
| package-lock.json | f4c07028050ffb3a7149f4f5e873cdbe79c06be3 | PACKAGE_INTEGRITY_HASH |
| package-lock.json | f61ba1aac8dcd107129dc18aced720f3336c50f1 | PACKAGE_INTEGRITY_HASH |
| savehalf-etl/project/package-lock.json | 365cfa72a8451f96b40b03e144733db3658b402a | PACKAGE_INTEGRITY_HASH |
| scraper/package-lock.json | f4c07028050ffb3a7149f4f5e873cdbe79c06be3 | PACKAGE_INTEGRITY_HASH |
| scraper/test/images.test.mjs | f4c07028050ffb3a7149f4f5e873cdbe79c06be3 | SYNTHETIC_URL_PASSWORD_FIXTURE |
| standalone-preview.html | f4c07028050ffb3a7149f4f5e873cdbe79c06be3 | GENERATED_BUNDLE_CONSTANT_UNVERIFIED |
| tools/evals/package-lock.json | 7cd26e4e17eace24fb7b62b11bce7f882a2e6af3 | PACKAGE_INTEGRITY_HASH |
| tools/evals/package-lock.json | c3df97419df3f9dbd231735f711dbc236c46f622 | PACKAGE_INTEGRITY_HASH |

No production keys or settings were rotated. Review public-key replacement separately; never rotate the project JWT signing secret merely because an anon key is public.
