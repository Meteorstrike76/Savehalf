# SaveHalf — Australian retail deal finder

A redesigned, mobile-friendly React + TypeScript storefront combining the two supplied projects. Vite builds a static app for Vercel; Supabase provides authentication and a public read-only catalogue; GitHub Actions performs bounded daily collection outside Vercel.

## What works

- Six retailers: Coles, Woolworths, ALDI, BIG W, Kmart and **Target**.
- Product search, retailer/category filtering, price sorting, maximum price and half-price filters.
- Separate sale feed and catalogue view. Sale feed requires a recorded reduction.
- Guest bookmarks persisted in the current browser. Supabase account bookmarks for collected products.
- Manual comparison of up to four selected products. No automatic same-product matching claims.
- Detail dialogs, retailer links, loading, empty and error states.
- Clearly labelled illustrative demo when environment variables are absent. Demo rows never enter the live database automatically.
- Only live rows checked within the past 72 hours appear. Seed rows are excluded.
- Bounded collection, stable upserts, expiry protections, cleanup and validation workflows.

## Important scope

**This does not promise every product or verified live coverage of all six stores.** Collection adapters are best-effort, and retailer-specific endpoints/layouts can change or block access. Target has a configurable starter adapter, not a verified full catalogue integration. Live collection could not be verified in this build environment. Before launch, review retailer permissions and run individual dry runs; do not bypass access restrictions. Prefer an authorised product feed when available.

Daily collection targets specials with a known reduction of at least 20%, capped at 300 rows per store (1,800 selected deals total). Many ALDI Special Buys have no original price and therefore do not enter the sale feed. The authorised JSON importer can add regular-price catalogue products. Imported items need fresh reimports within 72 hours to remain visible.

Prices vary by location, stock, membership and time. No postcode inventory, complete stock checks, checkout, automatic equivalence, unit-price matching or email price alerts are included. Guest and cloud bookmarks are separate; logging in does not migrate the guest list.

## Run on your computer

Use Node.js 22 or later.

```bash
npm ci
npm run dev
```

For an immediate no-install demo, open `standalone-preview.html` in your browser. It contains only illustrative prices and is separate from the deployed app.

Open the localhost address displayed. Without `.env`, the app shows the labelled demo.

For real data:

```bash
cp .env.example .env
```

Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` using your project URL and public anon key. The frontend contains no service-role key. A configured project with an empty database shows an honest empty state, not sample offers.

## Supabase setup

For a NEW empty database, execute the SQL files in this order using Supabase SQL Editor:

1. `20260924033744_create_deals_and_saved_deals.sql`
2. `20261001024703_expand_deals_schema.sql`
3. `20261008000000_savehalf_v3_scraper_and_prefs.sql`
4. `20261008010000_target_and_integrity.sql`

For an EXISTING project, apply only migrations not already applied. In particular, do not rerun migration 2 after its legacy columns have been dropped. Back up your data before schema updates. The inherited third migration removes OzBargain rows and this project is intended for the six named retailers.

Authentication: enable Email provider and set Site URL to your deployed Vercel address; add localhost and the deployed URL to Redirect URLs. Enable email confirmation. Existing RLS policies restrict saved rows and preferences to their owner; the deals table is publicly readable and writable only by the trusted collection/import job.

No Supabase Storage bucket is needed: product images use source URLs rather than duplicate uploads.

## GitHub setup

Create a personal repository and upload the CONTENTS of this folder, including `.github`, `scraper` and `supabase`. Do not upload node_modules, dist, `.env`, the old Bolt `.env`, or service-role credentials.

Repository Settings → Secrets and variables → Actions → New repository secret:

- `SUPABASE_URL`: Supabase project URL.
- `SUPABASE_SERVICE_KEY`: secret service-role key; server job only.

Actions → Scrape deals → Run workflow. Start with `dry_run: true` and one store, for example `coles` or `target`. Inspect the workflow summary. If blocked or empty, configure a valid listing URL in the adapter or use an authorised feed. Default schedule is once daily at 18:23 UTC (04:23 AEST / 05:23 AEDT). GitHub schedules can be delayed; they are not guaranteed real-time.

The private-repository job is limited to 35 minutes per daily run: at most about 1,085 scheduled runner minutes for a 31-day month, plus manual runs and checks. Monitor your actual allowance and usage. Public repositories using standard GitHub-hosted runners have free Actions usage, subject to GitHub limits. Avoid enabling paid overages.

## Vercel deployment

1. Vercel → Add New Project → import your personal GitHub repository.
2. Framework: **Vite**. Root directory: repository root.
3. Build command: `npm run build`. Output directory: `dist`.
4. Add frontend variables `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
5. Deploy. Environment changes require a redeploy.
6. Configure Supabase authentication URLs as described above.
7. Run the collector or import an authorised feed; check the resulting storefront.

No Vercel cron, serverless scraper, paid proxy, paid API, custom domain or third-party paid service is required. Vercel Hobby is for personal, non-commercial use. A monetised/commercial deployment must use an appropriate hosting plan.

## Authorised catalogue import

Prepare an array of objects with `store`, `externalId`, `title`, `price`, optional `was`, `image`, `url`, `base`, and `defaultCategory`. Store must exactly match one of the six display names. Product URL must belong to that retailer. Only import data you are entitled to use and have recently verified.

```bash
cd scraper
npm ci
node src/import.mjs authorised-products.json --dry-run
# Export SUPABASE_URL and SUPABASE_SERVICE_KEY securely in your shell, then:
node src/import.mjs authorised-products.json
```

Imports are incremental and do not expire other products. Maintain your feed and database size; unlike the sale collector, imports do not impose the 300-per-store cap. Do not import demonstration prices into production.

## Free-tier design and monitoring

- Static frontend served by Vercel.
- Supabase queries select explicit columns and paginate by 24. Search is debounced.
- Filtering runs in database before pagination; catalogue request uses no realtime subscription.
- Retailer images are lazy-loaded from source URLs.
- Sale collector caps selected deals at 300 per retailer.
- Old inactive deals are purged after 14 days, saved inactive deals after 60 days.
- A failed or sparse scrape does not expire the old feed, but the frontend hides stale rows after 72 hours.
- Monitor database size, egress, user activity, Actions minutes and hosting usage. No design guarantees free operation at unlimited traffic.

Current documentation: Supabase Free includes 500 MB database and 5 GB uncached egress, with separate cached allowances. Limits can change. See https://supabase.com/docs/guides/platform/billing-on-supabase, https://vercel.com/docs/plans/hobby and https://docs.github.com/en/actions/concepts/billing-and-usage.

## Validation

TypeScript and production build passed; all 11 data-integrity tests passed. Browser screenshot/interaction verification was blocked by the execution environment, and live retailer collection and connected-account flows were not verified. Validate those after deployment.


```bash
npm run typecheck
npm run lint
npm run build
npm ci --prefix scraper
npm test --prefix scraper
```

`check.yml` runs these on pushes and pull requests. Scraper tests cover price parsing, discount rejection, mapping, deduplication, Target registration, unsafe schemes, and regular-price import normalisation.

## What came from each supplied project

The newer SaveHalf project supplies its typed hooks, auth dialog, database migrations, browser collection infrastructure and free-tier deployment configuration. The earlier Bolt project supplies the broader browsing/saved-dashboard direction. The main storefront, responsive styles, demonstration data, manual comparison, guest bookmarks, Target adapter, import pathway and integrity checks are new work. The old embedded environment file was deliberately not copied.

## UI refresh

The storefront uses warm paper, ink blue and vermilion, bold sans-serif type, original outline product placeholders and a catalogue-style sale poster. Motion includes staggered card entry, saved-heart feedback, a poster reveal and comparison/toast entrance. All animations and smooth scrolling are disabled when reduced motion is requested.

## Connected deployment

The production storefront at https://savehalf.vercel.app uses Supabase project `mdbqlcnzbakimfjrfczz` (Savehalf). Its empty schema was created directly with the tracked `create_savehalf_catalogue_and_bookmarks` migration. Do not rerun the historical migrations on this live database. The production frontend configuration is stored on Vercel; no service key is included. Public catalogue reads were verified with HTTP 200. No product rows were inserted. Email confirmation/redirect settings still need verification against the deployed domain in Supabase Authentication URL Configuration.

## Auth and live catalogue update (8 October 2026)

The signup dialog focus effect no longer runs again when its close callback changes. This fixes typing focus loss. Google OAuth uses the active site origin as its return URL. Email signup passes the same origin through `emailRedirectTo`; Supabase detects the returned session automatically. Public Auth settings confirm Google is enabled and email autoconfirm is off. The Google authorization endpoint returns a redirect to Google with this project's callback configured. An actual Google login and clicked confirmation email still need an account-level check.

In Supabase Authentication → URL Configuration, set Site URL to `https://savehalf.vercel.app` and include `https://savehalf.vercel.app/` in Redirect URLs. If using another deployment alias, add its exact origin with a trailing slash too. Keep confirmation emails enabled. This dashboard setting cannot be read or changed by the installed database connector, so its current allowlist is unverified.

The live database now contains 19 Kmart clearance offers verified from retailer product pages and two BIG W catalogue products. Prices, images and product links come directly from the retailer; Kmart reductions use published `SavePrice` values. BIG W products have no claimed reduction because no previous price was verified. This is selected coverage, not all products across six stores. The new Kmart adapter fetches public catalogue and product HTML without Playwright; it rejects non-AUD/out-of-stock offers and only follows Kmart product URLs. The GitHub scheduled refresh still requires the workflow and repository secrets to be installed in your repository. Feed rows expire from public view after 72 hours without a refresh.

## Current automation and meal planner (8 October 2026)

Supabase Cron is installed and six daily collector jobs are active. They run at 19:00–19:25 UTC (06:00–06:25 Sydney during daylight saving; 05:00–05:25 in standard time). Collection does not use an AI provider or any AI tokens. Each retailer has a target cap of 25 published reductions, plus up to 150 regular ALDI grocery rows (50 for other stores) for meal planning and up to 10 other catalogue rows. Caps are not coverage guarantees. Requests are bounded with a 12-second timeout and product detail fetches run in small batches. Unknown previous prices remain null and never appear as a discount.

The initial hosted test successfully refreshed 50 ALDI products. Kmart, Target and Woolworths returned HTTP 403 from the Supabase network; Coles returned no usable products; BIG W had an upstream HTTP/2 failure. These results are stored in `collection_status`. Existing verified rows are preserved after a failed run but age out of the public feed after 72 hours. The selected live catalogue after the first run held 106 products: 85 ALDI, 19 Kmart verified reductions and two BIG W products. Regular ALDI prices are shown under Browse products, not falsely labelled sale offers. Retailer availability remains subject to local store stock.

Cron authenticates the collector using a private random token held in Supabase Vault. The Edge Function validates the token through a service-only RPC before collecting or writing. Public users cannot trigger runs or write the catalogue. Per-store collection permits at most two starts per Sydney calendar day and rejects concurrent runs. The function has custom authentication, so platform JWT checking is disabled intentionally. Anonymous and incorrect-token requests were verified to fail.

The Cheap meals button and eligible product Add to meal actions open the planner. It supports a pantry checklist, a shopping budget, four built-in vegetarian recipes for two, whole-pack price estimates and exact retailer links. Missing products or unknown pack sizes make totals incomplete. Rice meal matching excludes precooked/microwave rice. Multi-pack quantities require manual review. Budget filtering covers fully priced baskets; incomplete baskets are clearly marked. No claim is made that these are the cheapest prices across all shops.

Recipe generation has been removed at the user's request. There are no recipe-provider API calls, provider keys or token-consuming recipe features. All recipe matching and shopping calculations run locally in the browser. A Budget Bytes link opens its publicly accessible recipe search in a new tab, using selected food kinds and pantry ingredients as the query. No request is made to Budget Bytes until the user clicks. External recipe sites may show their own optional paid products; SaveHalf links only to public recipe search. Any external recipe prices are not used in our AUD shopping calculations.

The old `meal-recipe` endpoint is retired and returns HTTP 410. It makes no network requests and cannot invoke an AI provider, even if a provider secret were added later. The unused quota RPC has been revoked and replaced with a function that always returns false. The historical migrations remain only for version history.

GitHub connection was declined. Local Git history and a Git bundle are prepared instead; no remote push or GitHub CI hookup is claimed. The earlier GitHub scraper workflow remains an optional alternative for retailers that permit collection from a different runner.

Free-tier planning: six scheduled collection invocations/day is about 180–186 scheduled Edge Function invocations/month, excluding manual tests. This is below the current 500,000 included free Edge invocations. Collection needs no AI API or tokens. No paid integrations are configured.

Project rule: future features must not use paid APIs, AI-token services or paid add-ons. Prefer browser-side tools, current free-tier services within their quotas, and optional links to publicly accessible external resources. Never automatically upgrade or activate billing.


To restore the included local Git history: `git clone history.bundle SaveHalf-repo` from the extracted archive folder. This creates a working repository that can later be pushed to your own GitHub remote.

## Expanded catalogue and community discovery

The hosted ALDI collector checks ten category pages in batches of three, retaining at most 25 known reductions, 150 regular grocery rows and 10 other rows. Daily automation remains six invocations; this expands data coverage without AI or paid services. The storefront shows per-store latest collection results and links to the six retailers on OzBargain. OzBargain posts are not copied or imported: feed access could not be verified, and community coupon/targeted offers are distinct from verified product prices.

Live expanded-run verification: 151 ALDI products refreshed from ten page requests; catalogue now holds 194 active products (173 ALDI, 19 Kmart, 2 BIG W), an increase of 88 distinct rows. This run found no published previous-price reductions on ALDI; those items remain regular catalogue entries.

## Free shopping tools and broader collection

Shopping list: add up to 100 products, adjust quantities (1–99), mark bought, see per-store and whole-basket estimates, set a budget, copy or download a CSV. Stored in this browser only, with no account or remote API call. Prices are saved snapshots, not checkout quotes; stale snapshots are flagged. Known reductions exclude products without recorded previous prices.

Grocery unit prices: calculate estimated AUD/kg or AUD/L only when the title contains one unambiguous weight/volume, including explicit N x size packs. Ambiguous packs and random-weight products show no unit estimate. Matching pack sizes does not establish equivalent products.

ALDI daily collector now reads 13 category pages, with at most 250 grocery rows, 40 other catalogue rows and 25 known reductions. Six daily jobs remain active. One authorised manual verification run refreshed 285 ALDI rows. BIG W listing routes now target actual clearance, tech/audio and women's fashion collections, but hosted access remains best effort.

Twelve manually reviewed BIG W product listings were imported on 8 October (six electronics with published previous prices, six fashion without previous-price claims). Sizes and local stock must be checked at BIG W. The snapshot `data/verified-bigw-2026-10-08.json` records these facts; manual imports do not claim successful automated collection and age out after 72 hours without refresh. The catalogue after this update contains 318 active products, including 9 electronics and 6 fashion.

Validation: typecheck/lint/build, 15 collector tests, four shopping calculations/CSV/storage tests and built storefront interaction checks. No AI API calls, tokens, paid integrations or billing changes.

## Sydney Cheap Eats

The header and home page open a Sydney food shortlist with area, budget, type and Sydney-weekday filters. Fixed-price menu items and percentage discounts remain distinct. All source links open on user action; no Maps or AI API is used.

`supabase/cheap-eats-setup.sql` records the reviewed database setup. The new `cheap-eats-collect` Edge Function uses the existing private Vault collection token, a service-only reservation RPC and a maximum of two authorised runs per Sydney day. The scheduled run is daily at 19:30 UTC. Three pages are allowlisted, each capped at 2.5 MB and 12 seconds; at most 47 offers are written. Read-only public RLS hides inactive, expired and older-than-48-hour offers. No collector token or service credential is present in the frontend.

Official IKEA campaign terms restrict $5 Friday meals to IKEA Family members, specified meal times and participating stores, ending 18 December 2026. Menu items depend on local availability. EatClub percentages, when recognised, are listed discounts without a confirmed meal price; users must check current app availability and conditions. An unrecognised source is marked for review rather than populated with invented offers.

See `IMPROVEMENTS.md` for 25 improvements, implementation status and the bounded automation budget. Additional coverage needs verified usable source pages, not an AI inference service. Source failures are visible in the food panel.

## Product images

The collector supports image URL strings, arrays, ImageObject/contentUrl, relative URLs, nested Product JSON-LD, Open Graph/Twitter metadata, and product-matched lazy/srcset images. Unsafe URLs, unresolved templates and known placeholders are rejected. Existing verified image URLs are preserved when a later scrape omits a photo. Public collection bounds and schedules are unchanged.

Cards and product details share a photo component. Missing or failed photos show a labelled fallback instead of an empty card; a new URL resets the failed state. Original retailer photos cannot be guaranteed when the retailer omits or blocks them. Verified image-only repairs update `image_url` without refreshing price timestamps.

## Household release

See [RELEASE-HOUSEHOLD.md](RELEASE-HOUSEHOLD.md) for the deployed planning, food, offline and privacy features, the collector governor and the remaining external verification limits. [UPGRADES-60.md](UPGRADES-60.md) records delivered, adapted and partial items honestly. Earlier catalogue snapshots above describe their historical releases, not current counts.

Run `npm run typecheck`, `npm run lint`, `npm run build`, and `node --test tests/*.test.cjs scraper/test/*.test.mjs`. Offline and screen tests require jsdom supplied through `SAVEHALF_JSDOM_PATH`. Run each `tests/*-ui.cjs` after the production build. `node scripts/build-preview.cjs` creates the credential-free self-contained preview, including the household panel. Database security tests are transactional in `supabase/operations/planning-rls-tests.sql`.
