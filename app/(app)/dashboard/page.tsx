"use client"

import Link from "next/link"
import { useEffect, useCallback, useState } from "react"
import { useAuth } from "@/components/providers/AuthProvider"
import { useWorkspace } from "@/components/providers/WorkspaceProvider"
import {
  GrowthIcon,
  ComposeIcon,
  CalendarIcon,
  AnalyticsIcon,
  LibraryIcon,
} from "@/components/ui/qalam-icons"
import { persistWriterIntent, withClientParam, withWorkspaceKey } from "@/lib/workspace-navigation"

type DashboardStats = {
  posts: {
    total: number
    draft: number
    scheduled: number
    published: number
    pending_approval: number
    failed: number
  }
  pendingApprovals: number
  recentEvents: Array<{ event_type: string; recorded_at: string }>
  recentJobs: Array<{ type: string; status: string; created_at: string }>
  lastUpdated: string
}

export default function DashboardPage() {
  const { user } = useAuth()
  const { posts, isLoadingPosts, state } = useWorkspace()
  const activeClientId = (state as { agency?: { activeClientId?: string | null } }).agency?.activeClientId || null
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)
  const [statsError, setStatsError] = useState<string | null>(null)

  const fetchStats = useCallback(async () => {
    setStatsLoading(true)
    setStatsError(null)
    try {
      const res = await fetch(withWorkspaceKey("/api/dashboard/stats", activeClientId))
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to load dashboard stats")
      setStats(data.stats)
    } catch (e) {
      setStatsError((e as Error).message)
    } finally {
      setStatsLoading(false)
    }
  }, [activeClientId])

  useEffect(() => { fetchStats() }, [fetchStats])

  const isLoading = statsLoading || isLoadingPosts
  const recentPosts = [...posts].sort((a, b) => a.updatedAt > b.updatedAt ? -1 : 1).slice(0, 6)

  return (
    <div className="mx-auto max-w-6xl px-6 py-8 sm:px-10 font-jakarta">
      <div className="relative mb-8 rounded-3xl border border-teal/10 bg-gradient-to-br from-teal to-teal-950 p-6 sm:p-8 text-white overflow-hidden shadow-lg">
        <div className="absolute right-[-10%] top-[-20%] h-[300px] w-[300px] rounded-full opacity-20 mesh-blob" style={{ background: "radial-gradient(circle, rgba(201,135,31,0.4) 0%, transparent 70%)", ["--dur" as string]: "16s" }} />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div>
            <span className="rounded-full bg-gold/15 border border-gold/20 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-gold">
              {activeClientId ? "Client Workspace" : "Active Workspace"}
            </span>
            <h1 className="mt-3 text-3xl font-extrabold tracking-tight">Welcome back, {user?.firstName || "Creator"}!</h1>
            <p className="mt-2 text-sm text-teal-100/70 max-w-xl font-medium leading-relaxed">Your LinkedIn content workspace. Stats pulled live from the active workspace.</p>
          </div>
          <Link href={withClientParam("/writer", activeClientId)} className="shrink-0 inline-flex items-center justify-center gap-2 rounded-xl bg-gold hover:bg-gold-600 px-5 py-3 text-sm font-bold text-teal-950 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-md shadow-gold/10">
            <ComposeIcon className="h-4 w-4" />
            Write Post
          </Link>
        </div>
      </div>

      {statsError && <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">Dashboard error: {statsError} - <button onClick={fetchStats} className="font-semibold underline">Retry</button></div>}

      {isLoading ? (
        <div className="animate-pulse space-y-6">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">{[1, 2, 3, 4].map((i) => <div key={i} className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"><div className="h-3 w-16 rounded bg-zinc-200 mb-4" /><div className="h-8 w-12 rounded bg-zinc-200 mb-3" /><div className="h-2.5 w-24 rounded bg-zinc-100" /></div>)}</div>
          <div className="mt-8 rounded-2xl border border-zinc-200 bg-white shadow-sm h-64" />
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <StatCard icon={ComposeIcon} label="Drafts" value={String(stats?.posts.draft ?? 0)} sub="in database" href={withClientParam("/writer", activeClientId)} />
            <StatCard icon={CalendarIcon} label="Scheduled" value={String(stats?.posts.scheduled ?? 0)} sub="queued for publish" href={withClientParam("/calendar", activeClientId)} />
            <StatCard icon={LibraryIcon} label="Published" value={String(stats?.posts.published ?? 0)} sub="on LinkedIn" href={withClientParam("/library", activeClientId)} />
            <StatCard icon={AnalyticsIcon} label="Pending Review" value={String(stats?.pendingApprovals ?? 0)} sub="awaiting approval" href={withClientParam("/approvals", activeClientId)} highlight={(stats?.pendingApprovals ?? 0) > 0} />
          </div>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <StatCard icon={GrowthIcon} label="Total Posts" value={String(stats?.posts.total ?? 0)} sub="all statuses" href={withClientParam("/library", activeClientId)} />
            <StatCard icon={AnalyticsIcon} label="Failed" value={String(stats?.posts.failed ?? 0)} sub="publish errors" href={withClientParam("/analytics", activeClientId)} />
            <StatCard icon={GrowthIcon} label="Jobs Run" value={String(stats?.recentJobs.length ?? 0)} sub="recent background tasks" href={withClientParam("/analytics", activeClientId)} />
            <StatCard icon={ComposeIcon} label="Events" value={String(stats?.recentEvents.length ?? 0)} sub="recent activity" href={withClientParam("/analytics", activeClientId)} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 rounded-2xl border border-zinc-200 bg-white shadow-sm overflow-hidden flex flex-col">
              <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4 bg-zinc-50/50"><h2 className="text-sm font-bold text-zinc-900">Recent Posts</h2><span className="text-xs font-semibold text-zinc-500">{posts.length} total in workspace</span></div>
              <div className="divide-y divide-zinc-100 flex-1">
                {recentPosts.length === 0 ? (
                  <div className="px-6 py-12 text-center"><p className="text-sm font-medium text-zinc-500">No posts yet.</p><Link href={withClientParam("/writer", activeClientId)} className="mt-3 inline-flex text-xs font-bold text-teal hover:underline">Start writing {">"}</Link></div>
                ) : recentPosts.map((post) => (
                  <div key={post.id} className="flex items-center justify-between px-6 py-3.5 hover:bg-zinc-50/80 transition-colors">
                    <div className="min-w-0 flex-1"><p className="text-sm font-semibold text-zinc-900 truncate">{post.title}</p><p className="text-xs text-zinc-500 mt-0.5">{post.type}</p></div>
                    <div className="ml-4 flex items-center gap-3 shrink-0">
                      <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${post.status === "published" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : post.status === "scheduled" ? "bg-amber-50 text-amber-700 border border-amber-200" : post.status === "pending_approval" ? "bg-blue-50 text-blue-700 border border-blue-200" : post.status === "failed" ? "bg-red-50 text-red-700 border border-red-200" : "bg-zinc-100 text-zinc-600 border border-zinc-200"}`}>{post.status.replace(/_/g, " ")}</span>
                      <button className="text-xs text-teal font-semibold hover:underline" onClick={() => { persistWriterIntent({ id: post.id, title: post.title, content: post.content, type: post.type, externalPostUrn: post.externalPostUrn }, /^\d{4}-\d{2}-\d{2}$/.test(post.date) ? post.date : null); window.location.href = withClientParam("/writer", activeClientId) }}>Edit</button>
                    </div>
                  </div>
                ))}
              </div>
              {recentPosts.length > 0 && <div className="px-6 py-3 border-t border-zinc-100 bg-zinc-50/30 flex justify-between items-center"><span className="text-xs text-zinc-400">Showing {recentPosts.length} of {posts.length}</span><Link href={withClientParam("/library", activeClientId)} className="text-xs font-bold text-teal hover:text-teal-700 transition-colors">View all {">"}</Link></div>}
            </div>

            <div className="flex flex-col gap-4">
              {(stats?.pendingApprovals ?? 0) > 0 && <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4"><p className="text-sm font-bold text-amber-800">{stats!.pendingApprovals} post{stats!.pendingApprovals > 1 ? "s" : ""} awaiting review</p><p className="text-xs text-amber-700 mt-1">Team members are waiting for approval.</p><Link href={withClientParam("/approvals", activeClientId)} className="mt-3 inline-block rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-700 transition-colors">Review now {">"}</Link></div>}

              <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
                <h3 className="mb-3 text-sm font-bold text-zinc-900">Quick actions</h3>
                <div className="space-y-2">
                  {[
                    { label: "Write a post", href: "/writer" },
                    { label: "Generate carousel", href: "/writer" },
                    { label: "AI Strategist chat", href: "/chat" },
                    { label: "Review approvals", href: "/approvals" },
                    { label: "View analytics", href: "/analytics" },
                  ].map(({ label, href }) => <Link key={href + label} href={withClientParam(href, activeClientId)} className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900 transition-colors">{label}</Link>)}
                </div>
              </div>

              {(stats?.recentJobs.length ?? 0) > 0 && <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm"><h3 className="mb-3 text-sm font-bold text-zinc-900">Recent jobs</h3><div className="space-y-2">{stats!.recentJobs.slice(0, 5).map((job, i) => <div key={i} className="flex items-center justify-between gap-2"><span className="text-xs text-zinc-600 truncate">{job.type || "background_job"}</span><span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${job.status === "completed" ? "bg-emerald-50 text-emerald-700" : job.status === "failed" ? "bg-red-50 text-red-700" : "bg-zinc-100 text-zinc-600"}`}>{job.status}</span></div>)}</div></div>}

              {stats?.lastUpdated && <p className="text-center text-[10px] text-zinc-400">Stats from DB Â· {new Date(stats.lastUpdated).toLocaleTimeString()} Â· <button onClick={fetchStats} className="underline hover:text-zinc-600">Refresh</button></p>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ icon: Icon, label, value, sub, href, highlight }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; sub: string; href: string; highlight?: boolean }) {
  return (
    <Link href={href} className={`block rounded-2xl border bg-white p-5 shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 group ${highlight ? "border-amber-300 bg-amber-50/30" : "border-zinc-200"}`}>
      <div className="flex items-center gap-3"><span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all ${highlight ? "bg-amber-100 text-amber-700" : "bg-teal/5 text-teal group-hover:bg-teal group-hover:text-white"}`}><Icon className="h-5 w-5" /></span><span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">{label}</span></div>
      <p className="mt-4 text-3xl font-extrabold text-zinc-900 tracking-tight">{value}</p>
      <p className="mt-1 text-xs font-semibold text-zinc-500">{sub}</p>
    </Link>
  )
}
