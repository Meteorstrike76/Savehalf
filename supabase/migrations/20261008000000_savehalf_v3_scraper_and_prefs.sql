/*
  SaveHalf v3: scraper support, store preferences, free-tier hygiene.
  Safe to run on top of the two existing migrations (idempotent).

  - Drops OzBargain (sites covered: Coles, Woolworths, Aldi, Big W, Kmart)
  - external_id + last_seen_at + is_active: lets the scraper upsert and expire deals
    WITHOUT deleting rows that users have hearted
  - discount_pct generated column: server-side "biggest discount" sorting
  - user_preferences: remembers which stores a signed-in user shops at
*/

-- 1. Remove OzBargain rows (constraint below no longer allows them)
DELETE FROM deals WHERE store_category = 'OzBargain';
UPDATE deals SET source_feed = 'direct' WHERE source_feed = 'ozbargain';

ALTER TABLE deals DROP CONSTRAINT IF EXISTS deals_store_category_check;
ALTER TABLE deals ADD CONSTRAINT deals_store_category_check
  CHECK (store_category IN ('Coles', 'Woolworths', 'Aldi', 'Big W', 'Kmart'));

ALTER TABLE deals DROP CONSTRAINT IF EXISTS deals_source_feed_check;
ALTER TABLE deals ADD CONSTRAINT deals_source_feed_check
  CHECK (source_feed IN ('direct', 'scraper', 'seed'));

-- 2. Scraper bookkeeping
ALTER TABLE deals ADD COLUMN IF NOT EXISTS external_id text;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS last_seen_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE deals ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
ALTER TABLE deals ALTER COLUMN original_price DROP NOT NULL;
ALTER TABLE deals ALTER COLUMN image_url DROP NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'deals_store_external_uniq') THEN
    ALTER TABLE deals ADD CONSTRAINT deals_store_external_uniq UNIQUE (store_category, external_id);
  END IF;
END $$;

-- 3. Generated discount percentage (0 when there is no usable "was" price)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'deals' AND column_name = 'discount_pct') THEN
    ALTER TABLE deals ADD COLUMN discount_pct smallint GENERATED ALWAYS AS (
      CASE
        WHEN original_price IS NOT NULL AND original_price > 0 AND discount_price < original_price
        THEN round((1 - discount_price / original_price) * 100)::smallint
        ELSE 0
      END
    ) STORED;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_deals_feed
  ON deals (is_active, store_category, discount_pct DESC, published_at DESC);

-- 4. Store preferences (one row per user)
CREATE TABLE IF NOT EXISTS user_preferences (
  user_id uuid PRIMARY KEY DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  stores text[] NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_prefs" ON user_preferences;
CREATE POLICY "select_own_prefs" ON user_preferences FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_prefs" ON user_preferences;
CREATE POLICY "insert_own_prefs" ON user_preferences FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_prefs" ON user_preferences;
CREATE POLICY "update_own_prefs" ON user_preferences FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 5. Housekeeping the scraper calls after each run (keeps the free tier tiny).
--    Expired deals nobody saved are deleted after `keep_days`; saved ones are kept longer.
CREATE OR REPLACE FUNCTION purge_stale_deals(keep_days int DEFAULT 14, keep_saved_days int DEFAULT 60)
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n int;
BEGIN
  DELETE FROM deals d
  WHERE d.is_active = false
    AND (
      (d.last_seen_at < now() - make_interval(days => keep_days)
        AND NOT EXISTS (SELECT 1 FROM saved_deals s WHERE s.deal_id = d.id))
      OR d.last_seen_at < now() - make_interval(days => keep_saved_days)
    );
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END $$;

REVOKE ALL ON FUNCTION purge_stale_deals(int, int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION purge_stale_deals(int, int) TO service_role;
