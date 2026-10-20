# SaveHalf project rules

- Use free-tier services within their documented quotas. Do not activate billing, paid upgrades, paid integrations, paid APIs or paid add-ons.
- Do not introduce AI generation, AI-provider API calls, model inference or features that consume AI tokens, even when a provider advertises a limited free tier.
- Prefer local browser calculations, built-in recipe templates and user-initiated links to publicly accessible third-party resources.
- The retired meal-recipe endpoint must not call any provider or read provider credentials.
- Keep scrape requests bounded, record blocked/empty results honestly, and never fabricate products, previous prices, savings or complete catalogue coverage.
- Keep signup focus stable. Preserve Google and email Auth redirects and respect Supabase RLS.
- Never commit secrets or put service-role credentials in frontend code.
