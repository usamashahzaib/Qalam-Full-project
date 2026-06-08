import { redirect } from "next/navigation"
import Link from "next/link"
import { auth } from "@/auth"
import { createServiceClient } from "@/lib/server/supabase-rest"
import { LibraryGrid, type LibraryPost } from "./LibraryGrid"

// ─── Config ───────────────────────────────────────────────────────────────────

const ROLES = [
  { value: "all", label: "All roles" },
  { value: "developer", label: "Developer" },
  { value: "designer", label: "Designer" },
  { value: "ai_engineer", label: "AI Engineer" },
  { value: "hr", label: "HR Leader" },
  { value: "founder", label: "Founder" },
  { value: "ceo", label: "CEO" },
  { value: "sales", label: "Sales" },
  { value: "consultant", label: "Consultant" },
]

const DATE_OPTIONS = [
  { value: "all", label: "All time" },
  { value: "today", label: "Today" },
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
]

const TYPE_OPTIONS = [
  { value: "all", label: "All types" },
  { value: "posts", label: "Posts" },
  { value: "carousels", label: "Carousels" },
]

const SCORE_OPTIONS = [
  { value: "all", label: "All scores" },
  { value: "high", label: "High quality (80+)" },
]

const PAGE_SIZE = 20

// ─── Helpers ─────────────────────────────────────────────────────────────────

type SP = Promise<Record<string, string | string[] | undefined>>

const single = (v: string | string[] | undefined, fallback = "") =>
  (Array.isArray(v) ? v[0] : v) || fallback

const dateFilter = (dateParam: string): string | null => {
  if (dateParam === "today") {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d.toISOString()
  }
  if (dateParam === "week") {
    return new Date(Date.now() - 7 * 86400_000).toISOString()
  }
  if (dateParam === "month") {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString()
  }
  return null
}

const labelRole = (role?: string | null) =>
  (role || "General").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-zinc-500">{label}</p>
      <p className="mt-2 text-3xl font-bold tabular-nums text-zinc-950">{value}</p>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function LibraryPage({ searchParams }: { searchParams: SP }) {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const params = await searchParams
  const role = single(params.role, "all")
  const date = single(params.date, "all")
  const type = single(params.type, "all")
  const score = single(params.score, "all")
  const q = single(params.q, "")
  const page = Math.max(1, Number(single(params.page, "1")) || 1)
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  const supabase = createServiceClient()
  const userId = session.user.id

  // Build filtered + paginated query
  let query = supabase
    .from("posts")
    .select("id,title,content,role,score,type,created_at", { count: "exact" })
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .range(from, to)

  if (role !== "all") query = query.eq("role", role)
  if (score === "high") query = query.gte("score", 80)
  if (q) query = query.ilike("content", `%${q}%`)

  const since = dateFilter(date)
  if (since) query = query.gte("created_at", since)

  if (type === "posts") query = query.not("type", "ilike", "%carousel%")
  if (type === "carousels") query = query.ilike("type", "%carousel%")

  // Aggregate stats (all user posts, unfiltered)
  const [pagedResult, statsResult] = await Promise.allSettled([
    query,
    supabase
      .from("posts")
      .select("score,role,created_at")
      .eq("user_id", userId)
      .limit(5000),
  ])

  const posts: LibraryPost[] =
    pagedResult.status === "fulfilled" ? ((pagedResult.value.data || []) as LibraryPost[]) : []
  const totalCount = pagedResult.status === "fulfilled" ? (pagedResult.value.count ?? 0) : 0

  const allPosts =
    statsResult.status === "fulfilled"
      ? ((statsResult.value.data || []) as { score?: number | null; role?: string | null; created_at: string }[])
      : []

  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime()
  const postsThisMonth = allPosts.filter((p) => new Date(p.created_at).getTime() >= monthStart).length
  const scores = allPosts.map((p) => Number(p.score ?? 0)).filter(Boolean)
  const avgScore = scores.length ? Math.round(scores.reduce((s, v) => s + v, 0) / scores.length) : 0

  const roleCounts = allPosts.reduce<Record<string, number>>((acc, p) => {
    const r = p.role || "general"
    acc[r] = (acc[r] || 0) + 1
    return acc
  }, {})
  const topRole = Object.entries(roleCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))

  // Build pagination-safe URL helper
  const pageUrl = (p: number) => {
    const sp = new URLSearchParams()
    if (role !== "all") sp.set("role", role)
    if (date !== "all") sp.set("date", date)
    if (type !== "all") sp.set("type", type)
    if (score !== "all") sp.set("score", score)
    if (q) sp.set("q", q)
    sp.set("page", String(p))
    return `?${sp.toString()}`
  }

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-8 md:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-medium text-zinc-500">Library</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-zinc-950">Post library</h1>
          </div>
          <Link
            href="/write"
            className="inline-flex items-center gap-2 rounded-xl bg-zinc-950 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-zinc-800"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Write new post
          </Link>
        </header>

        {/* Stats */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total posts" value={allPosts.length} />
          <StatCard label="Posts this month" value={postsThisMonth} />
          <StatCard label="Average score" value={avgScore || "—"} />
          <StatCard label="Most active role" value={topRole ? labelRole(topRole) : "—"} />
        </section>

        {/* Filters */}
        <form method="get" className="grid gap-3 rounded-2xl border border-zinc-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-6">
          {/* Search */}
          <div className="relative lg:col-span-2">
            <svg
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              name="q"
              type="search"
              defaultValue={q}
              placeholder="Search content…"
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 py-2 pl-9 pr-4 text-sm outline-none transition-colors focus:border-teal focus:bg-white focus:ring-4 focus:ring-teal/10"
            />
          </div>

          <select
            name="role"
            defaultValue={role}
            className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:border-teal focus:ring-4 focus:ring-teal/10"
          >
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>

          <select
            name="date"
            defaultValue={date}
            className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:border-teal focus:ring-4 focus:ring-teal/10"
          >
            {DATE_OPTIONS.map((d) => (
              <option key={d.value} value={d.value}>{d.label}</option>
            ))}
          </select>

          <select
            name="type"
            defaultValue={type}
            className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:border-teal focus:ring-4 focus:ring-teal/10"
          >
            {TYPE_OPTIONS.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>

          <div className="flex gap-2">
            <select
              name="score"
              defaultValue={score}
              className="flex-1 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:border-teal focus:ring-4 focus:ring-teal/10"
            >
              {SCORE_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
            <button
              type="submit"
              className="shrink-0 rounded-xl bg-zinc-950 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-zinc-800"
            >
              Filter
            </button>
          </div>
        </form>

        {/* Results count */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-zinc-500">
            {totalCount} {totalCount === 1 ? "post" : "posts"}
            {q && <span className="ml-1">matching <em>&ldquo;{q}&rdquo;</em></span>}
          </p>
          {(role !== "all" || date !== "all" || type !== "all" || score !== "all" || q) && (
            <Link href="/library" className="text-sm font-semibold text-teal transition-colors hover:text-teal-700">
              Clear filters
            </Link>
          )}
        </div>

        {/* Grid (client component) */}
        <LibraryGrid initialPosts={posts} />

        {/* Pagination */}
        {totalPages > 1 && (
          <nav className="flex items-center justify-between">
            <Link
              href={pageUrl(Math.max(1, page - 1))}
              aria-disabled={page === 1}
              className={`rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50 ${page === 1 ? "pointer-events-none opacity-40" : ""}`}
            >
              Previous
            </Link>
            <span className="text-sm text-zinc-500">
              Page {page} of {totalPages}
            </span>
            <Link
              href={pageUrl(Math.min(totalPages, page + 1))}
              aria-disabled={page === totalPages}
              className={`rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50 ${page === totalPages ? "pointer-events-none opacity-40" : ""}`}
            >
              Next
            </Link>
          </nav>
        )}
      </div>
    </main>
  )
}
