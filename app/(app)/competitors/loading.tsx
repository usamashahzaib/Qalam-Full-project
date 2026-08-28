export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-5 py-8 sm:px-8">
      <div className="flex items-center justify-between">
        <div className="h-7 w-40 animate-pulse rounded-lg bg-zinc-200/70" />
        <div className="h-9 w-28 animate-pulse rounded-xl bg-zinc-200/70" />
      </div>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-2xl border border-zinc-200 bg-white p-5">
            <div className="space-y-3">
              <div className="h-4 w-2/3 animate-pulse rounded bg-zinc-100" />
              <div className="h-3 w-full animate-pulse rounded bg-zinc-100" />
              <div className="h-3 w-4/5 animate-pulse rounded bg-zinc-100" />
            </div>
          </div>
        ))}
      </div>
      <div className="rounded-2xl border border-zinc-200 bg-white p-6">
        <div className="space-y-4">
          <div className="h-5 w-1/3 animate-pulse rounded bg-zinc-100" />
          <div className="h-4 w-full animate-pulse rounded bg-zinc-100" />
          <div className="h-4 w-5/6 animate-pulse rounded bg-zinc-100" />
          <div className="h-4 w-2/3 animate-pulse rounded bg-zinc-100" />
        </div>
      </div>
    </div>
  )
}

