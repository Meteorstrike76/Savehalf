# SaveHalf: 50 practical UX upgrades

Prepared 19 November 2026. Scope: the existing React/Vercel/Supabase site; free-tier services only.

This is a phased plan, not a claim that 50 changes are live. Items 1–20 belong to this release. Items 21–50 are the next backlog, with explicit completion checks. The first release improves the existing shared grid without changing product evidence, source admission, collection schedules, database schema, auth or billing.

## Release 1 — browsing and card usability

| # | Upgrade | Completion check |
|---|---|---|
| 1 | Complete removable filter summary | Product type, region, retailer, source, minimum/maximum price and advanced filters can be removed individually. |
| 2 | Reliable reset | Clear all restores all stores, both sources, all types/regions, default sorting and removes local refinements. Card density remains the visitor's preference. |
| 3 | Price-range validation | Negative, non-finite, over-$5,000 and inverted ranges show an associated accessible error; invalid ranges do not display misleading matches. |
| 4 | One-tap budget limits | Up to $5/$10/$20 presets toggle and clear a conflicting minimum. Caps are explicitly per product. |
| 5 | Source selector | Visitors can choose both sources, collected products or catalogue advertisements; ads-only does not fetch collected pages. |
| 6 | Shared/saved filter fidelity | Product type, region, extended retailer, source and retailer-mix mode survive validated share links and saved searches. Existing older links still work. |
| 7 | Visible card-density switch | Comfortable/Compact is available alongside filters and affects both card types. |
| 8 | Remember card density | Density survives reload on the same device; blocked storage does not crash browsing. |
| 9 | Keyboard search shortcuts | / focuses search outside forms/dialogs; Escape clears only the focused product search. |
| 10 | Short, expandable source guidance | Detailed counts/sorting guidance sits behind a keyboard-accessible disclosure, with loaded-page and region limits explained. |
| 11 | Explain excluded catalogue ads | Verification/freshness/photo/unit-price constraints explain why ads are omitted. Advertisements never become verified reductions. |
| 12 | Put primary results first | Provider snapshots move below the shared grid and its pagination, while retaining their separate labels/counts. |
| 13 | Direct product-grid shortcut | A keyboard-accessible link skips filter controls and targets the result summary. |
| 14 | Announce result changes | The result summary has a polite, atomic live status without moving keyboard focus and labels collected totals as before local filters. |
| 15 | Recover from an empty selection | Empty states offer a direct clear-and-browse-products action; missing loaded matches do not imply complete retailer coverage. |
| 16 | Retry failed collection reads | A retry action reissues the existing bounded read without reloading the page or discarding filters. |
| 17 | Readable catalogue dates and links | End dates use Australian month names; catalogue links announce new tabs and their specific product. Unknown dates remain unknown. |
| 18 | Clear card and save semantics | Cards have retailer/product accessible names; save hearts expose pressed state. No fabricated product pictures or claims. |
| 19 | Edit comparisons in place | Each comparison row can be removed without closing the dialog; an empty state and table caption explain the result. |
| 20 | Mobile filter and card polish | Sources stack, controls have generous targets, prices wrap, search uses 16px text, metadata is readable and compact images actually shrink. |

Release gate: typecheck, lint, build, application tests, UI regressions, GitHub validation/audit, preview visual checks, and deployment verification. Use exact commit SHAs for merge/deployment checks. No production data writes are required.

## Release 2 — search and category discovery

| # | Priority | Upgrade | Completion check |
|---|---|---|---|
| 21 | High | Product-type filtering across collected pages | Server-side classification/filtering has verified category mappings and correct counts; a sweet on page 3 can be found without loading pages 1–2 first. Requires a separately reviewed database change. |
| 22 | High | Unified count terminology | Every count explicitly distinguishes matching, loaded, shown and unavailable; tests include mixed providers and local filters. |
| 23 | High | Subcategory taxonomy | Bakery, fruit, vegetables, poultry, seafood, confectionery and ready meals use a reviewed hierarchy with an unclassified fallback. |
| 24 | High | Review inferred category mistakes | Admin can correct a title-derived label; corrections are validated and audited rather than silently overwriting evidence. |
| 25 | Medium | Multi-select product types | OR within types and AND across other facets are explained; removable chips and share links match visible results. |
| 26 | Medium | Optional device-local recent searches | Explicit enable/clear controls, bounded history and no server transmission of raw queries. |
| 27 | Medium | Search spelling assistance | Suggestions never replace the entered query automatically; selecting a suggestion is explicit. |
| 28 | Medium | Pack-size search tokens | Queries such as 500g/0.5kg match equivalent written sizes without claiming product equivalence. |
| 29 | Medium | Region-first catalogue selection | An optional remembered edition is clearly an edition filter, not a local stock guarantee; no GPS required. |
| 30 | Medium | Search URL navigation | Browser Back/Forward restores validated filters without serialising account state or breaking auth callback URLs. |

## Release 3 — product evidence and imagery

| # | Priority | Upgrade | Completion check |
|---|---|---|---|
| 31 | High | Product-specific catalogue crops | Review remaining whole-page placeholders and oversized multi-product crops; each approved crop points to its source page. |
| 32 | High | Catalogue image zoom dialog | Accessible zoom, Escape, focus restoration and full-page source fallback; no distortion or unreadable price evidence. |
| 33 | High | Image quality audit | Detect broken URLs and tiny/blank crops in CI with bounded checks; don't re-scrape blocked retailers. |
| 34 | High | Reference-price wording review | All actual card/detail/comparison components qualify the price basis consistently; preserve existing PR #31 scope and avoid duplicate/conflicting changes. |
| 35 | Medium | Source and freshness legend | A compact common legend explains collected, advertised, reviewed and sample states; labels remain visible on cards. |
| 36 | Medium | Offer expiry near the price | Show source-backed end dates and unknowns consistently across collected and advertised records; no invented urgency. |
| 37 | Medium | Unit-price presentation audit | Declared/estimated units remain distinct; incompatible bases never enter a single cheapest ranking. |
| 38 | Medium | Title and variant hierarchy | Separate supported pack/model details without inventing missing brand or variant fields. |
| 39 | Medium | Better missing-photo illustration mapping | Reviewed category SVG fallbacks are clearly labelled; image failure must never masquerade as a retailer photo. |
| 40 | Medium | Catalogue page navigation | A catalogue detail panel links product crop, original page and edition context with accessible navigation. |

## Release 4 — personal shopping and accessibility

| # | Priority | Upgrade | Completion check |
|---|---|---|---|
| 41 | High | Save/remove feedback with undo | A bounded undo works for device and account saves, respects delayed responses and RLS, and never duplicates favourites. |
| 42 | High | Bulk shopping-list review | Visitors review selected products and quantities before applying changes; stale observations stay labelled. |
| 43 | High | Safer list substitutions | Only user-confirmed substitutions; prices, units and retailer changes shown before replacement. |
| 44 | High | Saved-find availability summary | Identify expired/missing records honestly while keeping the saved reference accessible. |
| 45 | Medium | Comparison mobile layout | A stacked alternative or clear horizontal-scroll cue preserves column/row relationships at 320px. |
| 46 | Medium | Planner-to-list handoff | Review recipes, servings, matched prices and unmatched estimates before updating the list. |
| 47 | High | End-to-end keyboard journey | Browse, filter, details, compare, save and list flows pass keyboard/focus tests with no trap or obscured focus. |
| 48 | High | Mobile accessibility matrix | Test 320/375/768px, 200% text, reduced motion, contrast and touch targets across browsing, dialogs and planner. |
| 49 | Medium | Performance budget | Track actual mobile LCP/CLS and image bytes against a committed baseline; add responsive crops only after source/crop checks. |
| 50 | Medium | Consent-respecting usability dashboard | Aggregate zero-result and funnel events only under existing consent settings; avoid raw searches, identity leakage and new paid analytics. |

## Execution and contingency rules

1. Ship one coherent release after checks pass; keep follow-ups out of this release unless a failing check requires them.
2. No billing activation, new paid dependencies, new service accounts or broad collector runs. No new scraping or source-use assumptions.
3. If category completeness needs a migration, prepare a separately reviewed change; never compensate with invented counts or automatic uncontrolled pagination.
4. If deployment fails, retain the last ready production release, fix on the branch, then repeat only affected checks plus the release gate.
5. If an image is unsupported or low quality, retain a clearly labelled illustration and original source link until a verified crop/photo is available.
6. If a new interaction conflicts with accessibility or existing shopping flows, fix it before merge. Do not mark future roadmap rows as completed.

The GitHub PR contains the implementation and check results for items 1–20. Items 21–50 are planned, not activated jobs or promises of automatic completion.
