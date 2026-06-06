"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { AnalyticsIcon, CarouselIcon, ComposeIcon, HookIcon, LibraryIcon, VoiceIcon } from "@/components/ui/qalam-icons"

type Post = {
  id: string
  title: string | null
  content: string | null
  status: string
  engagement_score: number | null
  topic: string | null
  role_profile: string | null
  created_at: string | null
}
type UsageItem = { used: number; total: number }
type DashboardData = {
  total: number
  drafts: number
  published: number
  avgScore: number
  recentPosts: Post[]
  usage: { plan: string; drafts: UsageItem; carousels: UsageItem }
  activity: Array<{ id: string; label: string; time: string }>
}

const pct = ({ used, total }: UsageItem) => total ? Math.min(100, Math.round((used / total) * 100)) : 0
const dateLabel = (value?: string | null) => value ? new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "No date"
const titleFor = (post: Post) => post.title || post.topic || post.content?.split("\n").find(Boolean)?.slice(0, 80) || "Untitled post"

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    let active = true
    ;(async () => {
      setLoading(true)
      setError("")
      try {
        const res = await fetch("/api/dashboard/stats", { cache: "no-store" })
        const payload = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(payload.error || "Failed to load dashboard")
        if (active) setData(payload)
      } catch (err) {
        if (active) setError((err as Error).message)
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => { active = false }
  }, [])

  const stats = useMemo(() => [
    { label: "Total posts", value: data?.total ?? 0, icon: LibraryIcon },
    { label: "Drafts", value: data?.drafts ?? 0, icon: ComposeIcon },
    { label: "Published", value: data?.published ?? 0, icon: AnalyticsIcon },
    { label: "Average score", value: data?.avgScore ?? 0, icon: AnalyticsIcon },
  ], [data])

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-6 text-zinc-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-5">
        <header className="flex flex-col gap-3 border-b border-zinc-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-zinc-500">Dashboard</p>
            <h1 className="mt-1 text-3xl font-bold">Qalam activity</h1>
          </div>
          <Link href="/write" className="rounded-lg bg-zinc-950 px-4 py-2 text-sm font-bold text-white hover:bg-zinc-800">Write Post</Link>
        </header>

        {error ? <p className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map(({ label, value, icon: Icon }) => (
            <div key={label} className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wide text-zinc-500">{label}</p>
                <Icon className="h-4 w-4 text-teal" />
              </div>
              <p className="mt-3 text-3xl font-bold">{loading ? "--" : value}</p>
            </div>
          ))}
        </section>

        <section className="grid gap-5 lg:grid-cols-[1.4fr_0.8fr]">
          <div className="rounded-lg border border-zinc-200 bg-white shadow-sm">
            <div className="border-b border-zinc-100 px-5 py-4">
              <h2 className="text-sm font-bold">Recent posts</h2>
            </div>
            {loading ? <div className="p-5 text-sm text-zinc-500">Loading posts...</div> : !data?.recentPosts.length ? (
              <div className="p-10 text-center">
                <p className="text-sm font-semibold">No posts yet.</p>
                <Link href="/write" className="mt-3 inline-flex rounded-lg bg-zinc-950 px-4 py-2 text-sm font-bold text-white">Create your first post</Link>
              </div>
            ) : (
              <div className="divide-y divide-zinc-100">
                {data.recentPosts.map((post) => (
                  <article key={post.id} className="grid gap-3 px-5 py-4 sm:grid-cols-[1fr_auto]">
                    <div>
                      <h3 className="text-sm font-bold">{titleFor(post)}</h3>
                      <p className="mt-1 line-clamp-2 text-sm text-zinc-600">{post.content}</p>
                      <p className="mt-2 text-xs text-zinc-400">{dateLabel(post.created_at)}</p>
                    </div>
                    <div className="flex items-start gap-2 sm:justify-end">
                      <span className="rounded-full bg-zinc-100 px-2 py-1 text-[10px] font-bold uppercase text-zinc-600">{post.status}</span>
                      <span className="rounded-full bg-teal/10 px-2 py-1 text-[10px] font-bold text-teal">{post.engagement_score ?? 0}/100</span>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-5">
            <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-bold">Plan usage</h2>
              <p className="mt-1 text-xs uppercase tracking-wide text-zinc-400">{data?.usage.plan || "free"}</p>
              <UsageBar label="Drafts" item={data?.usage.drafts || { used: 0, total: 0 }} />
              <UsageBar label="Carousels" item={data?.usage.carousels || { used: 0, total: 0 }} />
            </section>

            <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-bold">Quick Actions</h2>
              <div className="mt-4 grid gap-2">
                {[
                  { label: "Write Post", href: "/write", icon: ComposeIcon },
                  { label: "Train Voice", href: "/voice", icon: VoiceIcon },
                  { label: "Generate Hook", href: "/free-tools/hook-generator", icon: HookIcon },
                  { label: "Create Carousel", href: "/carousel", icon: CarouselIcon },
                ].map(({ label, href, icon: Icon }) => (
                  <Link key={href} href={href} className="flex items-center gap-3 rounded-lg border border-zinc-200 px-3 py-2 text-sm font-semibold hover:bg-zinc-50">
                    <Icon className="h-4 w-4 text-teal" />
                    {label}
                  </Link>
                ))}
              </div>
            </section>
          </div>
        </section>

        <section className="rounded-lg border border-zinc-200 bg-white shadow-sm">
          <div className="border-b border-zinc-100 px-5 py-4">
            <h2 className="text-sm font-bold">Activity feed</h2>
          </div>
          {loading ? <p className="p-5 text-sm text-zinc-500">Loading activity...</p> : !data?.activity.length ? (
            <p className="p-5 text-sm text-zinc-500">No activity yet.</p>
          ) : (
            <div className="divide-y divide-zinc-100">
              {data.activity.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <p className="text-sm text-zinc-700">{item.label}</p>
                  <span className="shrink-0 text-xs text-zinc-400">{item.time}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}

function UsageBar({ label, item }: { label: string; item: UsageItem }) {
  return (
    <div className="mt-4">
      <div className="mb-1 flex justify-between text-xs font-semibold text-zinc-600">
        <span>{label}</span>
        <span>{item.used}/{item.total}</span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-zinc-100">
        <div className="h-full rounded-full bg-teal" style={{ width: `${pct(item)}%` }} />
      </div>
    </div>
  )
}
