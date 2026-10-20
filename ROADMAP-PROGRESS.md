# SaveHalf roadmap progress — 13 October 2026

This is a conservative release ledger, not a claim that earlier functionality is absent. All other rows need evidence against the detailed roadmap acceptance criteria before being marked complete. No paid features, AI APIs, paid proxies or billing activation were introduced.

## 13 October release

Implemented chosen-time Radar snoozes (device timezone, maximum seven days), individual restore controls, headline exclusions, five offer-condition filters with explicit heuristic labels, and JSON price-evidence downloads from product details and comparisons. Empty Radar states now distinguish unavailable snapshots, failed sources and filtered results. Refresh calls are guarded against overlap and late updates after closing the panel. Existing personal backups remain compatible; new preferences are validated and included in the same privacy controls.

Verification: 29 unit tests, three affected UI scripts, type checking, lint and production build pass. These are frontend changes with no additional data requests for the new controls. Collection schedules, OAuth configuration and backend services were not changed; no extra products were imported.

## Previous release verification

62 unit/parser/data tests and 11 UI scripts passed. Type checking, lint and production build passed. Auth tests are mocked and do not establish successful real Google OAuth. Direct Coles parsing and Woolworths HTTP 403 remain unresolved. OzBargain audit gaps were 14.97–15.03 minutes. No additional products were imported during this release.

Additional shipped improvements: price evidence and SKU references; basket freshness completeness; private offer outcomes; quoted phrase search; private-state backup validation; aborted stale catalogue reads and duplicate load-more prevention.

## Next dependencies

1. Audit existing implementation against remaining roadmap rows.
2. Resolve permitted retailer data access and adapter fixtures before enabling more sources.
3. Add features requiring product history only after reliable observations exist.
4. Community features require a moderation workflow. External OAuth configuration requires the authorised Google Cloud configuration; never request a client secret in chat.

| ID | Proposal | Status | Evidence or remaining work |
|---|---|---|---|
| F001 | Shopping missions | Pending audit / implementation | Not certified complete by this release. |
| F002 | Brand follow lists | Partial | Word follows on Radar only; catalogue brand matching remains |
| F003 | Brand exclusion profiles | Partial | Radar title exclusions added; separate shopping-mission profiles remain |
| F004 | Topic collections | Pending audit / implementation | Not certified complete by this release. |
| F005 | Catch-up inbox | Implemented in this release | Radar acknowledged-snapshot catch-up |
| F006 | Read-later snooze | Implemented | Chosen device-local time within seven days; 24-hour default; individual restore |
| F007 | Exact phrase search | Pending audit / implementation | Not certified complete by this release. |
| F008 | Search synonym dictionary | Pending audit / implementation | Not certified complete by this release. |
| F009 | Offer-type preference | Partial | Five headline-based condition filters; verified structured eligibility and shelf-price classification remain |
| F010 | Personal deal explanation | Pending audit / implementation | Not certified complete by this release. |
| F011 | Delivered-cost calculator | Implemented in this release | Delivered-cost worksheet |
| F012 | Refundable deposit display | Pending audit / implementation | Not certified complete by this release. |
| F013 | Loyalty eligibility simulator | Pending audit / implementation | Not certified complete by this release. |
| F014 | Multibuy break-even | Implemented in this release | Whole-bundle outlay comparison |
| F015 | Coupon threshold calculator | Implemented in this release | Coupon threshold worksheet |
| F016 | Subscription first-order comparison | Pending audit / implementation | Not certified complete by this release. |
| F017 | Cashback separation | Implemented in this release | Conditional cashback separated from payable now |
| F018 | Gift-card effective-cost worksheet | Implemented in this release | Gift-card worksheet |
| F019 | Pack-size change detector | Pending audit / implementation | Not certified complete by this release. |
| F020 | Price evidence export | Implemented | Product and comparison JSON includes selected observations, source dates and explicit history gaps |
| F021 | Cheapest single-store basket | Pending audit / implementation | Not certified complete by this release. |
| F022 | Two-store basket solver | Pending audit / implementation | Not certified complete by this release. |
| F023 | Store-count constraint | Pending audit / implementation | Not certified complete by this release. |
| F024 | Substitution permission per item | Pending audit / implementation | Not certified complete by this release. |
| F025 | Brand versus own-label worksheet | Pending audit / implementation | Not certified complete by this release. |
| F026 | Checkout constraint warnings | Pending audit / implementation | Not certified complete by this release. |
| F027 | Stock-up ceiling | Pending audit / implementation | Not certified complete by this release. |
| F028 | Freezer-space allowance | Pending audit / implementation | Not certified complete by this release. |
| F029 | Nonessential item parking | Pending audit / implementation | Not certified complete by this release. |
| F030 | Basket completeness score | Pending audit / implementation | Not certified complete by this release. |
| F031 | Consumption-rate diary | Pending audit / implementation | Not certified complete by this release. |
| F032 | Refill window | Pending audit / implementation | Not certified complete by this release. |
| F033 | Durable-goods replacement diary | Pending audit / implementation | Not certified complete by this release. |
| F034 | Warranty reminder export | Pending audit / implementation | Not certified complete by this release. |
| F035 | Shared versus personal pantry zones | Pending audit / implementation | Not certified complete by this release. |
| F036 | Freezer portion inventory | Pending audit / implementation | Not certified complete by this release. |
| F037 | Meal rotation board | Pending audit / implementation | Not certified complete by this release. |
| F038 | Cooking equipment filter | Pending audit / implementation | Not certified complete by this release. |
| F039 | Preparation-time budget | Pending audit / implementation | Not certified complete by this release. |
| F040 | No-shop day planner | Pending audit / implementation | Not certified complete by this release. |
| F041 | Lunch by suburb and budget | Pending audit / implementation | Not certified complete by this release. |
| F042 | Workweek lunch board | Implemented in this release | Five weekday lunch choices, dates and budget |
| F043 | Takeaway versus dine-in | Pending audit / implementation | Not certified complete by this release. |
| F044 | Group meal affordability | Pending audit / implementation | Not certified complete by this release. |
| F045 | Solo-friendly offers | Pending audit / implementation | Not certified complete by this release. |
| F046 | Required-drink disclosure | Pending audit / implementation | Not certified complete by this release. |
| F047 | Happy-hour window view | Pending audit / implementation | Not certified complete by this release. |
| F048 | Public-holiday exclusion | Pending audit / implementation | Not certified complete by this release. |
| F049 | Lunch corridor shortlist | Pending audit / implementation | Not certified complete by this release. |
| F050 | Publisher menu-change digest | Pending audit / implementation | Not certified complete by this release. |
| F051 | Exact model search | Pending audit / implementation | Not certified complete by this release. |
| F052 | Refurbished condition filters | Pending audit / implementation | Not certified complete by this release. |
| F053 | Warranty origin filter | Pending audit / implementation | Not certified complete by this release. |
| F054 | Australian versus import stock | Pending audit / implementation | Not certified complete by this release. |
| F055 | Accessory completeness checklist | Pending audit / implementation | Not certified complete by this release. |
| F056 | Device compatibility checklist | Pending audit / implementation | Not certified complete by this release. |
| F057 | Storage configuration comparison | Pending audit / implementation | Not certified complete by this release. |
| F058 | Seller identity comparison | Pending audit / implementation | Not certified complete by this release. |
| F059 | Energy-cost worksheet | Implemented in this release | Annual energy scenario |
| F060 | Repair-versus-replace worksheet | Partial | Upfront repair/replacement cost; warranty comparison remains |
| F061 | Size-specific follows | Pending audit / implementation | Not certified complete by this release. |
| F062 | Size availability matrix | Pending audit / implementation | Not certified complete by this release. |
| F063 | Footwear sizing reference | Pending audit / implementation | Not certified complete by this release. |
| F064 | Material preference filter | Pending audit / implementation | Not certified complete by this release. |
| F065 | Care-cost notes | Pending audit / implementation | Not certified complete by this release. |
| F066 | Return-condition summary | Pending audit / implementation | Not certified complete by this release. |
| F067 | Room dimension notebook | Pending audit / implementation | Not certified complete by this release. |
| F068 | Furniture fit checker | Pending audit / implementation | Not certified complete by this release. |
| F069 | Assembly requirements | Pending audit / implementation | Not certified complete by this release. |
| F070 | Set-versus-piece pricing | Pending audit / implementation | Not certified complete by this release. |
| F071 | Structured offer submission | Pending audit / implementation | Not certified complete by this release. |
| F072 | Branch-specific availability reports | Pending audit / implementation | Not certified complete by this release. |
| F073 | Duplicate submission warning | Pending audit / implementation | Not certified complete by this release. |
| F074 | Offer correction history | Pending audit / implementation | Not certified complete by this release. |
| F075 | Publisher removal request | Pending audit / implementation | Not certified complete by this release. |
| F076 | Helpful-condition tips | Pending audit / implementation | Not certified complete by this release. |
| F077 | Offer outcome labels | Pending audit / implementation | Not certified complete by this release. |
| F078 | Private merchant notes | Pending audit / implementation | Not certified complete by this release. |
| F079 | Contributor guidelines preview | Pending audit / implementation | Not certified complete by this release. |
| F080 | Correction notification inbox | Pending audit / implementation | Not certified complete by this release. |
| F081 | Offer evidence card | Pending audit / implementation | Not certified complete by this release. |
| F082 | Coverage gap calendar | Pending audit / implementation | Not certified complete by this release. |
| F083 | Regional coverage selector | Pending audit / implementation | Not certified complete by this release. |
| F084 | Inclusion-cost breakdown | Pending audit / implementation | Not certified complete by this release. |
| F085 | Reason for exclusion | Pending audit / implementation | Not certified complete by this release. |
| F086 | Freshness preference | Pending audit / implementation | Not certified complete by this release. |
| F087 | Source-change timeline | Pending audit / implementation | Not certified complete by this release. |
| F088 | Price rounding disclosure | Pending audit / implementation | Not certified complete by this release. |
| F089 | Market coverage statement | Pending audit / implementation | Not certified complete by this release. |
| F090 | Independent source comparison | Pending audit / implementation | Not certified complete by this release. |
| F091 | Personal local digest | Pending audit / implementation | Not certified complete by this release. |
| F092 | Bring-your-own list import | Pending audit / implementation | Not certified complete by this release. |
| F093 | Clipboard shopping capture | Pending audit / implementation | Not certified complete by this release. |
| F094 | Offline catalogue pack | Pending audit / implementation | Not certified complete by this release. |
| F095 | List merge preview | Pending audit / implementation | Not certified complete by this release. |
| F096 | Budget goal milestones | Pending audit / implementation | Not certified complete by this release. |
| F097 | Weekly reflection card | Pending audit / implementation | Not certified complete by this release. |
| F098 | Personal data expiry settings | Pending audit / implementation | Not certified complete by this release. |
| F099 | Saved-work recovery prompt | Pending audit / implementation | Not certified complete by this release. |
| F100 | Public curated deal digest | Pending audit / implementation | Not certified complete by this release. |
| F101 | Office essentials hub | Pending audit / implementation | Not certified complete by this release. |
| F102 | Pet essentials hub | Pending audit / implementation | Not certified complete by this release. |
| F103 | Baby essentials hub | Pending audit / implementation | Not certified complete by this release. |
| F104 | Cleaning refill hub | Pending audit / implementation | Not certified complete by this release. |
| F105 | Seasonal shopping checklist | Pending audit / implementation | Not certified complete by this release. |
| F106 | Community market directory | Pending audit / implementation | Not certified complete by this release. |
| F107 | Library-of-things directory | Pending audit / implementation | Not certified complete by this release. |
| F108 | Repair cafe directory | Pending audit / implementation | Not certified complete by this release. |
| F109 | Group purchase worksheet | Pending audit / implementation | Not certified complete by this release. |
| F110 | Retailer feed contribution portal | Pending audit / implementation | Not certified complete by this release. |
| U001 | Radar grocery taxonomy | Pending audit / implementation | Not certified complete by this release. |
| U002 | Finish pending Radar patch | Pending audit / implementation | Not certified complete by this release. |
| U003 | No misleading empty state | Partial | Radar distinguishes unavailable, source-failed and filtered states; broader source completeness audit remains |
| U004 | Unique variant identity | Pending audit / implementation | Not certified complete by this release. |
| U005 | Explicit comparison universe | Pending audit / implementation | Not certified complete by this release. |
| U006 | Whole-basket unknown pricing | Pending audit / implementation | Not certified complete by this release. |
| U007 | Promotion boundary checks | Pending audit / implementation | Not certified complete by this release. |
| U008 | Observed date integrity | Pending audit / implementation | Not certified complete by this release. |
| U009 | Catalogue pagination validity | Pending audit / implementation | Not certified complete by this release. |
| U010 | Release truthfulness checklist | Pending audit / implementation | Not certified complete by this release. |
| U011 | Adaptive change-based intervals | Pending audit / implementation | Not certified complete by this release. |
| U012 | Publisher cadence profiles | Pending audit / implementation | Not certified complete by this release. |
| U013 | Retry-After support | Pending audit / implementation | Not certified complete by this release. |
| U014 | Per-host concurrency locks | Pending audit / implementation | Not certified complete by this release. |
| U015 | Job lease fencing | Pending audit / implementation | Not certified complete by this release. |
| U016 | Idempotent run identifiers | Pending audit / implementation | Not certified complete by this release. |
| U017 | Last-good partial checkpoints | Pending audit / implementation | Not certified complete by this release. |
| U018 | Priority budget reservations | Pending audit / implementation | Not certified complete by this release. |
| U019 | Manual-run cooldown | Pending audit / implementation | Not certified complete by this release. |
| U020 | Scheduler execution audit | Pending audit / implementation | Not certified complete by this release. |
| U021 | Versioned parser contracts | Pending audit / implementation | Not certified complete by this release. |
| U022 | Structured-data first policy | Pending audit / implementation | Not certified complete by this release. |
| U023 | Currency enforcement | Pending audit / implementation | Not certified complete by this release. |
| U024 | Minimum purchase extraction | Pending audit / implementation | Not certified complete by this release. |
| U025 | Source availability semantics | Pending audit / implementation | Not certified complete by this release. |
| U026 | Pack-size parser confidence | Pending audit / implementation | Not certified complete by this release. |
| U027 | GTIN checksum validation | Pending audit / implementation | Not certified complete by this release. |
| U028 | Marketplace seller schema | Pending audit / implementation | Not certified complete by this release. |
| U029 | Source date versus ingest date | Pending audit / implementation | Not certified complete by this release. |
| U030 | Malformed-record quarantine | Pending audit / implementation | Not certified complete by this release. |
| U031 | Image hostname allowlist | Pending audit / implementation | Not certified complete by this release. |
| U032 | Image placeholder detection | Pending audit / implementation | Not certified complete by this release. |
| U033 | Responsive source images | Pending audit / implementation | Not certified complete by this release. |
| U034 | Bounded broken-image checks | Pending audit / implementation | Not certified complete by this release. |
| U035 | Image failure memory | Pending audit / implementation | Not certified complete by this release. |
| U036 | Variant image association | Pending audit / implementation | Not certified complete by this release. |
| U037 | Aspect-ratio stability | Pending audit / implementation | Not certified complete by this release. |
| U038 | Image provenance details | Pending audit / implementation | Not certified complete by this release. |
| U039 | Redirect-chain validation | Pending audit / implementation | Not certified complete by this release. |
| U040 | Accessible fallback consistency | Pending audit / implementation | Not certified complete by this release. |
| U041 | Compact public snapshots | Pending audit / implementation | Not certified complete by this release. |
| U042 | Snapshot sharding | Pending audit / implementation | Not certified complete by this release. |
| U043 | Changed-row upserts | Pending audit / implementation | Not certified complete by this release. |
| U044 | Stable cursor pagination | Pending audit / implementation | Not certified complete by this release. |
| U045 | Query plan review | Pending audit / implementation | Not certified complete by this release. |
| U046 | Bounded historical aggregates | Pending audit / implementation | Not certified complete by this release. |
| U047 | Read budget accounting | Pending audit / implementation | Not certified complete by this release. |
| U048 | Quota warning thresholds | Pending audit / implementation | Not certified complete by this release. |
| U049 | Database growth forecast | Pending audit / implementation | Not certified complete by this release. |
| U050 | Storage compaction review | Pending audit / implementation | Not certified complete by this release. |
| U051 | Public-write route inventory | Pending audit / implementation | Not certified complete by this release. |
| U052 | Owner-isolation regression suite | Pending audit / implementation | Not certified complete by this release. |
| U053 | Auth return allowlist audit | Pending audit / implementation | Not certified complete by this release. |
| U054 | Safe resource fetching | Pending audit / implementation | Not certified complete by this release. |
| U055 | Request body ceilings | Pending audit / implementation | Not certified complete by this release. |
| U056 | Replay-resistant ingestion | Pending audit / implementation | Not certified complete by this release. |
| U057 | Turnstile pilot | Pending audit / implementation | Not certified complete by this release. |
| U058 | Content Security Policy rollout | Pending audit / implementation | Not certified complete by this release. |
| U059 | Secret exposure gate | Pending audit / implementation | Not certified complete by this release. |
| U060 | Origin bypass review | Pending audit / implementation | Not certified complete by this release. |
| U061 | Real Google callback test | Pending audit / implementation | Not certified complete by this release. |
| U062 | Email confirmation journey | Pending audit / implementation | Not certified complete by this release. |
| U063 | Keyboard autofill coverage | Pending audit / implementation | Not certified complete by this release. |
| U064 | Session expiry recovery | Pending audit / implementation | Not certified complete by this release. |
| U065 | Account deletion clarity | Pending audit / implementation | Not certified complete by this release. |
| U066 | Preference sync conflicts | Pending audit / implementation | Not certified complete by this release. |
| U067 | Backup version migrations | Pending audit / implementation | Not certified complete by this release. |
| U068 | Import rollback guarantees | Pending audit / implementation | Not certified complete by this release. |
| U069 | Shared-device mode | Pending audit / implementation | Not certified complete by this release. |
| U070 | Data inventory accuracy | Pending audit / implementation | Not certified complete by this release. |
| U071 | Feature navigation hierarchy | Pending audit / implementation | Not certified complete by this release. |
| U072 | Accessible modal background | Implemented in this release | Portal modal background inert and screen-reader isolation |
| U073 | Long-dialog navigation | Pending audit / implementation | Not certified complete by this release. |
| U074 | Stable list position | Pending audit / implementation | Not certified complete by this release. |
| U075 | Mobile filter drawer | Pending audit / implementation | Not certified complete by this release. |
| U076 | Screen-reader result announcements | Pending audit / implementation | Not certified complete by this release. |
| U077 | Zoom and reflow audit | Pending audit / implementation | Not certified complete by this release. |
| U078 | Touch target audit | Pending audit / implementation | Not certified complete by this release. |
| U079 | Motion preference consistency | Pending audit / implementation | Not certified complete by this release. |
| U080 | Semantic colour audit | Pending audit / implementation | Not certified complete by this release. |
| U081 | Route-level code budgets | Pending audit / implementation | Not certified complete by this release. |
| U082 | Hidden-tab timer suspension | Pending audit / implementation | Not certified complete by this release. |
| U083 | Slow-network recovery | Pending audit / implementation | Not certified complete by this release. |
| U084 | Stale response cancellation | Pending audit / implementation | Not certified complete by this release. |
| U085 | Cache ownership boundaries | Pending audit / implementation | Not certified complete by this release. |
| U086 | Service-worker upgrade testing | Pending audit / implementation | Not certified complete by this release. |
| U087 | Offline scope labels | Pending audit / implementation | Not certified complete by this release. |
| U088 | Cache eviction limits | Pending audit / implementation | Not certified complete by this release. |
| U089 | Third-party failure isolation | Pending audit / implementation | Not certified complete by this release. |
| U090 | Core Web Vitals sampling | Pending audit / implementation | Not certified complete by this release. |
| U091 | Single release manifest | Pending audit / implementation | Not certified complete by this release. |
| U092 | Migration reproducibility | Pending audit / implementation | Not certified complete by this release. |
| U093 | Source archive freshness | Pending audit / implementation | Not certified complete by this release. |
| U094 | Public smoke checks | Pending audit / implementation | Not certified complete by this release. |
| U095 | Rollback drill | Pending audit / implementation | Not certified complete by this release. |
| U096 | Read-only incident mode | Pending audit / implementation | Not certified complete by this release. |
| U097 | Maintainer runbook | Pending audit / implementation | Not certified complete by this release. |
| U098 | Restore exercise | Pending audit / implementation | Not certified complete by this release. |
| U099 | Failed-job triage queue | Pending audit / implementation | Not certified complete by this release. |
| U100 | Log retention approval tracking | Pending audit / implementation | Not certified complete by this release. |
| U101 | Golden source fixtures | Pending audit / implementation | Not certified complete by this release. |
| U102 | Property-based price tests | Pending audit / implementation | Not certified complete by this release. |
| U103 | Time-zone transition tests | Pending audit / implementation | Not certified complete by this release. |
| U104 | Accessibility regression gate | Pending audit / implementation | Not certified complete by this release. |
| U105 | Dependency lockfile discipline | Pending audit / implementation | Not certified complete by this release. |
| U106 | Source permission register | Pending audit / implementation | Not certified complete by this release. |
| U107 | Maintainer effort budget | Pending audit / implementation | Not certified complete by this release. |
| U108 | Feature deprecation process | Pending audit / implementation | Not certified complete by this release. |
| U109 | Outcome-based product review | Pending audit / implementation | Not certified complete by this release. |
| U110 | No-cost architecture gate | Pending audit / implementation | Not certified complete by this release. |
