export const STORE_IDS = ['Coles', 'Woolworths', 'Aldi', 'Big W', 'Kmart', 'Target', 'Best & Less'] as const;
export type StoreId = (typeof STORE_IDS)[number];

export const CATEGORIES = ['Groceries', 'Electronics', 'Home & Living', 'Fashion', 'Clearance'] as const;
export type DealCategory = (typeof CATEGORIES)[number];

export type StoreMeta = {
  id: StoreId;
  blurb: string;
  mono: string;
  /** solid brand-ish colour for dots / placeholders */
  color: string;
  /** soft tint for backgrounds */
  tint: string;
};

export const STORES: Record<StoreId, StoreMeta> = {
  'Best & Less': { id: 'Best & Less', blurb: 'Selected fashion sale variants', mono: 'BL', color: '#9d3928', tint: '#f3e3d7' },
  Coles: { id: 'Coles', blurb: 'Weekly specials & half-price', mono: 'C', color: '#E01A22', tint: '#FBE3E4' },
  Woolworths: { id: 'Woolworths', blurb: 'Specials & Prices Dropped', mono: 'W', color: '#178841', tint: '#DDF0E3' },
  Aldi: { id: 'Aldi', blurb: 'Special Buys & price cuts', mono: 'A', color: '#1E4C9A', tint: '#DEE8F7' },
  'Big W': { id: 'Big W', blurb: 'Clearance & toy sales', mono: 'B', color: '#0A5BAE', tint: '#DCEBF8' },
  Target: { id: 'Target', blurb: 'Home, fashion & clearance', mono: 'T', color: '#d62d34', tint: '#fce8e8' },
  Kmart: { id: 'Kmart', blurb: 'Clearance & anti-bargains', mono: 'K', color: '#C8102E', tint: '#FADDE2' },
};

export const isStoreId = (v: unknown): v is StoreId =>
  typeof v === 'string' && (STORE_IDS as readonly string[]).includes(v);
