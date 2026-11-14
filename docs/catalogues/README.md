# Automated catalogue collection and attributed website advertisements

PR #37, `feat/catalogue-pipeline`, based on `main` a16bb1d. No changes to existing
retailer adapters, their pauses, Supabase schema/RLS or authentication.

## Source findings and resolved blockers

The public Coles viewer URL ends in **3900088**, but its embedded page images live
under **3900091**. Reconstructing URLs from the viewer ID is incorrect. Explicit
HTML thumbnails are only 165 × 270; the first thumbnail yielded no usable OCR.

The source's referenced `booklet/folder-viewer.*.js` explicitly substitutes the
literal `large` into its `flyerPages` templates. The collector now reads that static
recipe and JSON literals without executing JavaScript. It verifies the viewer's
`storeUrl`, CDN, template shape and source-referenced script. Changed or ambiguous
recipes stop as drift. A real resolved Coles image was **1219 × 2000**, and local
Tesseract extracted **91 non-empty words**, including names, pack sizes and the
`FP-VIC-METRO` printer code. That is a **Victorian edition**, not Sydney pricing.

Promotional prices with large digits/superscript cents are still unreliable OCR.
The primary offer route therefore parses the source's already structured public
**offer cards**: ID, product name, exact advertised price, reference-price text,
matching offer image, catalogue URL and page number. Images must contain the same
offer ID. No external image search, guessed matching, arithmetic discount or
reference-price reinterpretation is used. OCR remains page evidence, not a price
publisher.

A bounded live two-store run returned **25 Coles + 25 Woolworths** offer cards,
16 requests and 4,100,035 body bytes. Absolute catalogue dates were independently
joined from viewer metadata or a listing cover with the exact catalogue ID.
The resulting **50 attributed advertisements** passed feed export. This verifies
that sample, not every retailer, every catalogue page, every variant or stock.

Minimal sanitised fixtures include observed Coles cards, listing metadata, image
URLs and the static viewer recipe. No full HTML, cookies, tracking/challenge tokens,
headers or credentials are committed.

## Automatic flow

1. Read all **28 retailer names** from the website's actual primary and directory lists.
2. Discover returned store links and the robots-advertised store sitemap. Verified
   aliases cover Best & Less, Bunnings Warehouse and Domino’s Pizza without
   guessing endpoints. Absent stores remain explicitly undiscovered.
3. Follow an actually observed `/specials` link. Parse up to 25 source cards per store;
   explicitly report extra cards, rejected rows and unprocessed pages as partial.
4. Read dated catalogue metadata. Follow a bounded selection of referenced viewers
   for full-page image evidence and local OCR.
5. Join advertisements to absolute source dates. Missing/future/expired metadata is held.
6. Export `website-feed.json`. Do **not** write these advertisements into verified
   deals, provider products, price history, meal-planning prices or favourites.
7. Build the existing website with that generated file as `public/catalogue-offers.json`.
   The separate **From the catalogues** section displays source prices, source links,
   detected edition or region-unverified labels, reference-price caveats and check times.
8. Optionally stage a production build, compare its deployed feed with the generated
   file and promote that exact build. This publisher is disabled unless opted in.

No ChatGPT wake-up, vision API, new AI provider or recurring manual review is needed
for source cards. Image-only or ambiguous offers are held; there is no claim that
OCR extracts every product correctly.

## Freshness, expiry and resuming

- Every source card keeps its actual `source_checked_at`. Reading/re-exporting a file
  never resets it. Captures more than 24 hours old or future-dated are rejected.
- Known printer-code regions use that region's IANA timezone, including DST.
- Unknown-region catalogue dates use the conservative intersection of civil timezone
  windows: activate late, expire early. This sacrifices some availability rather than
  silently assigning nationwide applicability. Original date strings remain visible.
- The browser hides rows at expiry or after 24 hours without source verification,
  independently of the scheduler; it checks every 30 seconds and on visibility return.
  The feed revalidates at most every 15 minutes while visible.
- The previous feed can retain still-current rows for unprocessed stores without
  renewing their timestamps. Newly held versions suppress older versions of that ID.
- Small image checkpoints contain only URL, content hash, original download time,
  OCR outcome and detected region. Reuse does not claim a new image check. They expire
  after seven days and are capped at 500 entries / 500 KB. Previously processed images
  do not consume the next batch's download allowance, allowing progress through pages.
- Prior state is recovered from a successful run on `main`. Missing/expired artifacts
  safely restart discovery. No previous file paths or executable content are trusted.

## Bounds and workflow behaviour

CLI defaults: 40 total requests, 4 viewers, 5 new images, 8 specials listings.
Absolute ceilings: 80 requests, 10 viewers, 25 images, 28 specials listings.

The workflow uses **80 requests, 4 viewers, 5 new images and 14 specials listings**,
twice daily at 08:15 and 20:15 UTC. Half-day rotation prioritises different halves of
the 28-store target list. That is bounded polling, not an exhaustive instant mirror.
Not every listed retailer necessarily has a catalogue on this source.

Other bounds: 40 MB total, 4 MB per response, 20-second read/connection timeout,
checked 30-second body deadline, one-second minimum spacing plus robots crawl-delay,
serial workflow concurrency and 10-minute limits on each job. Redirects, arbitrary
hosts, cookies, browser fallbacks, private APIs and unsupported query URLs are rejected.
The job checks robots separately for the source and image CDN and fails closed.

State artifacts are retained two days; page evidence one day. These consume included
GitHub storage/minutes, so verify the available allocation before activation. No paid
service or billing is activated. An enabled job is not a guarantee of complete coverage.

## Local commands

```sh
python3 -m unittest discover -s tools/catalogues/tests -v
python3 tools/catalogues/pipeline.py --stores Coles,Woolworths \
  --requests 20 --viewers 4 --images 2 --specials 2 \
  --output catalogue-artifacts --website-feed public/catalogue-offers.json
node --test tests/catalogue-feed.test.cjs tests/catalogue-render.test.cjs
npm run typecheck
npm run lint
npm run build
```

Install free local `tesseract-ocr`. No Python packages or model accounts are needed.
The tracked public feed is **empty**; live captures are never committed as perpetual
prices. A failed/missing feed does not change the working main catalogue.

## One-time activation and deployment boundary

This PR does not merge, dispatch, deploy, change variables or obtain credentials.
Both jobs require reviewed `main`; the source pipeline additionally requires
`SAVEHALF_CATALOGUE_STAGE_ENABLED=true`. The production publisher independently
requires `SAVEHALF_CATALOGUE_PUBLISH_ENABLED=true`.

Before enabling, resolve the source-use basis and confirm included Actions/Vercel
quotas. CatalogueOffers' published Article 13 restricts content exploitation and
addresses permission for intellectual-property use. This is distinct from ownership
of the underlying retailer catalogues. Source:
https://www.catalogueoffers.com.au/terms-and-conditions

For automatic release, configure the existing SaveHalf Vercel project's IDs as
`VERCEL_ORG_ID` and `VERCEL_PROJECT_ID`, a reviewed exact `VERCEL_CLI_VERSION`, and
`VERCEL_TOKEN` directly as a protected production secret. Never paste tokens into chat
or commit them. Restrict the production environment to reviewed `main` and use the
owner's release approval policy. No new account/project should be created.

The publish job skips unchanged advertisement data. It pulls that project's production configuration, checks its IDs, installs
and tests the application, builds, deploys with `--prebuilt --prod --skip-domain`,
fetches `/catalogue-offers.json` through `vercel curl`, compares it exactly, then
promotes. A failure before promotion leaves the existing production deployment alone.
Nothing secret-bearing from `.vercel` is uploaded as an artifact. Existing Git-based
releases still deploy normally; a source-code release carries the deliberately empty
feed until the next enabled catalogue job publishes a fresh capture.

### Rollback

Disable the catalogue stage/publish variables to stop future work; use the existing
Vercel deployment rollback for an immediate release rollback. The UI independently
expires stale advertisements. No database rows, schema changes or adapter unpauses
need undoing.

### Not verified

- Production Vercel CLI credentials, exact CLI version, deployment protection and
  promotion flow: integration code is present but has not been activated or exercised.
- Source-use permission and remaining included Actions/Vercel quotas.
- Catalogue/offer availability for all 28 targets; the live offer sample covers two.
- Reliable price extraction for image-only offers or complete catalogue coverage.
- Browser screenshots/axe: local Chromium exits because its singleton socket is denied.
  The actual React component is covered by a jsdom render test, including expiry.

## Validation for this update

47 Python regressions (including a complete mocked run and checkpoint resume),
197 application tests, 28 UI regression scripts, build, lint and typecheck passed.
The actual React render test verifies visible caveats and open-page expiry. GitHub
CI and the optional Vercel production handoff must be reported separately.
