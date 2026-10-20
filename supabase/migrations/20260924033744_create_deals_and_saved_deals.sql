/*
# Create deals and saved_deals tables for SaveHalf

## Overview
SaveHalf tracks supermarket clearance deals. Deals are public (anyone can browse).
Saved deals are per-user (each authenticated user saves their own list and sees
their total estimated savings).

## New Tables

### deals
- `id` (uuid, primary key)
- `name` (text, product name, e.g. "Coles Fresh Chicken Breast 1kg")
- `store` (text, supermarket name: Coles, Woolworths, or Aldi)
- `original_price` (numeric(10,2), full price before discount)
- `sale_price` (numeric(10,2), clearance price)
- `image_url` (text, product photo URL)
- `category` (text, e.g. Meat, Dairy, Produce, Bakery, Pantry, Frozen)
- `created_at` (timestamptz, default now())

### saved_deals
- `id` (uuid, primary key)
- `user_id` (uuid, not null, defaults to auth.uid(), references auth.users ON DELETE CASCADE)
- `deal_id` (uuid, not null, references deals ON DELETE CASCADE)
- `created_at` (timestamptz, default now())
- Unique constraint on (user_id, deal_id) to prevent duplicate saves

## Security

### deals table
- RLS enabled
- SELECT is public: TO anon, authenticated USING (true) — deals are browsable by everyone
- No INSERT/UPDATE/DELETE via the API (deals are managed server-side)

### saved_deals table
- RLS enabled
- SELECT: authenticated users can only see their own saved deals
- INSERT: authenticated users can only save deals for themselves (user_id defaults to auth.uid())
- DELETE: authenticated users can only unsave their own saved deals
- No UPDATE needed (a saved deal is either saved or not)

## Important Notes
1. The `deals` table uses `USING (true)` for SELECT only because deals are intentionally public.
2. The `saved_deals.user_id` column has `DEFAULT auth.uid()` so client inserts that omit user_id succeed.
3. The unique constraint prevents a user from saving the same deal twice.
*/

-- Deals table (public read-only)
CREATE TABLE IF NOT EXISTS deals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  store text NOT NULL CHECK (store IN ('Coles', 'Woolworths', 'Aldi')),
  original_price numeric(10,2) NOT NULL CHECK (original_price > 0),
  sale_price numeric(10,2) NOT NULL CHECK (sale_price >= 0),
  image_url text NOT NULL,
  category text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE deals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_deals" ON deals;
CREATE POLICY "public_read_deals" ON deals FOR SELECT
  TO anon, authenticated USING (true);

-- Saved deals table (per-user)
CREATE TABLE IF NOT EXISTS saved_deals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  deal_id uuid NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, deal_id)
);

ALTER TABLE saved_deals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_saved_deals" ON saved_deals;
CREATE POLICY "select_own_saved_deals" ON saved_deals FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_saved_deals" ON saved_deals;
CREATE POLICY "insert_own_saved_deals" ON saved_deals FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_saved_deals" ON saved_deals;
CREATE POLICY "delete_own_saved_deals" ON saved_deals FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Index for common query: get all saved deals for a user
CREATE INDEX IF NOT EXISTS idx_saved_deals_user_id ON saved_deals(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_deals_deal_id ON saved_deals(deal_id);
CREATE INDEX IF NOT EXISTS idx_deals_store ON deals(store);