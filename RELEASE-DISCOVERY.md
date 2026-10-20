# Discovery and food bookmarks release

This release implements 13 distinct upgrades documented in UPGRADES-60.md. The remaining 47 are proposals, not deployed features or enabled automation.

The release adds validated share links, six locally saved searches, three quick presets, excluded title words, 100 hidden product IDs with undo/restore, HTTPS photo-URL filtering, 24-hour price-check filtering, separate kg/L unit-price ordering, new-record markers based on the previous device visit, compact cards, a keyboard skip link, 60 local food bookmark IDs, and Sydney-date expiry suppression for food offers.

Client refinements operate only on loaded records and say so. They do not claim to rank the entire market. Presets and restored searches use existing user-triggered catalogue queries. All sharing is user-clicked and shares browsing filters only; no account token, list or bookmark is included. Invalid shared/stored filters are rejected. Local data limits are enforced. Bookmarks do not retain or renew expired offers.

No new scraper requests, source expansion, schedules, billing, AI calls, dependencies, schema changes or RLS modifications. Existing Auth and private account data flows are preserved. Local storage is device-specific and can be cleared. Retailer access blocks are still a data-coverage limitation.

Validation: TypeScript, lint and production build pass. 41 unit/parser tests pass. Eight DOM test flows pass for shopping/email focus, new discovery behaviours, saved food IDs and expired offer exclusion, price checks and watches, product images, retailer links and recovery forms. New client-filter/share/hide/bookmark interactions were checked for no additional catalogue/food reads. DOM testing is not rendered browser visual QA. Google consent and actual mailbox delivery have not been tested by this release.
