import { Heart, LogOut, Store } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import Logo from '@/components/Logo';
import { STORES, type StoreId } from '@/lib/stores';

type Props = {
  page: 'home' | 'saved';
  onNavigate: (p: 'home' | 'saved') => void;
  onOpenAuth: () => void;
  onOpenStores: () => void;
  stores: StoreId[] | null;
  savedCount: number;
};

export default function Navbar({ page, onNavigate, onOpenAuth, onOpenStores, stores, savedCount }: Props) {
  const { user, signOut } = useAuth();
  return (
    <header className="sticky top-0 z-40 border-b border-ink/10 bg-cream/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <button onClick={() => onNavigate('home')} aria-label="SaveHalf home">
          <Logo />
        </button>

        <nav className="flex items-center gap-2" aria-label="Main">
          <button
            onClick={onOpenStores}
            className="flex items-center gap-2 rounded-full border border-ink/15 bg-white px-3 py-2 text-sm font-semibold hover:border-ink/40"
          >
            {stores?.length ? (
              <span className="flex -space-x-1.5">
                {stores.slice(0, 4).map((s) => (
                  <span key={s} className="h-4 w-4 rounded-full border-2 border-white" style={{ background: STORES[s].color }} />
                ))}
              </span>
            ) : (
              <Store className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">{stores?.length ? `${stores.length} store${stores.length > 1 ? 's' : ''}` : 'Pick stores'}</span>
          </button>

          {user && (
            <button
              onClick={() => onNavigate('saved')}
              aria-current={page === 'saved' ? 'page' : undefined}
              className={`relative flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold transition-colors ${
                page === 'saved' ? 'bg-ink text-white' : 'hover:bg-ink/5'
              }`}
            >
              <Heart className={`h-4 w-4 ${page === 'saved' ? 'fill-white' : 'text-tomato'}`} />
              <span className="hidden sm:inline">Saved</span>
              {savedCount > 0 && (
                <span className="rounded-full bg-tomato px-1.5 text-xs font-bold text-white tabular">{savedCount}</span>
              )}
            </button>
          )}

          {user ? (
            <button onClick={signOut} className="flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold text-ink-soft hover:bg-ink/5" title={user.email ?? ''}>
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          ) : (
            <button onClick={onOpenAuth} className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white shadow-[0_3px_0_#000] hover:translate-y-px hover:shadow-[0_2px_0_#000]">
              Log in
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}
