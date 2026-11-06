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

## Integration verification

PR #29 was merged and its additive migration applied. Post-installation checks
confirmed security invoker, an empty search path, the five-second timeout and
execute grants limited to postgres/anon/authenticated/service_role. Anonymous
API comparisons matched for unit sorting (24), a price range (2), a search (0)
and no-match search (0); unfiltered aggregation matched current_deals (24).
These are timestamped observations, not guaranteed future coverage.

The frontend now calls catalogue_facets with stores, text, min/max price, sale,
discount and unit-sort mode. It excludes the selected category from the cache
key so sibling totals remain visible. Text requests debounce for 250ms; results
are shared for up to two minutes. Snapshot keys and effect/request guards prevent
old-filter totals from appearing while a newer request loads or resolves.
Expired/failing reads remain unknown; empty successful responses are zero.

Local integration checks passed for search/price/discount parameters, full totals
above one page, sibling reuse, expiry/failure/recovery, a delayed stale response,
and empty-versus-unknown display. Typecheck, lint and build passed. Required CI
and production verification remain release gates for this frontend change.
Expanded departments, source recovery and provider deduplication remain pending.
