# Weekly dinner variety — 6 November 2026

Scope: partial delivery of master-plan M02/N08. No new recipes, sources,
providers, permissions or database migrations are included.

The previous ranking penalised each additional unpriced ingredient so strongly
that an outage could produce seven copies of one dinner, even with other
eligible recipes. Repetition is now bounded before ranking: at most two uses
per recipe when at least four recipes qualify. For smaller pools the limit is
ceil(7 / eligible recipes), allowing seven dinners without violating time or
ingredient exclusions. The result and text export explain limited variety.
Repeated meals are separated where possible without changing quantities/costs.

Missing prices remain unknown. The new constraint can increase the known
subtotal or missing-ingredient count; it never establishes affordability from
incomplete costs. This remains a bounded shortlist, not a cheapest-week proof.

Validation covers empty/partial/full prices, seven slots, repetition caps,
adjacent repeats, combined ingredient quantities, one/two-recipe pools,
time/exclusion constraints and the production-bundle variety disclosure.
Existing pantry, whole-pack, stale-price and budget tests remain required.

Release gate: green Validate app and Rollout performance/accessibility on the
PR head, followed by READY production and live verification. Roll back the
frontend to c3f7c27db5a9d510ec29b6d9b3e7204de3354464 if required; no data
rollback is necessary.

Still pending: full filtered category counts and expanded source-backed
departments; retailer recovery/admission; authored recipe expansion and yield
compatibility; ingredient-balanced retrieval; meal swaps/locks/list transfer;
admin concurrent-review protection and remaining release evidence.
