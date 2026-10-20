# SaveHalf — 60 upgrades with a free-first delivery plan

Prepared 10 October 2026. This records the discovery and household releases. Rows 1–13 shipped in the discovery release. Rows 14–57 and 59 now have working implementations or explicitly scoped alternatives. Rows 58 and 60 have completed bounded checks, with the broader audits and external configuration limits listed below. This is not a claim that every original proposal has been implemented unchanged. Earlier work such as My shop, basket checks, comparison, weekly templates and price watches is not counted again.

The aim is to help someone answer: “What is worth buying?”, “Can I afford this shop?”, and “What can I eat cheaply nearby?” Repeat visits should come from useful saved work and trustworthy prices, not pressure, fake urgency or invented discounts.

All work must use the existing free stack, browser calculations, fixed recipe content or user-clicked public links. No AI inference or tokens, paid maps, paid email/notifications, proxies, billing activation or paid APIs. Free tiers have limits; server-backed proposals need measured quotas before implementation. No proposal justifies cycling old specials into current offers without a new observation.

| # | Upgrade | User value and implementation | Delivery |
|---|---|---|---|
| 1 | Useful browsing starting points | Groceries under $5, fashion under $20 and electronics deals use existing filtered catalogue queries on a click. | Delivered |
| 2 | Saved searches | Six named browser-local searches retain retailers, category, query, sort, sale view and cap; users can restore, update or delete them. | Delivered |
| 3 | Shareable browsing links | Copy a validated filter URL; account tokens, shopping lists and bookmarks are excluded. Invalid incoming state is ignored. | Delivered |
| 4 | Exclude unwanted title words | Comma-separated exclusions hide matches in already loaded rows without querying again. | Delivered |
| 5 | Hide unwanted finds with undo | Hide up to 100 IDs on the device; undo the last hide or restore all. Hiding never deletes saved products or database rows. | Delivered |
| 6 | Photo URL filter | Show loaded products with an HTTPS image URL; this does not guarantee the remote image will load. | Delivered |
| 7 | Fresher loaded products | Restrict loaded rows to a check within 24 hours; samples and future/invalid timestamps do not qualify. | Delivered |
| 8 | Unit-price browsing order | Order known unit prices within separate kg and L groups; unknown sizes follow. Never compare price/kg directly with price/L. | Delivered |
| 9 | Added since last visit | Mark products whose recorded publication time is after the prior device visit. This is an added-product badge, not evidence of a price drop. | Delivered |
| 10 | Compact product cards | Reduce image/card size for quicker scanning while retaining price, store and actions. | Delivered |
| 11 | Keyboard skip link | Move directly to the product results, with a focusable destination and visible keyboard link. | Delivered |
| 12 | Cheap-eats bookmarks | Save up to 60 food offer IDs locally and filter to current saved offers; no extra food queries. | Delivered |
| 13 | Expired food-offer suppression | Exclude offers after their stated end date in Sydney time, including in saved view. An old bookmark is never treated as a renewed offer. | Delivered |
| 14 | Persistent cupboard inventory | Keep actual quantities and units locally, extending the current meal planner's temporary pantry ticks. Separate owned stock from collected products. | Delivered |
| 15 | Pantry expiry queue | User-entered best-before/use-by dates, with “use first” ordering. Do not infer food safety from a date alone. | Delivered |
| 16 | Leftover-first recipe ranking | Rank existing fixed recipes by food the user says needs using soon; no generated recipe calls. | Delivered |
| 17 | Batch cooking planner | Combine two or three existing recipes, consolidating ingredient quantities before rounding to purchasable packs. | Delivered |
| 18 | Portion scaling | Scale fixed recipe amounts to household size, preserving units and rounding pack counts up. Unknown pack sizes stay unpriced. | Delivered |
| 19 | Dietary preference controls | Filter authored recipe metadata such as vegetarian preferences; catalogue products must not acquire guessed allergen labels. | Delivered |
| 20 | Honest ingredient substitution suggestions | Offer authored swaps inside recipes, with a user confirmation and recalculated pack needs. Never replace an exact basket product automatically. | Delivered |
| 21 | Basket sensitivity calculator | Let a user explore “what if these prices rise 5%?” locally. Label it a scenario, not a retailer price prediction. | Delivered |
| 22 | Store trip planner | Group the list into store visits, with user-set priorities and manual consolidation; avoid claims of global optimality. | Delivered |
| 23 | Is the detour worth it? | Compare observed savings with user-entered travel cost/time. A cheaper shelf price may not make a cheaper trip. | Delivered |
| 24 | Household cost split | Allocate bought items to people and split shared quantities locally; export a summary rather than process payments. | Delivered |
| 25 | Shopping trip receipt log | Manually enter actual amounts paid, separately from catalogue estimates, with local date/store history. | Delivered |
| 26 | Estimate versus actual spending | Compare a completed trip's saved estimate against its manually entered receipt total, explaining incomplete/mixed estimates. | Delivered |
| 27 | Weekly spending envelope | Local planned/actual spending totals across grocery and cheap-eats trips, with no bank connection. | Delivered |
| 28 | Personal savings ledger | Count only observed or explicitly user-entered comparable previous prices; never turn all discounts into realised savings. | Delivered |
| 29 | Portable device backup | Export local lists, templates, watches, searches and food IDs to versioned JSON; validate and preview an import before replacement. | Delivered |
| 30 | Household list handoff | Share a plain-text checklist or downloadable list file without public server storage or an account token. | Delivered |
| 31 | Print shopping mode | A readable store-by-store print layout with quantity, bought mark and price-check date, without browser chrome/buttons. | Delivered |
| 32 | Offline shopping checklist | Cache the app shell and an explicit last-known list. Show “offline” and never pretend cached prices are fresh. Avoid caching Auth URLs/tokens. | Delivered: offline checklist, public assets only |
| 33 | Wednesday calendar reminder | User-downloadable recurring calendar event for checking new supermarket specials; it does not auto-publish recurring old offers. | Delivered |
| 34 | Cheap-eats calendar export | User-clicked calendar file for an offer's stated day/end date and conditions. No claim about reservation or actual opening hours. | Delivered |
| 35 | Food day-of-week planner | Browse meals scheduled for a selected Sydney weekday, extending today's filter without more upstream requests. | Delivered |
| 36 | Food dietary and conditions chips | Extract only publisher-stated vegetarian, member, dine-in or booking conditions into clearly sourced fields. Unknown remains unknown. | Delivered |
| 37 | Cheap-eats journey shortlist | Let users pick suburbs near work/college/home and save those choices; no GPS collection or paid geocoding required. | Delivered |
| 38 | Student offer directory | Curated public official links with eligibility, expiry and last manual review date. No invented student discounts. | Delivered: reviewed official handoffs; availability remains external |
| 39 | Free community meal directory | Small reviewed list of official community providers with public hours/eligibility and source dates; clear separation from retailer deals. | Delivered: reviewed official handoffs; availability remains external |
| 40 | Surplus-food handoff directory | Official links to available surplus-food services, clearly labelling variable availability and third-party fees. | Delivered: reviewed official handoffs; availability remains external |
| 41 | Price history for watched products | Keep a bounded observation log for watchlisted IDs; distinguish retailer observations from user-entered prices and gaps. | Delivered: bounded device observations |
| 42 | “Lowest observed” badge | Use sufficient stored comparable observations and a stated window. Never claim an all-time or market-wide lowest price. | Delivered: bounded device observations |
| 43 | Sale-cycle evidence | Describe intervals between genuinely observed discounts, with uncertainty and missing weeks; do not forecast guaranteed Wednesday discounts. | Delivered: bounded device observations |
| 44 | Exact-product equivalence review | An explicit curated brand/size/model mapping permits comparison across retailers. Similar titles alone never establish equivalence. | Adapted: user-reviewed pair per visit; no curated global mapping |
| 45 | Multipack value comparison | Compare verified equal-size packs by unit cost, including rounding and conditional eligibility where known. | Adapted: known units and whole-pack calculations; user confirms equivalence |
| 46 | Promo condition visibility | Separate unconditional shelf discounts from loyalty, coupon, multibuy and subscription conditions using publisher evidence. | Adapted: publisher terms plus personal notes; no universal promo classifier |
| 47 | Retailer-specific product counts | Display current checked row counts by category alongside collector status, keeping populated feed and working collector distinct. | Delivered |
| 48 | Human-readable collection health | Summarise empty/blocked/failed runs and last success, with an explanation of what users can still trust. Extend the existing status section. | Delivered |
| 49 | Parser drift dashboard | Track bounded per-run row counts and required-field completeness, flagging sudden changes for review instead of accepting suspect imports. | Delivered: latest health, private audit and row-drop quarantine |
| 50 | Source replay fixtures | Retain sanitised small fixtures for parser regression tests; never store whole retailer sites or personal data. | Delivered |
| 51 | Admission checklist for new retailers | Require accessible source, explicit price, source link, bounded request count, image provenance and acceptable usage before enabling a pilot. | Delivered |
| 52 | Source budget governor | Record estimated request/row/byte budgets per source and stop expansion at a chosen ceiling below measured free quotas. | Delivered |
| 53 | Database retention policy | Keep only useful history windows, with a reviewed cleanup process and backups; no unbounded observation growth. | Delivered |
| 54 | Authenticated preference sync | Optional owner-only RLS sync for small preferences, with conflict handling and deletion controls. Keep guest use fully functional. | Delivered |
| 55 | Stale-price feedback | A bounded report form tied to an existing ID, protected against spam; never replace the price just because a user reports one. | Delivered |
| 56 | Privacy control centre | Explain device versus account data, allow scoped export/deletion, and distinguish local clearing from account deletion. | Delivered |
| 57 | Navigation for one-handed use | A small mobile bottom bar for browse/list/My shop, tested for keyboard focus, safe-area spacing and modal overlap. | Delivered |
| 58 | Accessibility and contrast audit | Check actual rendered focus, target size, headings, colours, announcements, zoom and reduced-motion behaviour rather than declaring compliance from CSS. | Partial: focus, semantics, reduced-motion and layout checks; full audit pending |
| 59 | Route loading and request deduplication | Lazy-load rarely used panels; share a short-lived client read cache where appropriate, with explicit freshness and Auth separation. | Delivered |
| 60 | Abuse controls and deployment checks | Review existing protections and quota exposure; trial compatible free bot controls only after verifying current terms. Add bounded checks for public assets, owner-only writes, Auth callbacks and secret leakage. | Partial: RLS, quotas and asset checks; external OAuth/mail and custom WAF unverified |

## Release implementation and checks

The household release adds cupboard quantities/dates, combined fixed recipes, portion scaling, authored swaps, manual receipts/envelopes, trip scenarios, bought-item splits, file handoffs, printable/offline checklists, calendar exports, selected-weekday food browsing and local price evidence. My shop → Household tools opens the lazy-loaded planning/privacy panel. Public food/grocery/health reads share a five-minute in-memory cache; account data is excluded.

New server work is deliberately small: owner-only retailer preferences, private price reports (three per account per day; 1,000 global rows; 90-day retention), a service-only daily HTML reservation governor (100 MB/day), collector telemetry (30 rows/store, 14 days), and one daily database cleanup. Collector schedules are unchanged. Source-specific request/body caps and row-drop quarantine preserve honest missing coverage.

Validation covers typecheck, lint, production build, 51 calculation/parser/offline/calendar tests, nine screen regressions, transactionally rolled-back database ownership/spam tests and a real governed ALDI run (286 rows, 13 requests, 8.94 MB HTML). See RELEASE-HOUSEHOLD.md for scope, timing and limits.

## How success should be measured

Start without third-party tracking scripts. Use explicit user feedback and small local usability exercises: can someone restore a search, find a comparable pack price, understand a missing price, keep a cheap meal, and complete a list on a phone? If opt-in product analytics are later introduced, cap retention and reads, document consent, and verify free quotas first. Do not show invented popularity, shopper counts or savings.

## Known limitations

- Local filters and unit ordering operate on loaded rows, not the complete market. Pagination is explicit.
- A photo URL is not proof of a successfully loaded image.
- “Added since last visit” uses device history and recorded publication dates; it does not track price changes between visits.
- Hidden products remain in saved lists/bookmarks; they can be restored in browsing controls.
- Local storage can be cleared and is not cross-device sync.
- Collector failures can still leave categories thin or empty. This release does not repair retailer access blocks.
- No new Google consent or mailbox delivery verification is implied; those remain separate Auth checks.
- Exact equivalence stays user-reviewed per visit; publisher promo text is retained but there is no universal structured promo classifier.
- Price history remains device-local and grows only after explicit watch checks. Three observed dates are needed for a lowest-observed comparison; missing weeks do not imply sale cycles.
- Broader accessibility certification, real external Google/email completion, and custom WAF configuration remain unverified.
- The governor covers retailer HTML reservations, not all Supabase/Vercel traffic. Billing dashboards were not available; no unlimited or DDoS-proof claim is made.
