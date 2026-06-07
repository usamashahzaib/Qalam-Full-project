import Link from "next/link"
import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { createServiceClient } from "@/lib/server/supabase-rest"
import { getPlanStatus } from "@/lib/server/plan-limits"

type PostRow = {
  id: string
  title?: string | null
  content?: string | null
  role_profile?: string | null
  engagement_score?: number | null
  quality_score?: number | null
  created_at: string
}

const startOfMonth = () => new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
const dayKey = (date: string) => new Date(date).getDate()
const labelRole = (role?: string | null) => (role || "general").replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase())

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const supabase = createServiceClient()
  const userId = session.user.id
  const monthStart = startOfMonth()

  const [{ data: posts }, { count: libraryCount }, { count: carouselCount }, planStatus] = await Promise.all([
    supabase
      .from("posts")
      .select("id,title,content,role_profile,engagement_score,quality_score,created_at")
      .eq("user_id", userId)
      .gte("created_at", monthStart)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase.from("posts").select("id", { count: "exact", head: true }).eq("user_id", userId),
    supabase.from("carousel_projects").select("id", { count: "exact", head: true }).eq("user_id", userId).gte("created_at", monthStart),
    getPlanStatus(userId),
  ])

  const rows = (posts || []) as PostRow[]
  const scores = rows.map((p) => Number(p.quality_score || p.engagement_score || 0)).filter(Boolean)
  const avgScore = scores.length ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : 0
  const roleCounts = rows.reduce<Record<string, number>>((acc, post) => {
    const role = post.role_profile || "general"
    acc[role] = (acc[role] || 0) + 1
    return acc
  }, {})
  const mostUsedRole = Object.entries(roleCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "none"
  const days = Array.from({ length: new Date().getDate() }, (_, i) => i + 1)
  const daily = days.map((day) => rows.filter((post) => dayKey(post.created_at) === day).length)
  const maxDaily = Math.max(1, ...daily)
  const renewalDate = planStatus.resetsAt ? new Date(planStatus.resetsAt).toLocaleDateString() : "Monthly reset"

  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-semibold text-zinc-500">Dashboard</p>
            <h1 className="text-3xl font-bold text-zinc-950">Welcome, {session.user.name || "Creator"}</h1>
          </div>
          <Link href="/write" className="rounded-xl bg-zinc-950 px-5 py-3 text-sm font-semibold text-white">Write New Post</Link>
        </header>

        <section className="grid gap-4 md:grid-cols-4">
          {[
            ["Drafts used", String(planStatus.used)],
            ["Drafts remaining", String(planStatus.remaining)],
            ["Library posts", String(libraryCount || 0)],
            ["Avg score", avgScore ? `${avgScore}` : "-"],
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-zinc-200 bg-white p-5">
              <p className="text-sm text-zinc-500">{label}</p>
              <p className="mt-2 text-3xl font-bold text-zinc-950">{value}</p>
            </div>
          ))}
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.4fr_.8fr]">
          <div className="rounded-2xl border border-zinc-200 bg-white p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-zinc-950">Recent posts</h2>
              <Link href="/library" className="text-sm font-semibold text-zinc-600">View library</Link>
            </div>
            {rows.length ? (
              <div className="divide-y divide-zinc-100">
                {rows.slice(0, 5).map((post) => (
                  <div key={post.id} className="py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold text-zinc-950">{post.title || post.content?.slice(0, 70) || "Untitled post"}</p>
                        <p className="mt-1 text-sm text-zinc-500">{labelRole(post.role_profile)} - {new Date(post.created_at).toLocaleDateString()}</p>
                      </div>
                      <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-700">{post.quality_score || post.engagement_score || "-"} score</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-zinc-300 p-8 text-center">
                <p className="font-semibold text-zinc-900">No posts generated yet.</p>
                <div className="mt-4 flex justify-center gap-3">
                  <Link href="/write" className="rounded-xl bg-zinc-950 px-4 py-2 text-sm font-semibold text-white">Write first post</Link>
                  <Link href="/demo" className="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700">Watch Demo</Link>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="rounded-2xl border border-zinc-200 bg-white p-5">
              <h2 className="text-lg font-bold text-zinc-950">Plan</h2>
              <p className="mt-3 text-3xl font-bold capitalize">{planStatus.plan}</p>
              <p className="mt-1 text-sm text-zinc-500">Renews/resets: {renewalDate}</p>
              {planStatus.plan === "free" ? <Link href="/pricing" className="mt-4 inline-block rounded-xl bg-teal px-4 py-2 text-sm font-semibold text-white">Upgrade</Link> : null}
            </div>
            <div className="rounded-2xl border border-zinc-200 bg-white p-5">
              <h2 className="text-lg font-bold text-zinc-950">Quick actions</h2>
              <div className="mt-4 grid gap-2">
                {[
                  ["Write New Post", "/write"],
                  ["Create Carousel", "/carousel"],
                  ["Train Voice", "/voice"],
                  ["View Library", "/library"],
                ].map(([label, href]) => <Link key={label} href={href} className="rounded-xl border border-zinc-200 px-4 py-3 text-sm font-semibold text-zinc-700">{label}</Link>)}
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-zinc-950">Usage this month</h2>
            <p className="text-sm text-zinc-500">Most used role: {labelRole(mostUsedRole)} - Carousels: {carouselCount || 0}</p>
          </div>
          <div className="flex h-40 items-end gap-1">
            {daily.map((count, index) => (
              <div key={index} className="flex flex-1 flex-col items-center gap-1">
                <div className="w-full rounded-t bg-zinc-900" style={{ height: `${Math.max(4, (count / maxDaily) * 128)}px` }} />
                <span className="text-[10px] text-zinc-400">{index + 1}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  )
}
