export default function Logo({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-tomato font-display text-xl font-extrabold leading-none text-white shadow-[0_3px_0_#C93717]">
        ½
      </span>
      <span className="font-display text-2xl font-extrabold tracking-tight">
        Save<span className="text-tomato">Half</span>
      </span>
    </span>
  );
}
