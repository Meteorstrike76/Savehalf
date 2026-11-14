# Catalogue pipeline: staging implementation, not an activated data feed

Branch: `feat/catalogue-pipeline`, based on `main` a16bb1d. No changes to existing
retailer adapters, review stops, Supabase schema, auth or production data.

## Implemented

- Reads **all 28 actual retailer names** from `src/lib/stores.ts` and
  `src/lib/moreRetailers.ts`. Directory entries are targets, not verified coverage.
- Discovers real public listing URLs from `/stores` and the store sitemap linked
  from the robots-advertised sitemap index. Does not synthesize retailer endpoints.
- Extracts catalogue validity dates, cover URLs, viewer links and Product JSON-LD
  where provided. Preserves source product fields as evidence.
- Discovers explicitly rendered page-image URLs. Does not guess CDN paths or
  execute source JavaScript. The observed Coles viewer URL ID 3900088 has page
  assets in folder 3900091; these IDs must not be assumed interchangeable.
- Local Tesseract OCR produces TSV words, confidence and layout coordinates.
  OCR text is **not** a validated price/name/pack/condition association.
- Writes a manifest, page-image evidence and OCR TSV into a GitHub Actions artifact.
  Tokens, cookies and full source HTML are not saved. Retention: seven days.
- Daily workflow, serial concurrency, 15-minute job deadline, 40 requests including
  robots, 4 viewer pages and 5 images by default. Absolute CLI ceilings: 80 requests,
  10 viewers, 25 images. 40 MB total and 4 MB per response, 20-second connection/read
  timeout and 30-second checked body deadline. At least one second between requests;
  robots crawl-delay respected. No automatic retries or redirect following.
- Robots checked separately per origin. Non-success robots responses fail closed.
  Only HTTPS catalogueoffers.com.au and img.offers-cdn.net, no query-bearing URLs.
- Target order rotates daily to avoid permanently favouring the first retailer.
- Missing listings, empty metadata, byte caps, request caps and source failures remain
  explicit. `complete=false` and `publishable_offers=[]` are intentional: this is
  an evidence collector, not a claim of complete retail coverage.

## Run and inspect

```sh
python3 -m unittest discover -s tools/catalogues/tests -v
python3 tools/catalogues/pipeline.py --requests 40 --viewers 4 --images 5
```

Install the free local `tesseract-ocr` package for image extraction. No Python
packages or API credentials are needed. Open `catalogue-artifacts/manifest.json`;
inspect the per-store outcomes and each image's TSV.

The scheduled job is disabled unless repository variable
`SAVEHALF_CATALOGUE_STAGE_ENABLED=true`. Do not enable until source-use review and
included GitHub Actions allowance are confirmed. No variable was changed by this PR.
It is daily polling, **not** exact expiry-time refresh or durable ingestion.
A cron in a PR branch does not activate until merged into the default branch.

## Verified source observations (14 November 2026)

Public root, robots, Coles listing and one viewer were inspected with bounded
requests. Coles listing JSON-LD contains dated cover metadata. The viewer embeds
explicit page thumbnails and JavaScript page templates. Templates are not guessed
or evaluated. The small committed fixtures contain only public catalogue metadata,
links and image URLs, stripped of all surrounding tracking/challenge markup.

Sources:
- https://www.catalogueoffers.com.au/robots.txt
- https://www.catalogueoffers.com.au/stores/coles/catalogues-specials
- https://www.catalogueoffers.com.au/view/offers/coles-catalogue-3900088
- https://www.catalogueoffers.com.au/terms-and-conditions (Article 13)

Public availability alone does not establish republication rights. Source terms
restrict content exploitation and discuss intellectual-property permission. This
is a source-use dependency, not a determination of ownership of retailer catalogues.

## Remaining work before website publication

1. Resolve a permitted source-use route (this source, retailer originals or a feed).
2. Prove full-resolution asset discovery; observed explicit viewer images can be
   thumbnails. Missing full-size links must be diagnosed, not constructed by guessing.
3. Build and evaluate layout-aware offer extraction against labelled pages from
   multiple stores: name, pack, exact price/currency, multibuys, membership, limits,
   reference-price basis, validity and region. Low-confidence fields must remain absent.
4. Add image association using exact product/variant evidence or catalogue crops
   where reuse is established. Search-result images are not verified product matches.
5. Add persistent catalogue hashes, checkpoints, expiry-aware scheduling and deduplication.
   Current daily rotation/staging does not promise all-page coverage or avoid refetches.
6. Integrate a separately tested catalogue publication path. Existing provider imports
   are WhichGrocer-specific; do not impersonate provider records or reset old freshness.
   Validate both valid-from and expiry at read time so a missed job cannot retain offers.
7. Test rollback, partial imports, replacement arriving late, changed expiry, region
   mismatch, extraction errors and writes against the actual website contract.

This PR deliberately has **no database credentials, publisher or automatic AI API**.
ChatGPT does not automatically wake when GitHub uploads an artifact. Any future model
worker must have an explicit trigger, verified free allowance and server-side quota
limits; otherwise free local OCR remains the available unattended stage. No paid
model, new account, browser workaround or access-review override is introduced.
