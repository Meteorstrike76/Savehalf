import { createClient } from '@supabase/supabase-js';

export function client() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error('Set SUPABASE_URL and SUPABASE_SERVICE_KEY (service/secret key, not the anon key).');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

const MAX_PER_STORE = Number(process.env.MAX_PER_STORE ?? 300);
const MIN_ROWS_TO_EXPIRE = Number(process.env.MIN_ROWS_TO_EXPIRE ?? 10);

/** Keep the best `MAX_PER_STORE` deals per store, de-duplicated by external_id. */
export function selectTop(rows, cap = MAX_PER_STORE) {
  const byId = new Map();
  for (const r of rows) {
    const prev = byId.get(r.external_id);
    if (!prev || r.discount_price < prev.discount_price) byId.set(r.external_id, r);
  }
  const score = (r) => (r.original_price ? 1 - r.discount_price / r.original_price : 0);
  return [...byId.values()].sort((a, b) => score(b) - score(a)).slice(0, cap);
}

export async function saveStore(sb, store, rows, runStartedAt) {
  const top = selectTop(rows);
  const payload = top.map((r) => ({ ...r, last_seen_at: runStartedAt, is_active: true }));

  for (let i = 0; i < payload.length; i += 200) {
    const { error } = await sb.from('deals').upsert(payload.slice(i, i + 200), { onConflict: 'store_category,external_id' });
    if (error) throw new Error(`upsert failed: ${error.message}`);
  }

  // Only expire old deals if this run clearly worked. A blocked/empty scrape must never wipe the feed.
  let expired = 0;
  if (payload.length >= MIN_ROWS_TO_EXPIRE) {
    const { data, error } = await sb
      .from('deals')
      .update({ is_active: false })
      .eq('store_category', store)
      .eq('source_feed', 'scraper')
      .eq('is_active', true)
      .lt('last_seen_at', runStartedAt)
      .select('id');
    if (error) throw new Error(`expire failed: ${error.message}`);
    expired = data?.length ?? 0;
  }
  return { saved: payload.length, expired };
}

export async function purge(sb) {
  const { data, error } = await sb.rpc('purge_stale_deals', { keep_days: 14, keep_saved_days: 60 });
  if (error) throw new Error(`purge failed: ${error.message}`);
  return data ?? 0;
}
