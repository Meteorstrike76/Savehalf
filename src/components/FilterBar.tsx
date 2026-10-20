import { Search } from 'lucide-react';
import { CATEGORIES, STORES, type DealCategory, type StoreId } from '@/lib/stores';
import type { SortKey } from '@/hooks/useDeals';

type Props = {
  allStores: StoreId[];
  activeStores: StoreId[];
  onStores: (s: StoreId[]) => void;
  category: DealCategory | 'All';
  onCategory: (c: DealCategory | 'All') => void;
  search: string;
  onSearch: (s: string) => void;
  sort: SortKey;
  onSort: (s: SortKey) => void;
};

export default function FilterBar(p: Props) {
  const toggle = (s: StoreId) => {
    const on = p.activeStores.includes(s);
    if (on && p.activeStores.length === 1) return p.onStores(p.allStores); // un-filter instead of an empty feed
    // when everything is active, tapping a store focuses on just that store
    if (p.activeStores.length === p.allStores.length) return p.onStores([s]);
    p.onStores(on ? p.activeStores.filter((x) => x !== s) : [...p.activeStores, s]);
  };
  const focused = p.activeStores.length !== p.allStores.length;

  const chip = (on: boolean) =>
    `shrink-0 rounded-full border-2 px-4 py-2 text-sm font-semibold transition-colors ${on ? 'border-ink bg-ink text-white' : 'border-ink/10 bg-white hover:border-ink/40'}`;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-mute" />
          <input value={p.search} onChange={(e) => p.onSearch(e.target.value)} placeholder="Search deals, e.g. chicken, air fryer, towels" aria-label="Search deals"
            className="w-full rounded-xl border-2 border-ink/10 bg-white py-3 pl-12 pr-4 outline-none focus:border-ink" />
        </div>
        <select value={p.sort} onChange={(e) => p.onSort(e.target.value as SortKey)} aria-label="Sort deals"
          className="rounded-xl border-2 border-ink/10 bg-white px-4 py-3 font-semibold outline-none focus:border-ink">
          <option value="discount">Biggest discount</option>
          <option value="newest">Newest</option>
          <option value="price">Lowest price</option>
        </select>
      </div>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 scrollbar-none sm:mx-0 sm:px-0">
        {p.allStores.length > 1 && (
          <button onClick={() => p.onStores(p.allStores)} className={chip(!focused)}>All my stores</button>
        )}
        {p.allStores.map((s) => (
          <button key={s} onClick={() => toggle(s)} className={`${chip(focused && p.activeStores.includes(s))} flex items-center gap-2`}>
            <span className="h-2.5 w-2.5 rounded-full ring-2 ring-white/70" style={{ background: STORES[s].color }} />
            {s}
          </button>
        ))}
      </div>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 scrollbar-none sm:mx-0 sm:px-0">
        {(['All', ...CATEGORIES] as const).map((c) => (
          <button key={c} onClick={() => p.onCategory(c)} className={`${chip(p.category === c)} !border-transparent !py-1.5 text-xs ${p.category === c ? '' : '!bg-ink/5'}`}>
            {c === 'All' ? 'All categories' : c}
          </button>
        ))}
      </div>
    </div>
  );
}
