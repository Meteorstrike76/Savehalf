export default function Skeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-ink/10 bg-white" aria-hidden>
      <div className="aspect-[4/3] animate-pulse bg-ink/5" />
      <div className="space-y-3 p-4">
        <div className="h-3 w-1/3 animate-pulse rounded bg-ink/5" />
        <div className="h-4 w-full animate-pulse rounded bg-ink/5" />
        <div className="h-8 w-1/2 animate-pulse rounded bg-ink/5" />
      </div>
    </div>
  );
}
