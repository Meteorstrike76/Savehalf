/*
# Expand deals table for multi-store aggregator (retry)

## Overview
SaveHalf is evolving from a 3-supermarket grocery tracker into a full
deals aggregator covering 7 retailers across 5 categories. This migration
adds new columns to the existing `deals` table and updates constraints.

## Changes
- Add `title`, `discount_price`, `store_category`, `deal_url`, `published_at`,
  `source_feed`, `upvotes`, `coupon_code` columns.
- Migrate data from `name`→`title`, `sale_price`→`discount_price`, `store`→`store_category`.
- Update existing `category` values to the new 5-category taxonomy.
- Drop old columns `name`, `sale_price`, `store`.
- Add CHECK constraints for `store_category`, `category`, `source_feed`.
*/

-- Step 1: Add new columns
ALTER TABLE deals ADD COLUMN IF NOT EXISTS title text;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS discount_price numeric(10,2);
ALTER TABLE deals ADD COLUMN IF NOT EXISTS store_category text;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS deal_url text NOT NULL DEFAULT '';
ALTER TABLE deals ADD COLUMN IF NOT EXISTS published_at timestamptz DEFAULT now();
ALTER TABLE deals ADD COLUMN IF NOT EXISTS source_feed text NOT NULL DEFAULT 'direct';
ALTER TABLE deals ADD COLUMN IF NOT EXISTS upvotes integer NOT NULL DEFAULT 0;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS coupon_code text;

-- Step 2: Migrate data from old columns to new ones
UPDATE deals SET title = name WHERE title IS NULL AND name IS NOT NULL;
UPDATE deals SET discount_price = sale_price WHERE discount_price IS NULL AND sale_price IS NOT NULL;
UPDATE deals SET store_category = store WHERE store_category IS NULL AND store IS NOT NULL;
UPDATE deals SET published_at = created_at WHERE published_at = now() AND created_at IS NOT NULL;

-- Step 3: Update existing category values to new taxonomy BEFORE adding constraint
UPDATE deals SET category = 'Groceries' WHERE category NOT IN ('Groceries', 'Electronics', 'Home & Living', 'Fashion', 'Clearance');

-- Step 4: Set NOT NULL on new columns
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'deals' AND column_name = 'title' AND is_nullable = 'YES') THEN
    ALTER TABLE deals ALTER COLUMN title SET NOT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'deals' AND column_name = 'discount_price' AND is_nullable = 'YES') THEN
    ALTER TABLE deals ALTER COLUMN discount_price SET NOT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'deals' AND column_name = 'store_category' AND is_nullable = 'YES') THEN
    ALTER TABLE deals ALTER COLUMN store_category SET NOT NULL;
  END IF;
END $$;

-- Step 5: Drop old constraints and columns
ALTER TABLE deals DROP CONSTRAINT IF EXISTS deals_store_check;
ALTER TABLE deals DROP COLUMN IF EXISTS name;
ALTER TABLE deals DROP COLUMN IF EXISTS sale_price;
ALTER TABLE deals DROP COLUMN IF EXISTS store;

-- Step 6: Add new CHECK constraints
ALTER TABLE deals DROP CONSTRAINT IF EXISTS deals_store_category_check;
ALTER TABLE deals ADD CONSTRAINT deals_store_category_check
  CHECK (store_category IN ('Coles', 'Woolworths', 'Aldi', 'Big W', 'Kmart', 'OzBargain'));

ALTER TABLE deals DROP CONSTRAINT IF EXISTS deals_category_check;
ALTER TABLE deals ADD CONSTRAINT deals_category_check
  CHECK (category IN ('Groceries', 'Electronics', 'Home & Living', 'Fashion', 'Clearance'));

ALTER TABLE deals DROP CONSTRAINT IF EXISTS deals_source_feed_check;
ALTER TABLE deals ADD CONSTRAINT deals_source_feed_check
  CHECK (source_feed IN ('direct', 'ozbargain'));

-- Step 7: Add indexes
CREATE INDEX IF NOT EXISTS idx_deals_store_category ON deals(store_category);
CREATE INDEX IF NOT EXISTS idx_deals_category ON deals(category);
