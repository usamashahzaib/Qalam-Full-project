function StatCardSkeleton() {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="h-4 w-28 animate-pulse rounded bg-zinc-100" />
      <div className="mt-3 h-9 w-16 animate-pulse rounded bg-zinc-100" />
    </div>
  )
}

function PlanCardSkeleton() {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="h-3 w-24 animate-pulse rounded bg-zinc-100" />
          <div className="h-7 w-20 animate-pulse rounded bg-zinc-100" />
        </div>
        <div className="h-6 w-14 animate-pulse rounded-full bg-zinc-100" />
      </div>
      <div className="mt-4 h-2 w-full animate-pulse rounded-full bg-zinc-100" />
      <div className="mt-3 flex gap-4">
        <div className="h-3 w-24 animate-pulse rounded bg-zinc-100" />
        <div className="h-3 w-24 animate-pulse rounded bg-zinc-100" />
      </div>
      <div className="mt-4 h-10 w-full animate-pulse rounded-xl bg-zinc-100" />
    </div>
  )
}

export default function StatsLoading() {
  return (
    <>
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <StatCardSkeleton key={i} />
        ))}
      </section>

      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <PlanCardSkeleton />
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="h-4 w-24 animate-pulse rounded bg-zinc-100" />
          <div className="mt-3 space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-12 w-full animate-pulse rounded-xl bg-zinc-100"
              />
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="h-4 w-32 animate-pulse rounded bg-zinc-100" />
        <div className="mt-5 flex h-40 items-end gap-px sm:gap-1">
          {Array.from({ length: 20 }, (_, i) => (
            <div
              key={i}
              className="flex-1 animate-pulse rounded-t bg-zinc-100"
              style={{ height: `${20 + Math.round(Math.sin(i) * 30 + 30)}px` }}
            />
          ))}
        </div>
      </div>
    </>
  )
}
