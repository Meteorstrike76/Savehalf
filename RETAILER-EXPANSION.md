# Priceline, Chemist Warehouse, IGA and Officeworks — 15 October 2026

## Delivered
- Four merchant RSS sources added to the existing OzBargain collector. Backend catalogue-collect version 14 is ACTIVE.
- Initial successful public RSS observations: Priceline 0 recent eligible headlines, Chemist Warehouse 2, IGA 0, Officeworks 8. Older and expired headlines are excluded.
- Existing 15-minute scheduler retained. Robots + front page + two oldest due merchant feeds per run; normal merchant interval about 45 minutes. Retry pauses and shared governor can delay this. No higher request/byte/day cap.
- Public read policies and server-side collector authentication unchanged. The feed-key constraint now allows seven sources.
- New merchant filters and seven-feed fetch in Deal Radar, corrected official sale links and IGA directory entry implemented and built.

## Deployment limitation
Frontend publication is pending: Vercel returned 403 for the existing cyber-expert2 team/project scope. No authenticated Vercel CLI is available. The existing website still has its prior three-feed UI; the new filters are in this source/build archive. Do not claim the UI is live until released.

## Direct product sources
- Priceline sale HTML returned a small application shell without structured products.
- Chemist Warehouse returned promotion HTML; direct price parsing not admitted. Savings may compare with RRP, not a prior selling price.
- IGA returned a public page but offers require local-store attribution; no national product feed inferred.
- Officeworks clearance returned HTTP 403 to the research request.
These retailers are community discovery sources and official handoffs, not verified direct product catalogues. No medical recommendations, synthetic prices, prescription data or AI inference added.

## Validation
45 parser/data tests, TypeScript, ESLint and production build passed. Rotation test verifies bounded requests, oldest-first coverage and retry pauses. Initial feed snapshots persisted and read back with counts. Existing cron remains active. The manual run request was skipped by the existing due guard; hosted rotation will be verified after its next due run.
