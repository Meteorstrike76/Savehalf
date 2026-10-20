-- Run AFTER the three existing migrations. Adds Target without deleting user data.
ALTER TABLE public.deals DROP CONSTRAINT IF EXISTS deals_store_category_check;
ALTER TABLE public.deals ADD CONSTRAINT deals_store_category_check
 CHECK (store_category IN ('Coles','Woolworths','Aldi','Big W','Kmart','Target'));
CREATE INDEX IF NOT EXISTS idx_deals_freshness ON public.deals(last_seen_at DESC) WHERE is_active=true;
-- Keeps malformed URLs and untrusted writes out of new imported records.
ALTER TABLE public.deals DROP CONSTRAINT IF EXISTS deals_safe_url;
ALTER TABLE public.deals ADD CONSTRAINT deals_safe_url CHECK (deal_url IS NULL OR deal_url = '' OR deal_url ~ '^https://') NOT VALID;
