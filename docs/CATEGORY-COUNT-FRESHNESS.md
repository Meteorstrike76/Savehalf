# Category-count freshness — 6 November 2026

Partial N03 delivery. Category aggregates previously remained in component
state indefinitely after their two-minute shared cache expired.

Snapshots now carry their original expiry time. Expired counts become unknown,
and returning to a visible tab or changing supported browsing filters refreshes
the aggregate. Requests remain shared and cached; there is no background polling
or per-category query. Failed refreshes show unknown rather than zero or stale
totals. Cleanup guards prevent obsolete requests updating an unmounted effect.

Validation: typecheck, lint, production build and the category-count UI regression
passed locally. The regression checks a multi-page total, expiry/focus refresh,
failure/recovery and unsupported filters without additional aggregate reads.
Required CI must pass before release.

This does not implement text/price/minimum-discount facets, taxonomy expansion,
or retailer recovery. Those remain pending. No database, RLS, MFA, admission or
provider changes. Rollback is a frontend revert to main before this change.
