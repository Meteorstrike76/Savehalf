import { useCallback, useEffect, useState } from 'react';
import { DEAL_COLUMNS, supabase, toDeal, type Deal, type SavedDeal } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

export function useFavourites() {
  const { user } = useAuth();
  const [saved, setSaved] = useState<SavedDeal[]>([]);
  const [ids, setIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!user) { setSaved([]); setIds(new Set()); return; }
    setLoading(true);
    const { data } = await supabase
      .from('saved_deals')
      .select(`id,deal_id,created_at,deal:deals(${DEAL_COLUMNS})`)
      .order('created_at', { ascending: false })
      .limit(500);
    const rows: SavedDeal[] = (data ?? [])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter((r: any) => r.deal)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((r: any) => ({ id: r.id, dealId: r.deal_id, createdAt: r.created_at, deal: toDeal(r.deal) }));
    setSaved(rows);
    setIds(new Set(rows.map((r) => r.dealId)));
    setLoading(false);
  }, [user]);

  useEffect(() => { void load(); }, [load]);

  /** Optimistic toggle. Returns 'added' | 'removed' | 'error'. */
  const toggle = useCallback(
    async (deal: Deal): Promise<'added' | 'removed' | 'error'> => {
      if (!user) return 'error';
      const had = ids.has(deal.id);
      setIds((prev) => { const n = new Set(prev); if (had) n.delete(deal.id); else n.add(deal.id); return n; });
      if (had) {
        setSaved((prev) => prev.filter((s) => s.dealId !== deal.id));
        const { error } = await supabase.from('saved_deals').delete().eq('deal_id', deal.id);
        if (error) { void load(); return 'error'; }
        return 'removed';
      }
      setSaved((prev) => [{ id: `tmp-${deal.id}`, dealId: deal.id, createdAt: new Date().toISOString(), deal }, ...prev]);
      const { error } = await supabase.from('saved_deals').insert({ deal_id: deal.id });
      if (error) { void load(); return 'error'; }
      return 'added';
    },
    [user, ids, load]
  );

  return { saved, ids, loading, toggle };
}
