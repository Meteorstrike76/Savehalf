# Approved free integrations: operation and rollback

The registry lists limits, owners, data handling and fallbacks. No billing or card should be enabled. Keys must be entered directly into the provider/Supabase/GitHub secret stores, never chat or Vite variables except explicitly public keys/tokens.

## Flags

`public.feature_flags` contains only public-safe settings. All client roles may SELECT it; only service_role may mutate it. Use reviewed SQL through the owner connection, for example:

```sql
update public.feature_flags set enabled=false,updated_at=now() where key='assistant.v2';
```

The existing `agent_config.enabled=false` stops new inference; v2 deterministic browsing can continue while its own flag is enabled. Disable both for an entire assistant outage. Fallback requires its existing credentials and `agent_config.fallback_enabled=true`, with a genuine smoke test. No pending call can be recalled by a flag.

Turnstile: set `TURNSTILE_SECRET_KEY` in Supabase Edge secrets. Put only the public siteKey in `feature_flags.public_config`. Configure widget hostnames savehalf.vercel.app and savehalf-au.vercel.app. Enable security.turnstile only after verifying the widget and matching server hostname/action. Supabase Auth CAPTCHA needs the same secret configured in Auth settings: do this only after testing login, signup, reset and resend. Without those settings, the deployed adapter is not protection for direct Auth endpoints. If challenge verification fails, keep browsing available and block protected inference; never silently bypass it.

Cloudflare analytics: put only its public 32-hex beacon token into analytics.cloudflare public_config, then enable the flag. This replaces the rendered Vercel beacon. No prompts, custom identifiers, search strings or callback URLs are sent. Before enabling, check the provider's SPA navigation behaviour against any newly introduced routes.

Better Stack: configure two monitors against public pages/content with three-minute checks. No LLM health probes. Set the heartbeat URL as BETTERSTACK_HEARTBEAT_URL in GitHub secrets; configure expected interval to match the job, with grace for schedule delay. Failure email must be delivered in a forced-failure test before declaring alerts active. No account has been created by code.

## Testing and evidence

```sh
npm ci
npm run typecheck
npm run lint
node --test tests/*.test.cjs
npm run build
npm run test:ui
npm ci --prefix tools/evals --ignore-scripts
npm test --prefix tools/evals
```

The promptfoo suite uses a local custom provider, no provider key and no LLM judge. Telemetry is disabled. These are fixture/router contracts, not a measured live-model accuracy percentage. Add live evaluation only within the existing daily reservation pool and never on untrusted fork PRs with secrets.

`Rollout performance and accessibility` runs on relevant PRs, measures current production before release and the local candidate build after it, and records screenshots at 375/768/1280. Both use the real public catalogue configuration; production vs local-origin differences mean performance comparisons are indicative, not controlled field measurements. These are lab scores, not CrUX field results. Private information and prompt logs must never be included in public artifacts. Seven-day retention bounds audit storage.

## Adding stores/barcodes

Reuse existing idempotent collector normalisation. Store a barcode only when the retailer explicitly provides a valid GTIN/check digit; never infer equality from names. Barcode enrichment can find a name without any retailer price match. The UI labels that distinction. Do not crawl OFF to fill the entire catalogue; obey the official bulk-export guidance for larger imports and its licence obligations.

## Health report

Set the existing owner SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY securely, then run `node tools/rollout/health.mjs`. It writes aggregate-only savehalf-health.md: DB size, scrape statuses, answer statuses, low ratings and report backlog. It does not obtain billed egress/minutes; inspect real dashboards separately. GitHub schedule gating and missing secrets are reported as setup pending, not successful automation.

## Backups

Existing backup workflow is restricted to an explicitly enabled private repository and encrypts before upload. It remains gated until the owner configures the DB URL/encryption key and verifies a restore. Never enable plaintext backups in the public source repository. Use docs/OPERATIONS.md for export and restore procedure; verify auth/schema ownership separately in an isolated project, preserving production IDs and avoiding a destructive restore into live data.


## Development-tooling advisories

The old @lhci/cli wrapper pulled obsolete dependencies, so it was replaced with pinned Lighthouse 13.5.0 running directly in GitHub Actions. Compatible Vite/PostCSS/TypeScript-ESLint/Tailwind updates were applied. The subsequent audit reports 24 development-tree advisories (15 high, 7 moderate, 2 low), with remaining direct Vite/Tailwind fixes requiring major upgrades. Production-only audit reports zero known advisories. This is not a security guarantee. CI jobs are read-only, use synthetic fixtures for app tests, do not expose secrets to fork PRs, and audit servers bind to 127.0.0.1. Do not expose the Vite development server publicly. A separate major tooling migration should address the remaining advisories with visual regression checks; no forced audit upgrade was applied.
