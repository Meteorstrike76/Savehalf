# Weekly-plan export evidence (U08 / U02)

The downloaded text now carries an explicit budget-at-planning verdict, known whole-pack checkout subtotal, missing-price count, pantry deductions, recipe times/servings/equipment and numbered instructions. Product rows retain their original last-observed timestamps in UTC; export time is separately labelled. Exporting does not revalidate prices or prove current stock, yield compatibility or affordability at purchase time.

No-priced-match, unknown pack cost and already-owned ingredients have separate wording. Unsafe or credential-bearing links are omitted, malformed timestamps remain unknown, and control characters in product titles cannot inject new export lines. A failed browser download leaves the on-screen week available with a retry message.

This is a text-export slice, not shopping-list account transfer, printing, new recipe content, price retrieval or source recovery. It does not overlap the files changed in active review PR #31 at inspection. All pricing arithmetic, RLS/MFA and source admission remain unchanged.

Validation covers priced/incomplete/over-budget exports, original timestamps, pantry quantities, missing matches, invalid links/dates and multiline titles. The production-bundle UI regression captures the actual download Blob, checks seven days and unknown-budget wording, verifies no new network calls, and simulates download failure. Required CI gates merge. Roll back by reverting the slice's merge and redeploying; no schema or persisted state changes.
