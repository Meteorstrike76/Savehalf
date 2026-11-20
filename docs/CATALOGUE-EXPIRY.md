# Uploaded catalogue visibility

The published offer end date now controls the visibility of dated PDF imports, replacing the unconditional 24-hour review TTL. No re-upload, daily timestamp update, server job or paid service is needed. The shared feed rechecks its clock every 30 seconds and when page visibility changes; reopening the site also evaluates dates immediately. Consequently an open tab removes expired offers within the next timer tick (normally at most 30 seconds; background browsers may throttle timers until the visibility refresh).

Date-only ranges include the full published start/end calendar days. NT editions use Australia/Darwin; VIC editions use Australia/Melbourne; NSW and unverified/national editions use Australia/Sydney. Unknown-end offers retain the existing 24-hour review limit. Invalid dates, inverted ranges, future review timestamps and ALDI PDF records remain excluded. Original review timestamps, price evidence and regional/advertisement labels remain unchanged. This does not change database product freshness or the separate reviewed-import feed.

## Date evidence checked from the supplied PDF

Source: ALL_CATALOGUES_COMBINED.pdf, SHA-256 e13007dbfb045a8bac82fc6a0c80489257245152823cc68dc029da54d04d1bc4 (134 pages).

| Source pages | Published dates | Rows |
|---|---|---:|
| Coles page 1 header | 18–24 Nov 2026, NT | 54 |
| IGA page 34 header (VIC) and page 45 footer (NSW) | 18–24 Nov 2026 | 58 |
| IKEA page 122 cover | 5–30 Nov 2026 | 6 |
| Officeworks page 128 footer | 16–30 Nov 2026, subject to product-specific dates | 7 |
| Woolworths pages 8–14 | Start 18 Nov; end not shown in the supplied extract | 22 |

Officeworks page 128 overrides: Lenovo 24-inch monitor, Lenovo IdeaPad Slim 3 and Samsung Galaxy A17 end 2 Dec 2026; PAG Ash chair ends 4 Dec 2026. Canon printer, Lenovo tablet and Samsung TV end 30 Nov 2026. These printed per-product dates take precedence over the general catalogue footer.

On 21 Nov 2026, 125 dated records are eligible under the new rule, and the 22 unknown-end Woolworths records remain outside the 24-hour window. No unknown end date has been invented. Partial coverage and store-specific availability still apply.

## Woolworths weekly-cycle correction

The owner confirmed the shared Wednesday–Tuesday refresh cycle. Woolworths' official specials terms also state weekly specials end at midnight AEDT each Tuesday: https://www.woolworths.com.au/shop/browse/specials . For the supplied Victorian pages starting Wednesday 18 Nov 2026, the 22 records now use Tuesday 24 Nov 2026 as a weekly-cycle inferred end. Cards say “Expected until” and retain a basis note; this date is not presented as printed on those PDF pages. No review timestamps were renewed. The current uploaded batch therefore has 147 eligible dated/cycle-dated offers on 21 Nov.
