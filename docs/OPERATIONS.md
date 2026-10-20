# SaveHalf operations and recovery

## Run locally

Node 22, `npm ci`, then `npm ci --prefix scraper`. For parser tests: `npm test --prefix scraper`. For a network dry run that writes nothing:

```bash
REQUESTED_STORES='Aldi' node scraper/src/index.mjs --dry-run
```

This still makes real, bounded public requests and must not be run repeatedly against a blocked source. Woolworths direct requests are deliberately refused. Tests are the preferred first check.

For database writes, configure `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in a local ignored server-only environment file. Never use a VITE_ prefix for the service role or put it in a screenshot/chat/commit. Node can load that file:

```bash
REQUESTED_STORES='Aldi,Best & Less' node --env-file=.env.collector scraper/src/index.mjs
node --env-file=.env.collector tools/usage.mjs --html=usage-private.html
```

The runner first obtains a DB lease through service-only RPCs, preserving overlap/review/backoff/daily download/DB-size guards. It never returns the existing collection token. Upserts are atomic and keyed by existing store/product IDs. Images already known are preserved when a sparse response lacks one. Zero/suspicious results fail; any source failure makes the job nonzero after other selected stores have had their turn. Failed source requests do not refresh old prices. `rows_updated` counts existing identifiers checked/upserted, not necessarily changed selling prices. `rows_failed=0` can mean failure before any candidate rows were parsed; the run status is authoritative.

The shared ALDI adapter now includes robots in its existing thirteen-request cap and checks twelve category pages rather than thirteen. Best & Less stays at two requests. No per-visitor collection is introduced.

## GitHub cutover — prepared, NOT activated

There is no configured remote in this checkout. Do not claim these workflows are running until a repository URL, permissions and secrets are established. A declined GitHub connector is not required; the owner can push using normal git authentication. No plugin was installed.

Use the EXISTING private repository. Add secrets directly in GitHub Settings: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`; backups additionally need `SUPABASE_DB_URL` and a long random `BACKUP_ENCRYPTION_KEY`, retained separately. Do not send their values in chat. Restrict writes to reviewed main-branch code; no pull-request job receives service secrets. Confirm GitHub Actions spending is limited to zero and review shared account usage first.

Set repository variable `SAVEHALF_APPROVED_STORES` only after source review (for example existing ALDI/Best & Less pilots). The scrape workflow defaults to disabled until `SAVEHALF_ACTIONS_ENABLED=true`. It runs once daily at 18:23 UTC, maximum ten minutes; concurrency disallows overlap. This costs at most ~310 standard-runner minutes in a 31-day month. GitHub schedules are best-effort and can be delayed; not a precision scheduler or SLA.

Run manually, inspect the workflow AND scrape_runs, check row counts/prices, and confirm failure-notification preferences in GitHub. A nonzero job makes failures visible; email notification delivery depends on the account's Actions notification settings and is not guaranteed by this code.

Only THEN disable the matching Supabase source cron jobs in a reviewed SQL migration. Keep community/Cheap Eats and maintenance schedules unless separately migrated. The shared lease prevents simultaneous work while cutover is being tested, but leaving two schedulers is not the final architecture. Existing production schedules have NOT been disabled in this release.

A failed run can be inspected with the service-only usage CLI and scrape_runs/collection_status. A paused source requires a permission/access/parser review, not a browser/proxy workaround. Timeout/crash leases and reserved bytes still need their existing recovery guard; a process killed between lease and finalisation can require maintainer review. No fake keep-alive guarantee: real database activity is useful, but Free projects may still pause for low activity.

## Migrations and verification

Three dated SQL files cover new telemetry/ingestion RPCs, unit/search/history storage, and bounded range/retry handling. They were applied through the migration API, not dashboard edits. Do not rerun already applied migrations manually. The legacy repository has earlier operations SQL as well as migrations; an empty-project restore needs an exported schema/baseline, not an assumption that these three files create the entire app.

`supabase/operations/phase2-regression.sql` uses a subtransaction that rolls back its fixture. It checks no daily price-history growth on unchanged prices, actual changes, unit price, monthly range and client write denials. Existing product/favourite/auth counts were checked before/after. The service-only metrics RPC returns table size/row estimates; it is not an invoice or measured egress counter.

## Backup workflow

`backup.yml` is disabled until `SAVEHALF_BACKUPS_ENABLED=true`, and refuses public repositories. It uses a PostgreSQL 17 client (server audited as 17.11), runs weekly, encrypts before upload and authenticates the complete encrypted file with HMAC-SHA256, caps each encrypted export below 40 MB and keeps artifacts for 21 days. Export covers public, auth and savehalf_private schemas. It does NOT copy Storage objects, provider configuration, project signing keys, Vault secrets, roles or cron platform configuration. The key must be stored outside the artifact/repository. No real export or restore was executed in this environment because database/GitHub credentials were not supplied.

A full-size database may not compress below the cap. A failed cap check is an intentional stop, not permission to raise paid artifact storage. Four ~40 MB transfers/month add up to ~0.16 GB of database egress; artifact retention and account-shared Packages usage must also be monitored.

## Restore safely

Never test with `--clean` against the production database. Use an isolated empty project/throwaway local PostgreSQL 17 instance; a second hosted project consumes one of the two Free project slots. Inspect contents before restoring and establish which managed Auth objects already exist.

```bash
sha256sum -c savehalf.dump.enc.sha256
actual_hmac="$(openssl dgst -sha256 -hmac "$BACKUP_ENCRYPTION_KEY" savehalf.dump.enc | awk '{print $NF}')"
test "$actual_hmac" = "$(cat savehalf.dump.enc.hmac)" || exit 1
openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 \
  -in savehalf.dump.enc -out savehalf.dump -pass env:BACKUP_ENCRYPTION_KEY
pg_restore --list savehalf.dump > restore-contents.txt
# RESTORE_DB_URL must identify the isolated restore target, never production.
pg_restore --exit-on-error --no-owner --no-acl \
  --dbname="$RESTORE_DB_URL" savehalf.dump
```

The checksum detects accidental corruption; HMAC verification with the separately retained key must pass before decryption. Private GitHub access controls remain part of the trust boundary. For a managed Supabase target, reconcile existing Auth schema objects and grants instead of blindly dropping them. Restore roles/grants, extensions, Vault collection secret, schedules, provider/redirect settings and environment configuration separately. Verify product IDs, favourite ownership, auth users, RLS, schema version and source freshness. Exercise Google/email flows using a controlled test account. Record the restore time and findings before regarding backups as proven. Only a separately authorised recovery operation should replace production.

## Performance evidence

`tools/lighthouse-audit.sh` accepts CHROME_PATH/AUDIT_URL and generates three Lighthouse reports. `tools/screenshots.mjs` captures full-page PNGs at exact CSS viewport widths 375, 768 and 1280. The manual performance workflow uses preinstalled runner Chrome and caps artifacts below 30 MB/7 days. Run before and after against equivalent builds, data and settings. Do not score a Vercel protection/login page. Local Chrome provisioning failed here; scores/screenshots remain outstanding, not fabricated.
