import Link from "next/link"
import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { createServiceClient } from "@/lib/server/supabase-rest"

type SearchParams = Promise<Record<string, string | string[] | undefined>>
type Post = { id: string; content?: string | null; hook?: string | null; role_profile?: string | null; engagement_score?: number | null; quality_score?: number | null; created_at: string }

const roles = ["all", "ai_engineer", "ceo", "hr", "sales", "designer", "consultant", "founder", "developer"]
const roleLabel = (role?: string | null) => (role || "general").replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase())
const scoreClass = (score: number) => (score >= 80 ? "bg-green-100 text-green-700" : score >= 60 ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700")
const single = (value: string | string[] | undefined, fallback = "") => (Array.isArray(value) ? value[0] : value) || fallback

export default async function LibraryPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const params = await searchParams
  const role = single(params.role, "all")
  const date = single(params.date, "all")
  const score = single(params.score, "all")
  const q = single(params.q, "")
  const page = Math.max(1, Number(single(params.page, "1")) || 1)
  const from = (page - 1) * 20
  const to = from + 19
  const supabase = createServiceClient()

  let query = supabase
    .from("posts")
    .select("id,content,hook,role_profile,engagement_score,quality_score,created_at", { count: "exact" })
    .eq("user_id", session.user.id)
    .order("created_at", { ascending: false })
    .range(from, to)

  if (role !== "all") query = query.eq("role_profile", role)
  if (q) query = query.ilike("content", `%${q}%`)
  if (score === "high") query = query.gte("quality_score", 80)
  if (date !== "all") {
    const now = new Date()
    const days = date === "today" ? 1 : date === "week" ? 7 : 31
    query = query.gte("created_at", new Date(now.getTime() - days * 86400000).toISOString())
  }

  const [{ data: posts, count }, { data: allPosts }] = await Promise.all([
    query,
    supabase.from("posts").select("role_profile,quality_score,engagement_score,created_at").eq("user_id", session.user.id),
  ])

  const all = (allPosts || []) as Post[]
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime()
  const avg = all.length ? Math.round(all.reduce((sum, p) => sum + Number(p.quality_score || p.engagement_score || 0), 0) / all.length) : 0
  const activeRole = Object.entries(all.reduce<Record<string, number>>((acc, p) => {
    const key = p.role_profile || "general"
    acc[key] = (acc[key] || 0) + 1
    return acc
  }, {})).sort((a, b) => b[1] - a[1])[0]?.[0] || "-"

  const items = (posts || []) as Post[]

  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-semibold text-zinc-500">Library</p>
            <h1 className="text-3xl font-bold text-zinc-950">Generated posts</h1>
          </div>
          <div className="flex gap-2">
            <Link href="/api/posts?export=csv" className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold">Export CSV</Link>
            <Link href="/api/posts?export=pdf" className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold">Export PDF</Link>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-4">
          {[
            ["Total posts", String(all.length)],
            ["This month", String(all.filter((p) => new Date(p.created_at).getTime() >= monthStart).length)],
            ["Average score", avg ? String(avg) : "-"],
            ["Most active role", roleLabel(activeRole)],
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-zinc-200 bg-white p-5">
              <p className="text-sm text-zinc-500">{label}</p>
              <p className="mt-2 text-2xl font-bold text-zinc-950">{value}</p>
            </div>
          ))}
        </section>

        <form className="grid gap-3 rounded-2xl border border-zinc-200 bg-white p-4 md:grid-cols-5">
          <input name="q" defaultValue={q} placeholder="Search posts" className="rounded-xl border border-zinc-200 px-3 py-2 text-sm md:col-span-2" />
          <select name="role" defaultValue={role} className="rounded-xl border border-zinc-200 px-3 py-2 text-sm">{roles.map((r) => <option key={r} value={r}>{r === "all" ? "All roles" : roleLabel(r)}</option>)}</select>
          <select name="date" defaultValue={date} className="rounded-xl border border-zinc-200 px-3 py-2 text-sm">
            <option value="all">All time</option><option value="today">Today</option><option value="week">This week</option><option value="month">This month</option>
          </select>
          <select name="score" defaultValue={score} className="rounded-xl border border-zinc-200 px-3 py-2 text-sm">
            <option value="all">All scores</option><option value="high">High quality 80+</option>
          </select>
          <button className="rounded-xl bg-zinc-950 px-4 py-2 text-sm font-semibold text-white md:col-start-5">Filter</button>
        </form>

        {items.length ? (
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {items.map((post) => {
              const scoreValue = Number(post.quality_score || post.engagement_score || 0)
              const hook = post.hook || post.content?.split("\n")[0] || "Untitled post"
              return (
                <article key={post.id} className="rounded-2xl border border-zinc-200 bg-white p-5">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-700">{roleLabel(post.role_profile)}</span>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${scoreClass(scoreValue)}`}>{scoreValue || "-"} score</span>
                  </div>
                  <h2 className="line-clamp-3 min-h-[72px] text-lg font-bold text-zinc-950">{hook}</h2>
                  <p className="mt-3 text-sm text-zinc-500">{new Date(post.created_at).toLocaleDateString()}</p>
                  <div className="mt-5 flex flex-wrap gap-2">
                    <button className="rounded-lg border border-zinc-200 px-3 py-2 text-xs font-semibold">Copy</button>
                    <Link href={`/write?edit=${post.id}`} className="rounded-lg border border-zinc-200 px-3 py-2 text-xs font-semibold">Edit</Link>
                    <button className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600">Delete</button>
                  </div>
                </article>
              )
            })}
          </section>
        ) : (
          <section className="rounded-2xl border border-dashed border-zinc-300 bg-white p-12 text-center">
            <p className="text-lg font-semibold text-zinc-950">No posts found.</p>
            <Link href="/write" className="mt-4 inline-block rounded-xl bg-zinc-950 px-5 py-3 text-sm font-semibold text-white">Write first post</Link>
          </section>
        )}

        <footer className="flex justify-between">
          <Link href={`?page=${Math.max(1, page - 1)}`} className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold">Previous</Link>
          <span className="text-sm text-zinc-500">Page {page} - {count || 0} posts</span>
          <Link href={`?page=${page + 1}`} className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold">Next</Link>
        </footer>
      </div>
    </main>
  )
}
