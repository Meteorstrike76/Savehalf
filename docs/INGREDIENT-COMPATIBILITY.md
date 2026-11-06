# Recipe product-form regression set (Q03 / M03 partial)

Basic ingredient words previously admitted processed products such as rice flour, rice paper and bean dips. The shared recipe classifier now rejects those forms before they reach single-meal or weekly whole-pack pricing. The catalogue itself remains unchanged; an excluded product stays browsable but cannot price an incompatible recipe requirement.

The fixture register in tests/ingredient-compatibility.test.cjs contains 20 positive commodity titles and 36 negative titles, including the previously observed creamed-rice, canned-spaghetti and chickpea errors. Fixtures are synthetic test inputs, not imported retailer data. Two integration checks enforce grocery-only admission and demonstrate that cheap rice flour cannot replace plain rice; without a compatible match the cost stays unknown.

This is a conservative title-based rejection layer, not proof of nutritional, allergy or preparation compatibility. It may exclude a specialised product whose full label would establish suitability. It does not resolve cooked/dry/drained yield conversion, ambiguous lentil weights, pantry preparation metadata or cheapest-200 retrieval bias. Those remain open M03/N08 work. No new AI calls, network reads, retailer imports, database changes or source permissions.

Release validation requires typecheck, lint, build, the complete unit suite, existing UI regressions and both CI workflows. The change does not overlap draft review PR #31's files at inspection. Rollback: revert the merge and redeploy; no migration rollback is needed.

The fast-food UI fixture also had a timing-dependent assertion: it required a specific one-hour-old item first although each fixture received its own timestamp and the UI sorts newest first. The check now requires that item to be present while retaining card-count, stale-exclusion and location assertions. No runtime radar behaviour changed.
