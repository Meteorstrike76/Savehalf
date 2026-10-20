import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { isStoreId, type StoreId } from '@/lib/stores';
import { useAuth } from '@/context/AuthContext';

const KEY = 'savehalf:stores:v1';

function readLocal(): StoreId[] | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const arr = JSON.parse(raw);
    const clean = Array.isArray(arr) ? arr.filter(isStoreId) : [];
    return clean.length ? clean : null;
  } catch {
    return null;
  }
}

/**
 * Which stores the shopper cares about.
 * - null  => never chosen (show the onboarding picker)
 * - saved in localStorage for guests, and mirrored to `user_preferences` when signed in
 */
export function useStorePrefs() {
  const { user } = useAuth();
  const [stores, setStores] = useState<StoreId[] | null>(readLocal);
  const syncedFor = useRef<string | null>(null);

  const save = useCallback(
    (next: StoreId[]) => {
      setStores(next);
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        /* private mode: ignore */
      }
      if (user) {
        void supabase.from('user_preferences').upsert({ user_id: user.id, stores: next, updated_at: new Date().toISOString() });
      }
    },
    [user]
  );

  // On login: adopt the account's saved stores, or push the guest choice up to the account.
  useEffect(() => {
    if (!user || syncedFor.current === user.id) return;
    syncedFor.current = user.id;
    let active = true;
    (async () => {
      const { data } = await supabase.from('user_preferences').select('stores').eq('user_id', user.id).maybeSingle();
      if (!active) return;
      const remote = ((data?.stores as string[] | undefined) ?? []).filter(isStoreId);
      if (remote.length) {
        setStores(remote);
        try { localStorage.setItem(KEY, JSON.stringify(remote)); } catch { /* ignore */ }
      } else if (readLocal()) {
        await supabase.from('user_preferences').upsert({ user_id: user.id, stores: readLocal() });
      }
    })();
    return () => { active = false; };
  }, [user]);

  useEffect(() => {
    if (!user) syncedFor.current = null;
  }, [user]);

  return { stores, save };
}
