import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import Modal from '@/components/Modal';
import { STORE_IDS, STORES, type StoreId } from '@/lib/stores';

type Props = {
  open: boolean;
  initial: StoreId[] | null;
  onSave: (s: StoreId[]) => void;
  onClose: () => void;
};

export default function StorePicker({ open, initial, onSave, onClose }: Props) {
  const [picked, setPicked] = useState<StoreId[]>(initial ?? []);
  useEffect(() => { if (open) setPicked(initial ?? []); }, [open, initial]);

  const first = !initial?.length;
  const toggle = (s: StoreId) => setPicked((p) => (p.includes(s) ? p.filter((x) => x !== s) : [...p, s]));

  return (
    <Modal open={open} onClose={onClose} title="Choose your stores" wide dismissible={!first}>
      <p className="text-sm font-semibold uppercase tracking-widest text-tomato">{first ? 'Welcome to SaveHalf' : 'Your stores'}</p>
      <h2 className="mt-1 font-display text-3xl font-extrabold leading-tight sm:text-4xl">Where do you shop?</h2>
      <p className="mt-2 text-ink-soft">Pick as many as you like. We'll only show deals from these. You can change this any time.</p>

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {STORE_IDS.map((id) => {
          const m = STORES[id];
          const on = picked.includes(id);
          return (
            <button
              key={id}
              onClick={() => toggle(id)}
              aria-pressed={on}
              className={`flex items-center gap-4 rounded-2xl border-2 p-4 text-left transition-all ${on ? 'border-ink bg-white shadow-[0_4px_0_#16211C]' : 'border-ink/10 bg-white/60 hover:border-ink/30'}`}
            >
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl font-display text-2xl font-extrabold text-white" style={{ background: m.color }}>
                {m.mono}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{id}</span>
                <span className="block truncate text-xs text-ink-mute">{m.blurb}</span>
              </span>
              <span className={`grid h-6 w-6 place-items-center rounded-full border-2 ${on ? 'border-ink bg-ink text-white' : 'border-ink/20'}`}>
                {on && <Check className="h-4 w-4" strokeWidth={3} />}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button onClick={() => setPicked(picked.length === STORE_IDS.length ? [] : [...STORE_IDS])} className="text-sm font-semibold text-ink-soft underline-offset-4 hover:underline">
          {picked.length === STORE_IDS.length ? 'Clear all' : 'Select all'}
        </button>
        <button
          disabled={!picked.length}
          onClick={() => onSave(picked)}
          className="rounded-xl bg-tomato px-6 py-3 font-semibold text-white shadow-[0_4px_0_#C93717] transition-all enabled:hover:translate-y-px enabled:hover:shadow-[0_3px_0_#C93717] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Show my deals{picked.length ? ` (${picked.length})` : ''}
        </button>
      </div>
    </Modal>
  );
}
