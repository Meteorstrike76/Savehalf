import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import {createPortal} from 'react-dom';

const layers:HTMLElement[]=[];
let rootWasInert=false,rootAria:string|null=null,originalOverflow="";
function updateLayers(){const root=document.getElementById('root');if(root){root.inert=layers.length>0||rootWasInert;if(layers.length)root.setAttribute('aria-hidden','true');else if(rootAria===null)root.removeAttribute('aria-hidden');else root.setAttribute('aria-hidden',rootAria);}layers.forEach((el,i)=>{el.inert=i!==layers.length-1;});}

type Props = { open: boolean; onClose?: () => void; title: string; children: ReactNode; wide?: boolean; dismissible?: boolean };

export default function Modal({ open, onClose, title, children, wide, dismissible = true }: Props) {
  const dialog = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const layer=dialog.current!.parentElement!;if(!layers.length){originalOverflow=document.body.style.overflow;const root=document.getElementById('root');rootWasInert=root?.inert||false;rootAria=root?.getAttribute('aria-hidden')??null;}layers.push(layer);updateLayers();
    const focusables = () => Array.from(dialog.current?.querySelectorAll<HTMLElement>('button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),summary,[tabindex="0"]') ?? []).filter(el=>{let parent=el.parentElement;while(parent&&parent!==dialog.current){if(parent.tagName==='DETAILS'&&!(parent as HTMLDetailsElement).open&&!parent.querySelector('summary')?.contains(el))return false;parent=parent.parentElement;}return true;});
    const timer = window.setTimeout(() => !layer.inert&&(dialog.current?.querySelector<HTMLElement>('[autofocus],input') ?? focusables()[0] ?? dialog.current)?.focus(), 0);
    const onKey = (e: KeyboardEvent) => {
      if(layer.inert)return;
      if(e.key === 'Escape' && dismissible) onCloseRef.current?.();
      if(e.key !== 'Tab') return;
      const list = focusables(); const first=list[0]; const last=list[list.length-1];
      if(!first){e.preventDefault();dialog.current?.focus();return;}
      if(e.shiftKey && document.activeElement===first){e.preventDefault();last.focus();}
      else if(!e.shiftKey && document.activeElement===last){e.preventDefault();first.focus();}
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {clearTimeout(timer);window.removeEventListener('keydown',onKey);const i=layers.indexOf(layer);if(i>=0)layers.splice(i,1);updateLayers();document.body.style.overflow=layers.length?'hidden':originalOverflow;previous?.focus();};
  }, [open, dismissible]);

  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-50 grid place-items-end bg-ink/60 backdrop-blur-sm sm:place-items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && dismissible && onClose?.()}>
      <div ref={dialog} data-modal-title={title} tabIndex={-1} role="dialog" aria-modal="true" aria-label={title} className={`relative max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-cream p-6 shadow-2xl animate-rise sm:rounded-3xl sm:p-8 ${wide ? 'sm:max-w-2xl' : 'sm:max-w-md'}`}>
        {dismissible && (
          <button onClick={onClose} aria-label="Close" className="absolute right-4 top-4 rounded-full p-2 text-ink-soft hover:bg-ink/5">
            <X className="h-5 w-5" />
          </button>
        )}
        {children}
      </div>
    </div>,document.body
  );
}
