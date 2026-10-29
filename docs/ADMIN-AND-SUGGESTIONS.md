# Administration and private suggestions

Open `/admin`, sign in with the assigned administrator account, then set up or verify an authenticator (TOTP). The database requires an `aal2` session for moderation even if the UI is bypassed. Membership is a private table keyed by the existing confirmed Auth user ID, not an email in client code or editable user metadata. Role grants are owner-only database operations. Ordinary users cannot grant roles.

Registered users choose **Suggest a deal / my submissions** in the footer. The database validates bounded text, HTTPS links, positive prices and confirmed sign-in, and serialises a three-submission daily limit per user. Users can read only their own requests and review notes. No submitted URL is fetched automatically. Administrators should treat links as untrusted and verify retailer identity before opening them.

The admin queue has 20-row pages and pending / needs information / approved / rejected filters. Reviews leave an audit event. Approval records a decision only: it does not publish arbitrary submitted prices to the catalogue. Independently check the source and use the existing reviewed import pipeline. Automated publication and user replies are not part of this release.

Suggestions and audit records are removed after 90 days by the existing Postgres cron infrastructure. Submissions stop at 20,000 retained records or 96 MiB database size. At a conservative 4 KiB per submission including indexes, 20,000 records use about 78 MiB plus audit overhead; this is a planning estimate, not measured storage. No images, uploads, provider calls, email sends or new services are added. Admin/suggestion chunks load on demand. No visitor search text is logged by this feature.

Migrations are versioned in `supabase/migrations/20261029222413_*` and `20261029222720_*`. The owner membership assignment is account configuration and deliberately excluded from the public repository. Run `tests/sql/admin-suggestions.sql` in an owner SQL session to exercise RLS, MFA enforcement, blank-source validation and daily quota; its synthetic submissions roll back. Run `npm run typecheck`, `npm run lint`, `npm run build`, then `npm run test:ui` for the frontend.

No administrator password, TOTP secret, service-role key or owner email belongs in the frontend or repository. End-to-end owner login and authenticator setup need the account holder; deployment checks must never impersonate them. If an unfinished authenticator enrolment is abandoned, retry setup; the UI removes only unverified TOTP factors during explicit setup. Verified factors are preserved.

Supabase documents TOTP MFA as free and enabled by default: https://supabase.com/docs/guides/auth/auth-mfa/totp (checked 30 October 2026 Sydney). This uses TOTP only, with no SMS provider.
