# Personal shopping release — 9 October 2026

This release implements the first device-based retention features and collector failure handling from the product plan. Historical price charts, offline installation, cross-device list sync, public shared lists and additional retailer pilots remain future work.

## Shipped

- Watch price buttons on product cards; up to 50 watches saved on the device.
- Target-price matches and changes against the previous watch check. No historical or predictive price claims.
- One bounded 50-ID public product query on watchlist open, with a five-minute session cooldown, 12-second timeout and no polling. Removing a watch during a pending check does not restore it; mismatched variants and missing/stale products cannot trigger target matches.
- Saved retailer/category preferences through an explicit Remember these filters action.
- Up to five named weekly templates, up to 100 products each. Templates retain quantities and budget, reset bought flags, preserve the original price/check timestamp, and require explicit replacement when a list is already populated.
- Browser-persisted basket budget and Start next shop action. These features remain available without sign-in.
- Forgot-password request and recovery-session password update screens. Signup/new-password UI requires 12 characters; existing password login remains compatible with the backend's existing policy. This frontend rule is not a claim that the backend minimum was changed.
- Smaller mobile hero and matching styles for personal shopping tools.
- No catalogue query while viewing saved products. Superseded catalogue errors cannot replace a newer successful result.
- Three-day failure/empty backoff in both collector reservation and cron invocation, with unchanged daily caps. Successful collector timestamps are recorded separately from attempt timestamps. Previously fresh rows retain their actual check time and age out normally.

## Verification

35 unit/parser tests passed, plus production-bundle DOM checks for watchlist queries/changes/targets, template budgets/quantities/reset, email and number input focus, existing shopping/food/image/directory flows, and mocked password-reset/update redirects. Type checking, linting and production build passed. Mocked auth tests do not prove real Google consent, mailbox delivery or recovery-link delivery.

Live Supabase checks confirmed failed/empty collectors and the used pilot daily limit skip invocation without a network request. Anonymous roles cannot call the collection reservation or invocation functions. Collector function version 8 is deployed with the existing custom Vault-backed authentication. No secret appears in frontend code.

The public Auth settings endpoint reports Google/email providers enabled and email auto-confirm disabled. Real Google sign-in and email delivery still require end-to-end verification. If Google continues to report redirect_uri_mismatch, its matching OAuth client must authorise https://mdbqlcnzbakimfjrfczz.supabase.co/auth/v1/callback in Google Cloud. SMTP configuration is not exposed by available tools; no paid provider or billing setting was added.

The security advisor still reports leaked-password protection disabled and informational no-policy notices for two operation-only/retired tables. Those tables were not made public to clear warnings. Account features have no new cloud schema or user-data policies in this release.

No new paid services, AI APIs, tokens, scraping schedules, background notifications or tracking service were introduced. Watches/templates/preferences are stored on the current device and do not automatically upload when signing in. Retailer prices, stock and sizes must still be checked before buying.
