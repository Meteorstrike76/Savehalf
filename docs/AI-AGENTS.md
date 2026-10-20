# SaveHalf optional grounded agents — 21 October 2026

## Release status

Groq Free and Cloudflare Workers AI Free were explicitly approved by the owner. No new dependency was added. The retired recipe endpoint remains retired. New agent code is implemented, but **live inference is disabled** until the owner supplies server credentials and verifies the account/model's Free allowance. No model calls were made during implementation. Mock-provider tests do not demonstrate actual model accuracy or availability.

Production scraping still uses Supabase Cron and the existing collectors. The local GitHub quality step is prepared, not operational: connected GitHub writes were previously rejected, and deployed source has not been pushed there. Do not enable the alternative GitHub scraper while Supabase schedules still collect the same sources.

## Design and trust boundaries

- Browser loads the assistant only when opened. The existing search/list/auth/favourites continue independently.
- `deal-agent` Edge Function keeps platform JWT verification enabled and validates actual signed-in users with Supabase Auth. Anonymous calls receive a smaller allowance. Forwarded IP is an advisory throttle, not a verified identity; hard global reservations protect the model budget.
- Groq and Cloudflare share a small adapter contract using native fetch. No paid gateway, SDK, embedding service, vector database, analytics provider or email provider was introduced.
- Five allowlisted tools reuse current catalogue and bounded database queries. Model prose is discarded. Only validated tool arguments reach database code; model output never becomes SQL or arbitrary URLs.
- Every displayed price comes from returned evidence. Current-deal links use `/?product=<UUID>` and exclude expired/unverified rows. Source timestamps are shown. Similar title matches are **not** guaranteed identical products; unit comparisons apply only within the same declared basis.
- Cheap Eats uses recent source checks and explicit conditions. Time validity/open-now status is not verified, so no such claim is made.
- SSE streams structured evidence after tool execution. It is not a token-by-token model narrative; this deliberately avoids displaying ungrounded partial prices.
- The planner interprets up to 12 lines, then performs all arithmetic in integer cents. It chooses among returned current candidates, flags every match for review, excludes missing items from totals and excludes travel/delivery. It does not guarantee a globally cheapest basket. Confirmed saves require an authenticated account and re-read prices server-side. Saved lists are dated snapshots, not promises of current prices.
- Quality checks are rule-first, page through at most 500 products and 1,000 recent history changes, quarantine at most 20 findings, and request at most 3 model suggestions per run. Bounded history can miss older changes; it is not a complete historical audit. Hash claims precede inference, including failures. The hash-only ledger is retained, stops at 10,000 entries and is never silently pruned to permit repeat inference. Review payloads expire after 30 days. Neither suggestions nor flags alter public products.

## Activation — server-only

In [Supabase Edge Function secrets](https://supabase.com/dashboard/project/mdbqlcnzbakimfjrfczz/functions/secrets), set:

- `GROQ_API_KEY`: key from an account that is still on Free, with no payment method/paid upgrade.
- `AGENT_HASH_SECRET`: generate at least 32 random characters locally; never put it in Vite variables.
- Optional `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_AI_TOKEN`: least-privilege Workers AI permission. Verify the allowlisted model is available on Workers Free without billing.

No connector for setting these secrets is available here. Do not paste keys into chat or commit them. Existing `SUPABASE_URL`, `SUPABASE_ANON_KEY` and service-role runtime credentials are managed by Supabase.

Verify account limits and send one owner-controlled smoke question before opening access. Then enable via reviewed SQL:

```sql
update public.agent_config set enabled=true, updated_at=now() where id;
-- Only after a separately verified fallback smoke test:
update public.agent_config set fallback_enabled=true, updated_at=now() where id;
```

Kill switch, no redeploy:

```sql
update public.agent_config set enabled=false, fallback_enabled=false, updated_at=now() where id;
```

This prevents new inference calls; it cannot cancel calls already accepted by a provider. Normal site browsing remains available. Cached plans cannot bypass the switch.

## Provider changes and rotation

Models are configured in `agent_config`; the server also has a deliberate allowlist. A model change requires updating the allowlist after checking its current free availability, tool support, privacy and billing requirements, then repeating provider/evaluation smoke tests. Do not remove the allowlist to make arbitrary configuration work. Current candidates: Groq `openai/gpt-oss-20b`, Cloudflare `@cf/meta/llama-3.1-8b-instruct-fp8-fast`.

Rotate a provider key by disabling AI, replacing its Supabase secret directly, testing, re-enabling, then revoking the old key. Rotate the HMAC secret to invalidate question-cache keys and pseudonymous rate buckets; retain conservative global counters. No provider secret is needed in the frontend or GitHub. GitHub quality invokes the Edge function using a service-role GitHub secret, not an LLM key.

## Quotas and breakpoints

Public official documentation checked 20–21 October 2026:

| Platform | Relevant documented allowance | Official source |
|---|---|---|
| Supabase Free | 500 MB DB, 5 GB egress, separate 5 GB cached egress, 1 GB storage, 50k MAU | https://supabase.com/pricing |
| Supabase Edge Free | 150 s wall clock, 2 s CPU/request, 256 MB | https://supabase.com/docs/guides/functions/limits |
| Vercel Hobby | 100 GB transfer, 1m invocations, 4 CPU-hours; non-commercial personal use | https://vercel.com/docs/plans/hobby |
| GitHub public standard runners | Free standard hosted runner use; private repos have account-specific allowances | https://docs.github.com/en/billing/concepts/product-billing/github-actions |
| Groq GPT OSS 20B public Free table | 30 RPM, 1,000 RPD, 8k TPM, 200k TPD; account exceptions possible | https://console.groq.com/docs/rate-limits |
| Cloudflare Workers AI Free | 10k neurons/day shared; paid-only models excluded | https://developers.cloudflare.com/workers-ai/platform/pricing/ |

We enforce stricter pilot bounds: 3 anonymous or 10 signed-in questions/day; advisory network cap 20/day; global 200 requests/day including cache hits; 2 provider attempts/minute; 35 Groq and 20 fallback attempts/day; shared 150k reserved tokens/day. Every provider attempt reserves 4,000 tokens without refunds, including failed attempts. Body UTF-8 byte count plus capped output must fit that reservation. Fallback is attempted on 429/5xx after a separate reservation; three retryable provider failures open a ten-minute circuit. A blocked/over-quota primary can return normal search without attempting fallback. No unbounded agent loops.

Each provider request has a nine-second network deadline and each DB request a four-second deadline. Model-request payloads cap completion at 384 tokens; reasoning models may use that budget before producing a valid tool call, so live tests may show poor extraction reliability. Do not raise caps without re-evaluating budgets.

Planning assumptions: 3 questions per monthly user, 40% exact-normalised cache hits, 2,000 actual tokens/model call, 30-day month. Caching applies to deal-tool plans; planners currently do not use this cache. Therefore these estimates are optimistic when planner use is high.

| Monthly users | Questions/day | Expected calls/day | Actual-token estimate/day | 4k reservation demand/day |
|---:|---:|---:|---:|---:|
|100|10|6|12,000|24,000|
|1,000|100|60|120,000|240,000|
|10,000|1,000|600|1,200,000|2,400,000|

The conservative pilot stops serving all uncached demand around **580 monthly users**, or around **530** after reserving three daily quality suggestions, under these assumptions. Beyond that, search remains available and AI requests are declined. The earlier theoretical ~1,667-user threshold based solely on 200k actual tokens/day is **not** the shipped allowance. Peak minute limits can bind at any traffic level. Cloudflare is a small outage reserve, not a way to multiply quotas or evade limits. At the configured payload/output bounds, 20 Llama FP8 Fast calls would be under about 600 neurons/day using the currently documented rates, excluding other account usage; account verification is still required.

New DB structures increased measured DB size from 16,012,979 to approximately 16.37 million bytes during implementation. AI reservations and new saves stop above 64 MiB total database size. Saved lists cap at 1,000 globally and 20 per account, each JSON <=12 KB; roughly <=12 MB payload plus indexes. Cache plans <=3 KB and expire logically in ten minutes; daily pruning removes physical rows. Events retain seven days; quality payloads retain 30 days, hash ledger <=10k records. The ordinary catalogue/history has its own retention. These bounded policies avoid projecting unbounded 12-month growth.

Monthly billed egress, function usage and GitHub account minutes were not accessible through the connected tools. Local collection byte counters are not billing totals. Rate limiting model calls does not prevent invocation/egress exhaustion from a large attack against the public Supabase endpoint. CORS is not an abuse barrier. No claim of unlimited DDoS protection or guaranteed uptime is made.

## Monitoring and privacy

Run `tools/agents/usage.sql` as owner or:

```sh
# Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY securely in your shell first.
node tools/agents/usage.mjs
```

Open `docs/agent-usage.html`; it contains aggregates only. Watch the 80% token warning, provider circuits, no-data/unavailable ratio and quarantine backlog. Check real provider/Supabase/Vercel billing dashboards separately. Cron `savehalf-agent-prune` runs daily at **03:25 UTC** (14:25 Sydney during AEDT).

No full prompt is logged. Cache entries store keyed hashes plus validated query plans for a short period; those plans can contain search terms. Common email/phone/UUID patterns are redacted before inference, but pattern redaction cannot guarantee removal of all personal details. Users must not include names, addresses or sensitive information. Auth IDs/emails are never included in provider payloads. Rate buckets use day-scoped HMAC identifiers and expire; logs retain day-scoped hashes for seven days. Account lists reference Auth users and cascade on deletion; users can read/delete only their own lists. Provider-side processing is outside Australia unless separately verified; Australian residency has not been established.

Groq retention policy: https://console.groq.com/docs/your-data (limited reliability/abuse exceptions). Cloudflare no-training/standard inference retention commitments: https://developers.cloudflare.com/workers-ai/platform/data-usage/. Google free-tier product-improvement use and account/model quotas make it a less suitable default; OpenRouter's 50 free requests/day and provider-dependent privacy make it a weak main service.

## Tests and rollout

```sh
npm run typecheck
npm run lint
npm run build
node --test tests/*.test.cjs
npm run test:ui
node --test scraper/test/*.test.mjs
node_modules/.bin/tsc --noEmit --strict --skipLibCheck --target es2022 --module esnext --moduleResolution bundler --allowImportingTsExtensions --lib es2022,dom supabase/functions/deal-agent/index.ts
```

`tests/agents.test.cjs` contains 30 fixture-backed evaluation contracts, including no-data, unit comparison limitations, time-validity caveats and injection requests. These exercise validation/tool grounding with expected database evidence; they are **not** live-model evaluation scores. `agent-handler.test.cjs` covers kill switch, quotas, 429 fallback, invalid tool calls, privacy consent and structured streaming. `agent-ui.cjs` checks lazy opening, typing focus, consent, disabled fallback and opt-out. Existing tests cover auth and favourites. Live-provider evaluations and genuine authenticated cross-account browser sessions remain activation gates.

Quality runner locally: `node tools/agents/quality.mjs`; defaults to rule-only. Set `SAVEHALF_QUALITY_LLM=true` only after server setup. Existing GitHub workflow adds it after successful collection and remains behind `SAVEHALF_ACTIONS_ENABLED`. Standard public Linux runner only, ten-minute timeout, no extra hosted service. Failure exits nonzero; normal GitHub failure notification settings apply. Do not publish environment files as artifacts.

Migrations are checked in with server-issued migration versions. Existing migrations/data are not rewritten. Disable AI first for rollback; frontend rollback can leave additive private tables in place. Back up/restoration and collector instructions remain in `docs/OPERATIONS.md`.

## Performance evidence and gaps

Before: initial JS 130.80 KB gzip. After: approximately 131.1 KB gzip; agent UI and stylesheet load separately (about 4.3 KB and 0.8 KB gzip after planner addition). No AI request occurs on initial load; this has a UI regression assertion. Exact final build values are in the release output.

A usable local Chrome/Chromium and Lighthouse installation are absent. No new dependency was installed without approval. Therefore **no before/after Lighthouse score or three-width screenshot claim is made**. Existing `tools/lighthouse-audit.sh` and `tools/screenshots.mjs` can run on an equipped machine; they do not substitute for actual measured reports.
