# Approved consumer upgrade rollout — 30 October 2026, Sydney

Owner approved the consumer upgrade programme, administration, moderated deal suggestions, retailer expansion, meals and outfits. Keep every release independently tested; approval does not mean unfinished phases are active.

## Release 1: pharmacy products

Chemist Warehouse and Priceline: 25 real WhichGrocer snapshots each, obtained through authorised connector pages for two credits. Exact retailer-host validation, AUD, stock, source freshness, image and 1000-row total budgets remain. Existing snapshot RLS and 72-hour expiry are unchanged. UI adds a lazy-loaded 12-row pharmacy section with separate retailer coverage, shared search/category/price filters, provider attribution and an explicit non-medical scope. No new service/dependency, retailer scraping or unattended WhichGrocer credential access.

Officeworks is not in the WhichGrocer store list. Official terms section 5 prohibit reproducing/downloading/storing/publicly displaying website content without prior written permission: https://www.officeworks.com.au/information/policies/terms-of-use . Its robots policy is a separate control, not a content licence. Existing community handoffs remain; no invented product feed or unauthorised crawler is enabled.

## Release 2: admin and registered submissions

Require a verified owner Supabase identity before assigning administrator access. Never grant privileges by user-editable metadata, first signup, GitHub name or frontend URL. Add private administrator membership, audited owner RPCs, paginated review queues and MFA enforcement. Keep service-role keys out of the browser. Registered deal suggestions are private pending review, limited to three/day, with validated retailer links, prices and conditions. Product/store requests support deduplication. Do not automatically fetch arbitrary user URLs or publish claims as verified prices.

Add aggregate submitted-search insights, zero-result searches and clicks; no keystroke capture or identity tracking by default. Sanitise input; cap detailed events at 20000/seven days, retain bounded daily aggregates for 90 days and document collection in privacy settings. Controls, reports and data export must be authorised at the database boundary. Default personal preferences stay local unless the user chooses sync.

## Release 3: meals and shopping

Extend existing pantry/recipe/list components with no-beef/no-pork/vegetarian/vegan exclusions, household size, days, time/equipment and chosen stores. Filter candidates before optional AI; validate after it. Deterministic whole-pack purchasing arithmetic, leftovers, pantry deduction, incomplete pricing and substitutions. Unknown costs are never zero. No allergy-safety, medical or certified religious-compliance claims from incomplete product data. Reusable weekly shop and one/two-store comparisons follow actual coverage.

## Release 4: outfits and discovery

Real-product outfit boards with budget, occasion, size and colour preferences; replace individual pieces and show missing categories/sizes. Never infer live size availability, fit or stock from a title or generated text. No virtual try-on or generated retailer photography. Consolidate navigation and measure initial-load size/accessibility after changes.

## Release 5: provider extension

Evaluate approved Cloudflare Workers AI fallback and newly authorised Gemini Free only after verifying account/model limits, no-card eligibility and data terms. No paid model or automatic billing fallback. Server keys, daily caps, caching and circuit breakers; the whole app remains usable through rules/templates. Do not send identity, private search history or full dietary profiles to models. OpenRouter/Mistral remain lower-priority evaluations, not silently activated accounts.

## Existing limits

The last measured DB was approximately 17 MB. Do not treat this as current egress usage. Supabase Free official quotas include 500 MB DB, 5 GB egress and 500000 Edge invocations: https://supabase.com/docs/guides/platform/billing-on-supabase . Vercel Hobby remains non-commercial: https://vercel.com/docs/plans/hobby . Keep private backup/health owner gates and retailer pauses intact. Provider snapshots still require new authorised retrievals; this release does not claim automatic refresh.
