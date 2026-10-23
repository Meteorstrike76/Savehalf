# Automation repairs — 23 October 2026

## Root causes and changes

1. Dependency PR #10 changed eleven toolchain packages across major versions in one batch, including TypeScript 7.0.2 while typescript-eslint 8.72.0 declared a TypeScript peer range below 6.1. Clean npm ci correctly rejected that combination. This repair uses compatible updates within existing package ranges, preserves the React/Vite/Tailwind architecture and keeps npm peer checks enabled. No force or legacy-peer-deps install. Development dependency groups now combine minor/patch updates only; major migration PRs remain separate review work, not automatic merges. Security alerts and validation remain enabled.
2. PR #5's app validation passed, but its accessibility audit caught contrast failures in the animated hero stamp at 768/1280 px. Poster/stamp opacity keyframes temporarily blended text into the background. Their movement/scale animations remain, with text kept fully opaque. Reduced-motion support remains unchanged. The SHA-pinned actions/setup-node 7.1.0 update from that PR is included across the five existing Node workflows.
3. Public-runner dry failures previously hid the cause behind a generic message. They now report the existing sanitised failure classification. An explicit source-permission refusal is classified as policy, not a transport failure. This does not change which sources may run or bypass any pause.

4. Local UI checks exposed an existing fixed-sleep race before the basket catalogue loaded. The check now waits for the visible Add to list control. The standalone preview test also disables network fetches so an offline UI test cannot hang on a remote request; its UI assertions remain unchanged.

## Verification and resource impact

Clean npm ci with scripts disabled, existing frontend types/lint/build, unit/UI and fixture/loopback scraper tests are required. PR CI performs full browser accessibility checks at 375/768/1280 px. All existing request/byte quotas, collector cadences, account data, auth, URLs and favourites remain unchanged. No new service, direct dependency, model call or paid resource is added.

Compatible root updates reduced audit findings from 12 to 9 (6 high, 3 moderate, no low/critical); remaining development-tool advisories require further work. This is not a complete security assessment. Production-only dependency audit reports zero known advisories.

## Current automation status and unresolved gates

Database cron reported no failed SQL jobs in the prior two days. This only verifies scheduler SQL execution; source failures remain recorded separately. ALDI and Best & Less collectors are healthy. Coles is parser-review paused; Kmart, Target, Woolworths and OzBargain remain access-review paused. BIG W remains on transport backoff. No source was unpaused or relabelled healthy.

A live Coles retry was not completed; further source access needs a permitted-source review. Use existing local fixtures for parser work rather than repeating access denials or changing identity/network routes.

The scheduled GitHub catalogue workflow was skipped because its explicit cutover gate is off. This is intentional while the Supabase collectors run; enabling a second scheduler would duplicate requests. Health reporting and encrypted backup workflows also retain their owner gates. The backup workflow requires a private repository plus DB/encryption secrets; this public repository is not an approved destination for application/auth backups. None of those secrets or a private destination can be provisioned by the current connector. No successful external alert or restore is claimed.

Next steps: configure and verify the private backup/health owner environment, obtain permitted retailer data access, then scope separate major toolchain migrations with visual and auth regression checks. Do not hide major security advisories by declaring routine compatible updates sufficient.

## References

- https://docs.github.com/en/code-security/reference/supply-chain-security/dependabot-options-reference — semver grouping and separate update review.
- https://typescript-eslint.io/users/dependency-versions/ — supported dependency versions; the failing job's concrete npm peer error determines this repair.
- https://github.com/actions/setup-node/commit/949feb2413d6458794dcd2491c4babbbce0c15c1 — reviewed SHA for setup-node 7.1.0.
