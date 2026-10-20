# SaveHalf Web Analytics

The official @vercel/analytics 2.0.1 React integration was deployed to production in dpl_EYBz6UjS3PSGwfmAzXBhy4b8uxPH. The dashboard confirms Hobby and Web Analytics enabled; both public domains point to this deployment. The production DOM loads /_vercel/insights/script.js. Dashboard event verification is recorded below.

For future releases, keep the project on Hobby and standard Web Analytics. Do not activate Analytics Plus or a paid plan. At implementation time the documented Hobby allowance is 50,000 events per month; custom events are unavailable. Check current limits before activation.

Only the two public production hostnames load the script. The beforeSend filter permits home-page pageviews only, strips query strings and fragments, rejects auth callbacks and custom events, and excludes preview/local visits. Do Not Track and Global Privacy Control prevent script loading. No account IDs, saved lists or search terms are sent as custom event properties.

Verify after activation: the insights script loads, a normal production visit appears in the dashboard, and callback/preview visits do not generate events. This integration does not provide historical analytics or track SPA tabs as separate pages.

Validation: npm run typecheck; npm run build; node --test tests/analytics.test.cjs.

Release verification: typecheck, production build and both privacy tests pass. After ingestion delay, the dashboard displayed 1 visitor and 1 page view. End-to-end collection is verified. No paid feature was activated.
