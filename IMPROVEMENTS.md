# SaveHalf: 25 improvements using free services

No paid APIs, AI tokens, paid add-ons or billing upgrades. “Free” means within the existing free-tier quotas, not unlimited traffic. Built features and future work are distinguished below.

| # | Improvement | Free automation / implementation | State |
|---|---|---|---|
| 1 | Sydney Cheap Eats shortlist | Daily checks of allowlisted public menus and offers | Added |
| 2 | $5 / $10 / $15 food filters | Browser filtering of verified fixed prices | Added |
| 3 | Sydney area filter | Published venue areas, no geolocation API | Added |
| 4 | Weekly food offer calendar | Sydney weekday filter and published end dates | Added |
| 5 | Membership and time conditions | Display conditions alongside each offer | Added |
| 6 | Cheap snacks separate from meals | Bistro / weekly meal / restaurant discount filters | Added |
| 7 | Restaurant discount discovery | EatClub official links; bounded daily parser | Added; coverage depends on source parsing |
| 8 | Surplus food discovery | User-initiated IKEA / Too Good To Go links | Added |
| 9 | Venue directions | Public Google Maps links; no Maps API | Added |
| 10 | Automatic removal of stale food offers | Database read policy hides checks older than 48 hours | Added |
| 11 | Scrape health and freshness | Record success, changed layout and failure honestly | Added for food; existing for products |
| 12 | Price history charts | Record changed prices only; daily retention cleanup | Planned |
| 13 | Saved-item price drop indicators | Compare latest verified prices on next visit | Planned; no paid email/SMS |
| 14 | Better electronics and fashion coverage | Bounded category collectors and authorised imports | Partly built; blocked retailers need usable sources |
| 15 | Product equivalence matching | Rule-based brand/model/pack checks with confidence | Planned |
| 16 | Sort groceries by unit price | Extend existing weight/volume calculations into sorting | Planned |
| 17 | Household budget presets | Save weekly budget presets locally and calculate remaining spend | Planned |
| 18 | Cheapest basket split | Compare exact matched items across retailers | Planned; needs equivalent product data |
| 19 | Shopping-list import | Extend existing CSV export with validated local import | Planned |
| 20 | Wednesday offer change report | Compare verified weekly snapshots; never repeat guessed prices | Planned; needs usable Coles/Woolworths data |
| 21 | Browser deal notifications | Opt-in local notifications while site is open | Planned; background push needs separate assessment |
| 22 | Shareable filtered searches | Query-string filters and Web Share API | Planned |
| 23 | Offline saved shopping list | Service worker caches app shell; label saved prices | Planned |
| 24 | Broken link and expiry checks | Bounded scheduled status checks; hide bad links | Food expiry added; wider checks planned |
| 25 | Quota and reliability dashboard | SQL job counts, retention and request budgets | Source status existing; monthly quota summary planned |

## Current automation budget

Sydney collector: one daily invocation, up to three allowlisted HTTP page requests, up to 47 records (18 Friday meals, 9 bistro items, 20 restaurant discounts). Maximum two authorised runs per Sydney calendar day includes manual retries. At 31 days the ordinary schedule uses 31 function invocations and 93 upstream requests. Existing six retailer jobs continue separately. No requests per browsing user to source sites. Public reads are limited and RLS protected; these caps do not guarantee the entire site's usage stays below free quotas under arbitrary traffic.

Food collector schedule: 19:30 UTC daily (06:30 Sydney during daylight saving, 05:30 during standard time). The $5 IKEA Friday promotion expires 18 December 2026; it is never automatically extended. Failed pages do not refresh old records; recognised layout failures remove that source's listings until reviewed. Dynamic restaurant discounts never receive invented dollar prices. Confirm availability and redemption conditions with the venue/app before travelling.

## Next priorities

1. Store compact price changes, then show saved-item price drops on the next visit.
2. Add official menus from more Sydney suburbs once their prices and source access are verified.
3. Add shareable filters and offline shopping lists.
4. Improve equivalence matching before estimating a cheapest split basket.
5. Add monthly usage reporting before increasing collection frequency or volume.
