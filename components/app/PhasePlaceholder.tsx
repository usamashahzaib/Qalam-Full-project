import Link from "next/link"

type PhasePlaceholderProps = {
  title: string
  summary: string
  route: string
  apiStatus?: string
}

export function PhasePlaceholder({ title, summary, route, apiStatus }: PhasePlaceholderProps) {
  return (
    <div className="min-h-screen bg-zinc-50 px-6 py-16 font-jakarta">
      <div className="mx-auto max-w-3xl rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm sm:p-10">
        <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">
          Phase 2 Pending
        </span>
        <h1 className="mt-5 text-3xl font-bold text-zinc-900 sm:text-4xl">{title}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-zinc-600">{summary}</p>
        <div className="mt-6 grid gap-3 text-sm text-zinc-600 sm:grid-cols-2">
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
            <p className="font-semibold text-zinc-900">Route</p>
            <p className="mt-1">{route}</p>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
            <p className="font-semibold text-zinc-900">Backend</p>
            <p className="mt-1">{apiStatus || "Auth and session infrastructure are live. This screen is waiting for its full product surface."}</p>
          </div>
        </div>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/login" className="rounded-xl bg-teal px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-600">
            Back to auth
          </Link>
          <Link href="/" className="rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50">
            Return to site
          </Link>
        </div>
      </div>
    </div>
  )
}
