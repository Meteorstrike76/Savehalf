import { createClient } from '@supabase/supabase-js';
import type { DealCategory, StoreId } from '@/lib/stores';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

const returned = new URLSearchParams(window.location.hash.slice(1));
const returnQuery = new URLSearchParams(window.location.search);
export const authReturnError = (returned.get('error_description') || returnQuery.get('error_description') || '').slice(0,300);
export const isPasswordRecoveryReturn = returned.get('type') === 'recovery';
export const isAuthReturn = Boolean(returned.get('access_token') || returnQuery.get('code'));

export const isConfigured = Boolean(url && key);

// Placeholder values keep the app renderable (showing a setup notice) when env vars are missing.
export const supabase = createClient(url || 'http://localhost:54321', key || 'missing-anon-key', {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});

export interface Deal {
  unitBasis?: '100g'|'100ml'|'each';
  unitPrice?: number;
  id: string;
  title: string;
  externalId?: string;
  originalPrice: number | null;
  discountPrice: number;
  discountPct: number;
  store: StoreId;
  category: DealCategory;
  imageUrl: string | null;
  dealUrl: string;
  publishedAt: string;
  couponCode: string | null;
  isActive: boolean;
  lastSeenAt?: string;
  source?: string;
  observedRegion?: string;
  promotionEndsAt?: string;
  sourceUrl?: string;
}

export interface SavedDeal {
  id: string;
  dealId: string;
  createdAt: string;
  deal: Deal;
}

/** Columns the UI needs. Never `select('*')`: it keeps egress small on the free tier. */
export const DEAL_COLUMNS =
  'id,external_id,title,original_price,discount_price,discount_pct,store_category,category,image_url,deal_url,published_at,coupon_code,is_active,last_seen_at,source_feed,observed_region,promotion_ends_at,source_url,unit_basis,unit_price';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toDeal(r: any): Deal {
  return {
    unitBasis: ['100g','100ml','each'].includes(r.unit_basis)?r.unit_basis:undefined,
    unitPrice: r.unit_price!=null&&Number.isFinite(Number(r.unit_price))&&Number(r.unit_price)>0?Number(r.unit_price):undefined,
    id: r.id,
    title: r.title,
    externalId: r.external_id,
    originalPrice: r.original_price === null ? null : Number(r.original_price),
    discountPrice: Number(r.discount_price),
    discountPct: Number(r.discount_pct ?? 0),
    store: r.store_category,
    category: r.category,
    imageUrl: r.image_url || null,
    dealUrl: r.deal_url || '',
    publishedAt: r.published_at,
    couponCode: r.coupon_code ?? null,
    isActive: r.is_active ?? true,
    lastSeenAt: r.last_seen_at,
    source: r.source_feed,
    observedRegion: r.observed_region || undefined,
    promotionEndsAt: r.promotion_ends_at || undefined,
    sourceUrl: r.source_url || undefined,
  };
}
