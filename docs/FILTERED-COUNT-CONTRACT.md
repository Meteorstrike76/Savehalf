# Filtered category count foundation — 6 November 2026

Adds `catalogue_facets(p_query,p_stores,p_sale,p_discount,p_max,p_min,p_sort)`.
It returns sibling category totals before pagination, without a selected-category
parameter. The caller fills missing departments with zero only after a successful
response. Errors/loading remain unknown. Provider snapshots are not included.

The SQL mirrors the current two result paths: text search, nonzero minimum price
or unit sorting use the range RPC's 0–5000 bounds; ordinary browsing preserves
its nullable maximum. Text matching uses the existing full-text, literal substring
and word-similarity rules. Store input is capped at seven. The function is stable,
security invoker, has an empty search path and a five-second statement timeout.
It reads the existing security-invoker `current_deals` view; no RLS, freshness,
promotion-week or source policies change. PUBLIC execute is revoked and only the
existing anon/authenticated/service roles receive execute permission.

Validation before deployment: ten read-only PostgreSQL fixture cases passed as
anon (151-row population, sale, search, literal percent, min/max price, discount,
empty/selected stores and unit sorting). The body also executed as anon against
current data and returned Fashion=24. No fixture rows were inserted. SQL fixture
test is in supabase/tests/catalogue_facets_readonly.sql; it is a manual database
test, not part of the Node CI runner.

Release gate: review and green required CI, apply the additive migration, then
verify the deployed function as anon against result totals and confirm privileges.
Do not claim filtered chips are delivered yet: frontend integration, complete
filter cache signatures, debouncing, obsolete-response tests and displayed-count
reconciliation remain pending. No new departments are introduced.

Rollback: existing clients do not call this function, so it can remain unused.
Reverting frontend integration later does not require removing this additive RPC.
Avoid changing the existing catalogue_counts/search_deals_range signatures.
