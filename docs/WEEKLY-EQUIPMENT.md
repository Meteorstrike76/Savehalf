# Weekly dinner equipment constraints (M04)

The weekly planner now asks which authored equipment is available before building a week. Each recipe declares required equipment; constraints are applied before pricing and the bounded variety search. Omitted equipment options preserve existing API behaviour; an explicit empty list is infeasible. Unknown equipment values are rejected. Basic utensils/lids/draining tools are explained in the form, and rice bowls may need two saucepans. The omelette conservatively requires a grill because its instructions may require grill finishing.

Day details and the text download list equipment. Back navigation preserves choices. No new recipe, retailer source, database write, external inference or price assumption is introduced. Missing prices still cannot establish affordability.

Review: checked the seven recipe step lists against their equipment declarations. This is a code/content consistency review, not a cooking trial. More recipes, ingredient-balanced retrieval, preparation/yield compatibility, swaps and shopping-list transfer remain pending. No changes overlap draft review PR #31's changed files at inspection time.

Validation: nine planner tests include all/limited/no/invalid equipment, combined exclusions, repeat limits, scaling and unknown prices. The existing rendered production-bundle UI test additionally exercises equipment selection, back navigation, seven constrained dinners and recovery from an infeasible kitchen. Required CI must pass before merge/deployment.

Rollback: revert this slice's merge commit and redeploy the prior main. No schema or persistent preference changes are involved.
