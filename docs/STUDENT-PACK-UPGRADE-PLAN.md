# SaveHalf: Student Pack upgrade and interface plan

Reviewed 19 November 2026. Account eligibility is reported by the owner; partner redemption, quotas and expiry have not been verified inside each partner account. Preserve the current Vercel + Supabase stack and existing no-billing policy.

## Benefit decisions

| Priority | Benefit currently advertised | SaveHalf use | Activation and fallback |
| --- | --- | --- | --- |
| 1 | GitHub Pro while a student; Copilot Student with bounded chat/agent access | Development assistance, focused pull requests, existing CI and reviews | Redeem in the owner's GitHub account. Keep CI reproducible without Copilot; it is not the site's inference backend. Verify actual Actions/Codespaces allowances before additional scheduled jobs. |
| 1 | Sentry: 50K errors, 100K transactions, 1GB attachments, 500 replays; one-year renewable benefit, on-demand disabled | Error monitoring for authentication, planner failures and collection UI | Start with error-only reporting, no personal data or replay. Verify the redeemed quota. Sampling and off switch; keep existing logs as fallback. |
| 1 | Polypane Individual for one year | Responsive and accessibility review of planner, catalogue cards and admin | Use during development. Existing Playwright, axe and Lighthouse remain the reproducible gates. |
| 2 | Zyte: one free Scrapy Cloud unit, 120-day retention | Evaluate hosting bounded permitted source jobs | Redeem and verify actual account terms first. Respect source-use and access controls; this benefit does not resolve WAF blocks or authorize bypass. Keep existing supported jobs and uploaded-PDF imports as fallback. |
| 2 | Namecheap: one-year .me registration; Name.com: selected domain offer | Optional SaveHalf custom domain | Choose one after checking exact name, renewal price, expiry and auto-renew settings. Keep savehalf.vercel.app working. Do not buy a premium domain. |
| 2 | 1Password for two years | Owner's development credential hygiene | Personal setup, distinct service credentials, rotation plan. Existing GitHub/Vercel/Supabase secret stores stay in place. |
| 3 | Azure for Students: $100 credit and selected free services, no card required | Isolated OCR experiments and development benchmarks | Lab only, account quota verified, no paid conversion. Local OCR and deterministic parsing remain the baseline. Do not depend on credits for production availability. |

Official sources:
- https://education.github.com/pack
- https://github.com/github-education-resources/Student-Developer-Pack-Current-Partners-FAQ
- https://github.com/github-education-resources/Student-Developer-Pack-Current-Partners-FAQ/blob/main/SDP-changelog.md

Do not assume Student Pack membership enables Vercel Pro, Supabase Pro, unrestricted inference or unlimited private CI. Do not migrate the database or introduce another hosting provider just to consume a temporary credit. DigitalOcean is not included in the current official Pack listing; older tutorials are not a current entitlement.

## Delivery order

### Phase 1: clearer shopping and meal planning — implemented first

1. Expose imported catalogue offers before the collected-price grid. The live database currently has 274 ALDI and 31 Best & Less rows; other supported catalogue offers are a separate source, not missing database rows that should be fabricated.
2. Show a compact retailer-diverse catalogue preview, its own region/retailer/search filters and a clear handoff to collected-price filters. Keep regional editions and advertised-price provenance visible. ALDI remains excluded from the uploaded PDF batch.
3. Redesign the weekly planner as four clear steps: budget, household, optional pantry, seven dinners. Add a consistent progress indicator and a persistent summary with a clearly labelled per-person budget target.
4. Use forest green, cream and the existing SaveHalf typography direction. Limit decorative elements. Make incomplete prices visually distinct from a verified within-budget basket.
5. Keep existing recipe generation, pantry quantities, equipment exclusions, grocery bounds, source dates and export semantics. No model calls or new service dependencies.
6. Test budget validation, back navigation, pantry search/skip, seven dinners, incomplete prices, export and equipment restrictions. Review desktop and narrow-screen layout, focus, keyboard and touch targets.

### Phase 2: reliable release and observation

- Redeem and verify the selected monitoring benefit, then add a disabled-by-default error adapter with no PII and bounded sampling.
- Instrument actionable technical failures, not individual shopping histories. Publish a short error-handling runbook and verify the off switch.
- Keep dependency checks, 211+ regression tests, UI scripts, performance and accessibility checks as release gates. Add tests for observed regressions, not duplicate tooling.

### Phase 3: collection operations

- Inventory admitted sources and define per-source request/byte/runtime budgets.
- Pilot one permitted source in Scrapy Cloud only after the account and source-use conditions are verified. Compare success, runtime and output quality against the existing runner.
- Validate region, price unit, dates, variants, image match and stable IDs before publication. Keep ambiguous records quarantined and preserve a source checksum/page reference.
- Keep ALDI out of the uploaded-PDF workflow. Do not change the separate existing ALDI collector or delete current catalogue rows under that instruction.

### Phase 4: expand the design system

- Apply the kitchen card, input, status and spacing patterns to the one-to-three-meal planner and household pantry.
- Improve catalogue navigation, active filter visibility and empty states across sources.
- Refine the admin import/review workbench and collection health presentation.
- Add a custom domain only after the owner chooses an available standard name and confirms the renewal arrangement.

## Acceptance and cost controls

- Other retailers are discoverable without scrolling through ALDI's lowest-price results.
- Users can distinguish catalogue advertisements from collected products and verified reductions.
- A planner with missing prices never claims a verified budget fit.
- No new paid subscription, credit-card signup, model provider or production database migration is activated by this phase.
- Each redeemed benefit gets an owner, verified quota, expiry date and free fallback in the service registry. Review before expiry; stop optional jobs rather than silently exceeding the grant.
