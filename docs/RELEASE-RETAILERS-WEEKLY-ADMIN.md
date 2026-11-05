# Retailer, weekly dinner planner and administration upgrade

5 November 2026. No schema changes, new services, scheduled jobs, paid APIs or provider-key changes.

## Retailers
- Added a Care, beauty & office section and an in-page shortcut.
- Separate Chemist Warehouse/Priceline store filters with cached, 12-row provider pagination and shared title/price filters. Optional category override helps when the main grocery category would otherwise hide pharmacy rows.
- Officeworks has a clearly labelled official clearance handoff. It has no admitted priced catalogue or stock guarantee.
- Existing directory permission gates remain intact. Pharmacy snapshots remain separate from direct catalogue favourites, basket estimates and history; this release does not misrepresent them as direct products.
- Read-only live check found 25 retained rows per pharmacy, last retrieved 29 October; zero fresh rows on 5 November. No timestamp was refreshed and no stale price was republished. WhichGrocer is unavailable in this session; a fresh authorised provider import is still required. Existing RLS/freshness rules are unchanged.

## Assistant weekly dinners
Choose “Plan a week of meals,” or ask for weekly meals with a budget. Recognised weekly-meal requests open the built-in workflow without an inference request; a stated budget is prefilled. Budget presets: $50, $100, $150 plus custom >$0 to $5,000. Household size: 1–8; vegetarian or plant-ingredient recipes; quantity-based pantry input.

The result covers seven dinners only, not all food for a week. Seven authored recipes form the candidate set. Bounded beam search (24 candidates at each of seven stages) balances price completeness, affordability and variety. Repetition is permitted. It is not a market-wide cheapest-plan algorithm or nutritional assessment.

Combined ingredient quantities deduct pantry once before rounding whole-pack purchases. Current groceries come from the existing current_deals view, selected stores only, capped at 200 rows with a 12-second timeout and two-minute cache. No per-visitor model or retailer requests. Missing/expired prices cannot produce an “under budget” claim. Above-budget results are labelled. Show daily ingredients/steps, combined shopping list, dates, retailer links and text download. Delivery/travel/other meals are excluded. Dietary/allergen suitability and pack/drained yields require user verification.

## Administration
- MFA-gated overview, submission totals and direct collector health.
- Server-filtered title search, kind/retailer filters and oldest-first queue order. Existing 20-row pages and moderation RPC remain.
- Read-only paginated review audit log and explicit local JSON export. Actor identity is excluded from requests/exports.
- Overview rechecks site_is_admin(true). Audit and moderation remain protected by existing database RLS/MFA; frontend controls do not grant privileges.
- Refresh reads saved collection status; it does not run a scraper. No role editor, arbitrary SQL, one-click publication or destructive data controls added.
- Queue uses request sequencing to prevent late filter responses overwriting newer results.

## Verification and limits
Automated suite results are recorded in the release PR. Tests cover weekly arithmetic/constraints, stale/missing costs, no-inference weekly wizard, retailer selection/handoff, guest/MFA boundaries and audit reads. Existing unit/UI/collector suites remain release gates.
Local browser installation failed because the browser download was truncated. Do not claim local visual/mobile/axe verification from DOM tests. Live public browser smoke testing follows deployment where accessible. Real administrator sign-in and authenticator verification require the account holder; mock authenticated tests do not impersonate the owner.

Rollback: revert the release PR or restore the prior Vercel production deployment. No database migration reversal is required. Current data/roles/schedules are unchanged.
