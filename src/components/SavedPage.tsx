import { Heart, PiggyBank } from 'lucide-react';
import DealCard from '@/components/DealCard';
import type { Deal, SavedDeal } from '@/lib/supabase';

type Props = { saved: SavedDeal[]; loading: boolean; onToggle: (d: Deal) => void; onBrowse: () => void };

export default function SavedPage({ saved, loading, onToggle, onBrowse }: Props) {
  const live = saved.filter((s) => s.deal.isActive);
  const total = live.reduce((sum, s) => sum + Math.max(0, (s.deal.originalPrice ?? s.deal.discountPrice) - s.deal.discountPrice), 0);

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="font-display text-4xl font-extrabold">Your saved deals</h1>

      {saved.length > 0 && (
        <div className="mt-6 flex items-center gap-4 rounded-2xl bg-leaf p-5 text-white sm:max-w-md">
          <PiggyBank className="h-10 w-10 shrink-0" />
          <div>
            <p className="text-sm text-white/80">If you grab everything still on sale</p>
            <p className="font-display text-3xl font-extrabold tabular">${total.toFixed(2)} saved</p>
          </div>
        </div>
      )}

      {loading && saved.length === 0 ? (
        <p className="mt-10 text-ink-soft">Loading…</p>
      ) : saved.length === 0 ? (
        <div className="mt-10 rounded-3xl border-2 border-dashed border-ink/15 p-12 text-center">
          <Heart className="mx-auto h-10 w-10 text-tomato" />
          <p className="mt-4 font-display text-2xl font-extrabold">Nothing saved yet</p>
          <p className="mt-1 text-ink-soft">Tap the heart on any deal to keep it here.</p>
          <button onClick={onBrowse} className="mt-6 rounded-xl bg-tomato px-6 py-3 font-semibold text-white shadow-[0_4px_0_#C93717]">Browse deals</button>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {saved.map((s, i) => (
            <div key={s.id} className={s.deal.isActive ? '' : 'opacity-60'}>
              <DealCard deal={s.deal} saved onToggle={onToggle} index={i} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
