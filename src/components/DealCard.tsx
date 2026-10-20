import { useState } from 'react';
import { Check, Copy, ExternalLink, Heart } from 'lucide-react';
import { STORES } from '@/lib/stores';
import type { Deal } from '@/lib/supabase';

type Props = { deal: Deal; saved: boolean; onToggle: (d: Deal) => void; index?: number };

export default function DealCard({ deal, saved, onToggle, index = 0 }: Props) {
  const [imgOk, setImgOk] = useState(true);
  const [copied, setCopied] = useState(false);
  const store = STORES[deal.store];
  const savings = deal.originalPrice ? deal.originalPrice - deal.discountPrice : 0;
  const showImg = deal.imageUrl && imgOk;

  const copy = async () => {
    if (!deal.couponCode) return;
    try { await navigator.clipboard.writeText(deal.couponCode); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { /* ignore */ }
  };

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-ink/10 bg-white transition-all hover:-translate-y-1 hover:border-ink/30 hover:shadow-[0_10px_0_-4px_rgba(22,33,28,0.12)] animate-rise" style={{ animationDelay: `${Math.min(index, 11) * 30}ms` }}>
      <div className="relative aspect-[4/3] overflow-hidden" style={{ background: store.tint }}>
        {showImg ? (
          <img src={deal.imageUrl!} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={() => setImgOk(false)}
            className="h-full w-full object-contain p-3 transition-transform duration-500 group-hover:scale-105" />
        ) : (
          <div className="grid h-full w-full place-items-center font-display text-7xl font-extrabold opacity-30" style={{ color: store.color }} aria-hidden>
            {store.mono}
          </div>
        )}

        {deal.discountPct > 0 && (
          <span className="absolute left-3 top-3 -rotate-3 rounded-md bg-butter px-2 py-1 text-sm font-extrabold text-ink shadow-[0_2px_0_rgba(0,0,0,.2)] tabular">
            −{deal.discountPct}%
          </span>
        )}

        <button
          onClick={() => onToggle(deal)}
          aria-pressed={saved}
          aria-label={saved ? `Remove ${deal.title} from saved` : `Save ${deal.title}`}
          className="absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-full bg-white shadow-md transition-transform hover:scale-110"
        >
          <Heart key={String(saved)} className={`h-5 w-5 ${saved ? 'fill-tomato text-tomato animate-pop' : 'text-ink-soft'}`} />
        </button>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-center gap-2 text-xs font-semibold">
          <span className="h-2 w-2 rounded-full" style={{ background: store.color }} />
          <span>{deal.store}</span>
          <span className="text-ink-mute">· {deal.category}</span>
          {!deal.isActive && <span className="ml-auto rounded bg-ink/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wide">Expired</span>}
        </div>

        <h3 className="mt-2 line-clamp-2 min-h-[2.6rem] text-[15px] font-semibold leading-snug">{deal.title}</h3>

        <div className="mt-3 flex items-baseline gap-2 tabular">
          <span className="font-display text-3xl font-extrabold text-tomato">${deal.discountPrice.toFixed(2)}</span>
          {deal.originalPrice && deal.originalPrice > deal.discountPrice && (
            <span className="text-sm text-ink-mute line-through">${deal.originalPrice.toFixed(2)}</span>
          )}
        </div>
        <p className="mt-0.5 h-5 text-xs font-semibold text-leaf">{savings > 0 ? `You save $${savings.toFixed(2)}` : 'Special price'}</p>

        <div className="mt-auto flex gap-2 pt-4">
          {deal.couponCode && (
            <button onClick={copy} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-ink/25 px-3 py-2 text-xs font-bold hover:border-ink">
              {copied ? <Check className="h-3.5 w-3.5 text-leaf" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? 'Copied' : deal.couponCode}
            </button>
          )}
          {deal.dealUrl && (
            <a href={deal.dealUrl} target="_blank" rel="noopener noreferrer" className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-ink px-3 py-2 text-xs font-semibold text-white hover:bg-ink-soft">
              View at {deal.store} <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      </div>
    </article>
  );
}
