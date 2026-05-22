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
  MicroscopeIcon,
  CarouselIcon,
  TeamIcon,
  VoiceIcon,
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
  const [statsError, setStatsError] = useState<string | null>(null)

  const fetchStats = useCallback(async () => {
    setStatsError(null)
    try {
      const res = await fetch(withWorkspaceKey("/api/dashboard/stats", activeClientId))
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to load dashboard stats")
      setStats(data.stats)
    } catch (e) {
      setStatsError((e as Error).message)
    } finally {
      // Dashboard renders workspace counts immediately; DB stats hydrate in place.
    }
  }, [activeClientId])

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchStats() }, [fetchStats])

  const isLoading = isLoadingPosts && !posts.length
  const liveCounts = {
    draft: posts.filter((post) => post.status === "draft").length,
    scheduled: posts.filter((post) => post.status === "scheduled").length,
    published: posts.filter((post) => post.status === "published").length,
    pending_approval: posts.filter((post) => post.status === "pending_approval").length,
    failed: posts.filter((post) => post.status === "failed").length,
    total: posts.length,
  }
  const recentPosts = [...posts].sort((a, b) => a.updatedAt > b.updatedAt ? -1 : 1).slice(0, 6)
  const setupItems = [
    { key: "voice", title: "Set your voice fingerprint", minutes: "5 min", done: Boolean(state.profile.name && state.profile.tone && state.profile.industry), href: withClientParam("/voice", activeClientId), icon: VoiceIcon, summary: "Lock tone, industry, goals, and LinkedIn URL before you scale drafts." },
    { key: "writer", title: "Write your first post in AI Writer", minutes: "10 min", done: posts.length > 0, href: withClientParam("/writer", activeClientId), icon: ComposeIcon, summary: "Generate, score, improve hooks, and keep only publish-ready drafts." },
    { key: "library", title: "Load client-aware templates", minutes: "3 min", done: posts.some((post) => post.status === "published"), href: withClientParam("/library", activeClientId), icon: LibraryIcon, summary: "Use personalized post structures and recycle your strongest published work." },
    { key: "planner", title: "Schedule with the planner", minutes: "2 min", done: posts.some((post) => post.status === "scheduled"), href: withClientParam("/calendar", activeClientId), icon: CalendarIcon, summary: "Queue future posts only. Past dates and passed minutes stay locked." },
    { key: "research", title: "Analyze competitor paste", minutes: "5 min", done: Boolean(stats?.recentJobs.some((job) => job.type === "competitor_analysis")), href: withClientParam("/competitors", activeClientId), icon: MicroscopeIcon, summary: "Paste raw LinkedIn page text. Qalam strips UI noise and extracts real positioning signals." },
    { key: "analytics", title: "Review analytics and approvals", minutes: "4 min", done: Boolean(stats?.recentEvents.length), href: withClientParam("/analytics", activeClientId), icon: AnalyticsIcon, summary: "Check score mix, publish activity, job health, and review pressure." },
    { key: "carousels", title: "Build a carousel deck", minutes: "4 min", done: Boolean(stats?.recentJobs.some((job) => job.type === "carousel_generation")), href: withClientParam("/carousels", activeClientId), icon: CarouselIcon, summary: "Turn strong posts into editable slides without generic filler pages." },
    { key: "agency", title: "Manage client workspace access", minutes: "5 min", done: Boolean(activeClientId || state.agency.clients.length), href: withClientParam("/agency", activeClientId), icon: TeamIcon, summary: "Separate clients, roles, approvals, and voice memory across workspaces." },
  ]
  const setupDone = setupItems.filter((item) => item.done).length

  return (
    <div className="mx-auto max-w-6xl px-6 py-8 font-jakarta sm:px-10">
      <div className="relative mb-8 overflow-hidden rounded-3xl border border-teal/10 bg-gradient-to-br from-teal to-teal-950 p-6 text-white shadow-lg sm:p-8">
        <div className="absolute inset-y-0 right-0 w-[42%] opacity-40" style={{ background: "linear-gradient(135deg, transparent 0 32%, rgba(201,135,31,0.12) 32% 32.4%, transparent 32.4%), linear-gradient(90deg, transparent 0 74%, rgba(255,255,255,0.08) 74% 74.2%, transparent 74.2%)" }} />
        <div className="relative z-10 flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
          <div>
            <span className="rounded-full border border-gold/20 bg-gold/15 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-gold">
              {activeClientId ? "Client Workspace" : "Active Workspace"}
            </span>
            <h1 className="mt-3 text-3xl font-extrabold tracking-tight">Welcome back, {user?.firstName || "Creator"}!</h1>
            <p className="mt-2 max-w-xl text-sm font-medium leading-relaxed text-teal-100/70">Your LinkedIn content workspace. Stats pulled live from the active workspace.</p>
          </div>
          <Link href={withClientParam("/writer", activeClientId)} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-gold px-5 py-3 text-sm font-bold text-teal-950 transition-all hover:scale-[1.02] hover:bg-gold-600 active:scale-[0.98] shadow-md shadow-gold/10">
            <ComposeIcon className="h-4 w-4" />
            Write Post
          </Link>
        </div>
      </div>

      {statsError ? <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">Dashboard data is unavailable right now. <button onClick={fetchStats} className="font-semibold underline">Retry</button></div> : null}

      {isLoading ? (
        <div className="space-y-6 animate-pulse">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">{[1, 2, 3, 4].map((i) => <div key={i} className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"><div className="mb-4 h-3 w-16 rounded bg-zinc-200" /><div className="mb-3 h-8 w-12 rounded bg-zinc-200" /><div className="h-2.5 w-24 rounded bg-zinc-100" /></div>)}</div>
          <div className="mt-8 h-64 rounded-2xl border border-zinc-200 bg-white shadow-sm" />
        </div>
      ) : (
        <div className="space-y-6">
          <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-zinc-100 bg-zinc-50/50 px-6 py-5">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-zinc-400">Getting Started</p>
                <h2 className="mt-1 text-xl font-bold text-zinc-900">Know what each tab does before you scale output</h2>
                <p className="mt-1 max-w-2xl text-sm text-zinc-500">Each step explains the surface, why it matters, and the next action.</p>
              </div>
              <div className="min-w-[180px] rounded-2xl border border-zinc-200 bg-white px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-400">Your progress</p>
                <p className="mt-1 text-2xl font-extrabold text-zinc-900">{setupDone}<span className="text-sm font-medium text-zinc-400">/{setupItems.length}</span></p>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-100"><div className="h-full rounded-full bg-gradient-to-r from-teal to-gold" style={{ width: `${Math.max(8, Math.round((setupDone / setupItems.length) * 100))}%` }} /></div>
              </div>
            </div>
            <div className="grid gap-3 p-5 lg:grid-cols-2">
              {setupItems.map(({ key, title, minutes, done, href, icon: Icon, summary }) => (
                <Link key={key} href={href} className="group rounded-2xl border border-zinc-200 bg-zinc-50/60 p-4 transition-all hover:border-teal/25 hover:bg-white hover:shadow-sm">
                  <div className="flex items-start gap-3">
                    <span className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${done ? "bg-teal text-white" : "border border-zinc-200 bg-white text-teal"}`}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-bold text-zinc-900">{title}</h3>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${done ? "bg-emerald-50 text-emerald-700" : "bg-zinc-200 text-zinc-600"}`}>{done ? "Done" : "Next"}</span>
                        <span className="text-[11px] text-zinc-400">{minutes}</span>
                      </div>
                      <p className="mt-1.5 text-sm leading-relaxed text-zinc-600">{summary}</p>
                      <span className="mt-3 inline-flex text-xs font-bold text-teal transition-colors group-hover:text-teal-700">Open tab &gt;</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <StatCard icon={ComposeIcon} label="Drafts" value={String(stats?.posts.draft ?? liveCounts.draft)} sub="in database" href={withClientParam("/writer", activeClientId)} />
            <StatCard icon={CalendarIcon} label="Scheduled" value={String(stats?.posts.scheduled ?? liveCounts.scheduled)} sub="queued for publish" href={withClientParam("/calendar", activeClientId)} />
            <StatCard icon={LibraryIcon} label="Published" value={String(stats?.posts.published ?? liveCounts.published)} sub="on LinkedIn" href={withClientParam("/library", activeClientId)} />
            <StatCard icon={AnalyticsIcon} label="Pending Review" value={String(stats?.pendingApprovals ?? liveCounts.pending_approval)} sub="awaiting approval" href={withClientParam("/approvals", activeClientId)} highlight={(stats?.pendingApprovals ?? liveCounts.pending_approval) > 0} />
          </div>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <StatCard icon={GrowthIcon} label="Total Posts" value={String(stats?.posts.total ?? liveCounts.total)} sub="all statuses" href={withClientParam("/library", activeClientId)} />
            <StatCard icon={AnalyticsIcon} label="Failed" value={String(stats?.posts.failed ?? liveCounts.failed)} sub="publish errors" href={withClientParam("/analytics", activeClientId)} />
            <StatCard icon={GrowthIcon} label="Jobs Run" value={String(stats?.recentJobs.length ?? 0)} sub="recent background tasks" href={withClientParam("/analytics", activeClientId)} />
            <StatCard icon={ComposeIcon} label="Events" value={String(stats?.recentEvents.length ?? 0)} sub="recent activity" href={withClientParam("/analytics", activeClientId)} />
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="flex flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm md:col-span-2">
              <div className="flex items-center justify-between border-b border-zinc-100 bg-zinc-50/50 px-6 py-4"><h2 className="text-sm font-bold text-zinc-900">Recent Posts</h2><span className="text-xs font-semibold text-zinc-500">{posts.length} total in workspace</span></div>
              <div className="flex-1 divide-y divide-zinc-100">
                {!recentPosts.length ? (
                  <div className="px-6 py-12 text-center"><p className="text-sm font-medium text-zinc-500">No posts yet.</p><Link href={withClientParam("/writer", activeClientId)} className="mt-3 inline-flex text-xs font-bold text-teal hover:underline">Start writing {">"}</Link></div>
                ) : recentPosts.map((post) => (
                  <div key={post.id} className="flex items-center justify-between px-6 py-3.5 transition-colors hover:bg-zinc-50/80">
                    <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-zinc-900">{post.title}</p><p className="mt-0.5 text-xs text-zinc-500">{post.type}</p></div>
                    <div className="ml-4 flex shrink-0 items-center gap-3">
                      <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase ${post.status === "published" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : post.status === "scheduled" ? "border-amber-200 bg-amber-50 text-amber-700" : post.status === "pending_approval" ? "border-blue-200 bg-blue-50 text-blue-700" : post.status === "failed" ? "border-red-200 bg-red-50 text-red-700" : "border-zinc-200 bg-zinc-100 text-zinc-600"}`}>{post.status.replace(/_/g, " ")}</span>
                      <button className="text-xs font-semibold text-teal hover:underline" onClick={() => { persistWriterIntent({ id: post.id, title: post.title, content: post.content, type: post.type, externalPostUrn: post.externalPostUrn }, /^\d{4}-\d{2}-\d{2}$/.test(post.date) ? post.date : null); window.location.href = withClientParam("/writer", activeClientId) }}>Edit</button>
                    </div>
                  </div>
                ))}
              </div>
              {recentPosts.length ? <div className="flex items-center justify-between border-t border-zinc-100 bg-zinc-50/30 px-6 py-3"><span className="text-xs text-zinc-400">Showing {recentPosts.length} of {posts.length}</span><Link href={withClientParam("/library", activeClientId)} className="text-xs font-bold text-teal transition-colors hover:text-teal-700">View all {">"}</Link></div> : null}
            </div>

            <div className="flex flex-col gap-4">
              {(stats?.pendingApprovals ?? 0) > 0 ? <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4"><p className="text-sm font-bold text-amber-800">{stats!.pendingApprovals} post{stats!.pendingApprovals > 1 ? "s" : ""} awaiting review</p><p className="mt-1 text-xs text-amber-700">Team members are waiting for approval.</p><Link href={withClientParam("/approvals", activeClientId)} className="mt-3 inline-block rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-amber-700">Review now {">"}</Link></div> : null}

              <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
                <h3 className="mb-3 text-sm font-bold text-zinc-900">Quick actions</h3>
                <div className="space-y-2">
                  {[
                    { label: "Write a post", href: "/writer" },
                    { label: "Generate carousel", href: "/writer" },
                    { label: "AI Strategist chat", href: "/chat" },
                    { label: "Review approvals", href: "/approvals" },
                    { label: "View analytics", href: "/analytics" },
                  ].map(({ label, href }) => <Link key={href + label} href={withClientParam(href, activeClientId)} className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 hover:text-zinc-900">{label}</Link>)}
                </div>
              </div>

              {(stats?.recentJobs.length ?? 0) > 0 ? <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm"><h3 className="mb-3 text-sm font-bold text-zinc-900">Recent jobs</h3><div className="space-y-2">{stats!.recentJobs.slice(0, 5).map((job, i) => <div key={i} className="flex items-center justify-between gap-2"><span className="truncate text-xs text-zinc-600">{job.type || "background_job"}</span><span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${job.status === "completed" ? "bg-emerald-50 text-emerald-700" : job.status === "failed" ? "bg-red-50 text-red-700" : "bg-zinc-100 text-zinc-600"}`}>{job.status}</span></div>)}</div></div> : null}

              {stats?.lastUpdated ? <p className="text-center text-[10px] text-zinc-400">Stats from DB - {new Date(stats.lastUpdated).toLocaleTimeString()} - <button onClick={fetchStats} className="underline hover:text-zinc-600">Refresh</button></p> : null}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ icon: Icon, label, value, sub, href, highlight }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; sub: string; href: string; highlight?: boolean }) {
  return (
    <Link href={href} className={`group block rounded-2xl border bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${highlight ? "border-amber-300 bg-amber-50/30" : "border-zinc-200"}`}>
      <div className="flex items-center gap-3"><span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all ${highlight ? "bg-amber-100 text-amber-700" : "bg-teal/5 text-teal group-hover:bg-teal group-hover:text-white"}`}><Icon className="h-5 w-5" /></span><span className="text-xs font-bold uppercase tracking-wider text-zinc-400">{label}</span></div>
      <p className="mt-4 text-3xl font-extrabold tracking-tight text-zinc-900">{value}</p>
      <p className="mt-1 text-xs font-semibold text-zinc-500">{sub}</p>
    </Link>
  )
}
