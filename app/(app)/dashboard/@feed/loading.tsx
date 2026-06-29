export default function FeedLoading() {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
        <div className="h-5 w-28 animate-pulse rounded bg-zinc-100" />
        <div className="h-4 w-20 animate-pulse rounded bg-zinc-100" />
      </div>
      <div className="divide-y divide-zinc-100">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="flex items-start justify-between gap-4 px-5 py-4"
          >
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-4 w-3/4 animate-pulse rounded bg-zinc-100" />
              <div className="h-3 w-1/3 animate-pulse rounded bg-zinc-100" />
            </div>
            <div className="h-6 w-10 shrink-0 animate-pulse rounded-full bg-zinc-100" />
          </div>
        ))}
      </div>
    </div>
  )
}
