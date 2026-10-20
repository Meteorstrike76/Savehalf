# WhichGrocer integration — 19 October 2026

Verified connected account: personal_lite, active, no card, 200 credits/month. Four specials pages cost four credits; 196 remained. Merchant list includes Coles, Woolworths, BIG W and Kmart, but not Target. 100 returned rows produced 98 eligible imported snapshots (Coles 25, Woolworths 23, BIG W 25, Kmart 25). No raw API key was accessed or copied from ChatGPT.

The table provider_products is separate from direct retailer observations. The original deals, users and favourites remain intact. Cards show AUD price, provider update date, retrieval date, provider attribution and comparison against provider average_30d. This average is not retailer RRP, previous selling price or a weekly half-price catalogue. Snapshot products do not enter direct price history, basket calculations or account favourites. Filters and 12-row database pagination operate in the main results. Half-price excludes these average-based comparisons.

RLS permits recent public reads only. Anon/authenticated writes are revoked. Visibility requires retrieval within 72h and source updated within seven days; records prune after 30 days. Imported relation size measured 114,688 bytes. No images are stored in Supabase or transformed by Vercel. Supplied WhichGrocer image URLs remain externally hosted.

## Refresh and unattended boundary
The connected ChatGPT tools were used for this import. They are not backend credentials and do not make a GitHub/Supabase cron capable of calling WhichGrocer. Unattended collection is NOT enabled. Do not use recurring LLM/AI jobs, extract connector keys or put keys in the browser. Existing direct collectors continue unchanged.

For repeatable reviewed imports, obtain fresh provider page JSON through an authorised tool/API, save an array of response objects locally, and run:

    node scraper/src/whichgrocer-import.mjs pages.json
    node scraper/src/whichgrocer-import.mjs pages.json --publish

Publish requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in server-only environment variables. The importer validates domain, currency, stock, timestamp and page caps and makes idempotent ID upserts. It refuses a conservative total-row budget exceeding 1,000 (including overlap, intentionally conservative). Never commit provider page dumps or secrets.

A future non-AI job needs an independently issued server API key and confirmed current HTTP documentation. Store it in GitHub Actions secrets or Supabase Vault, never chat. GitHub writing is still blocked by the integration's 403. Do not claim this step complete. Do not invent endpoint URLs. Suggested budget after API access: four category pages/day across the four stores = at most 124 credits in a 31-day month; leave at least 20 credits reserve and stop on quota exhaustion. Actual quota is shared with the user's other API/MCP use; check account before runs. Expand categories only within the monthly cap. This allowance was verified for this account, not promised universally.

## Licence and exit
API terms: https://www.whichgrocer.com/developers/terms . Display attribution is required. Provider does not warrant retailer authorisation. On withdrawal, stop fetching and showing affected records immediately, delete cached affected provider data within 30 days, and purge backups on ordinary rotation within 60 days. The existing 21-day encrypted-artifact policy would fit only once enabled and tested. Product snapshots are not included in source releases. Keep user-owned list structures while removing withdrawn provider fields. Contact provider for written supply clarification when needed.

## BIG W catalogue test
Ordinary request to catalogue.bigw.com.au/robots.txt returned 404; catalogue extraction was not admitted or enabled. No browser evasion or alternative identity was used. Target remains unresolved and is not falsely attributed to WhichGrocer.

## Free-tier impact
One page read returns 12 products (selected columns only) and is cached for two minutes. Plan conservatively for an additional 10 KB/page response, four provider pages per monthly visitor: 0.04/0.4/2 GB extra Supabase egress at 1k/10k/50k visitors. Add this to previous budgets; it reduces, rather than increases, free-tier headroom. There is no per-visitor WhichGrocer credit consumption. With the previous conservative 0.4 MB/visitor estimate plus this 0.04 MB and 0.16 GB exports, uncached egress reaches 5 GB around 11k visitors/month before unrelated project traffic. It is a planning estimate, not measured production traffic.
