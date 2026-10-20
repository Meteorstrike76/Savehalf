# Release A — My shop and basket checks

My shop brings together the estimated basket, remaining products, budget, shopping templates, price watches, saved deals and Sydney cheap eats. Opening the dashboard adds no requests. Shopping lists, templates, budget and watches remain on this device; account bookmarks keep their existing behaviour.

The shopping list has an explicit Refresh basket prices button. It selects existing public catalogue records for at most 100 product UUIDs, with a 12-second timeout and five-minute cooldown per visit. Only active, non-seed prices collected within 72 hours are eligible. It neither starts a scraper nor polls. Exact ID, retailer, title and category must match; missing products or changed variants retain their saved prices with an unverified label. Sample prices are never verified. API failures retain all prices.

Per-item changes and the previous/current subtotal for matched products are displayed at current quantities. The complete basket estimate includes retained prices for unverified products and is not a retailer checkout quote. Quantities, bought flags and budget are preserved. Functional updates preserve changes made while the request is pending and do not restore removed rows or overwrite differently priced/replaced products.

Validation: TypeScript, lint and production build pass; 38 unit/parser tests pass; DOM checks cover successful, missing and failed basket responses, query limits/cooldown, dashboard without extra requests, budget/quantity/bought preservation, stable email and quantity input focus, templates/watches, cheap eats, images, retailer directory and password recovery. A real anonymous public catalogue request also matched a bounded product lookup. DOM checks are not a visual browser review. Google consent and email delivery were not reverified by this release.

No schema changes, new dependencies, AI tokens, billing changes, background alerts or new scheduled collection jobs. Existing collection limitations and free-tier quotas still apply. Later roadmap releases remain separate work.
