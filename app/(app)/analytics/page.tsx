"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useWorkspace } from "@/components/providers/WorkspaceProvider"
import { analyzeContent } from "@/lib/content-intelligence"
import { withClientParam } from "@/lib/workspace-navigation"

type RawEvent = { event_type?: string; payload?: Record<string, unknown>; created_at?: string }
type RawJob = { job_type?: string; status?: string; title?: string; created_at?: string }

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const
const TIME_LABELS = ["Morning", "Midday", "Afternoon", "Evening"] as const
const dayIndex = (d: Date) => { const n = d.getDay(); return n === 0 ? 6 : n - 1 }
const timeBucket = (time: string | null | undefined): number => !time ? -1 : (() => { const h = parseInt(time.slice(0, 2), 10); if (h >= 5 && h < 12) return 0; if (h >= 12 && h < 14) return 1; if (h >= 14 && h < 18) return 2; return 3 })()
const isoDay = (iso: string) => { try { return new Date(iso).toISOString().slice(0, 10) } catch { return "" } }
const parsePostDate = (s: string): Date | null => { try { const d = new Date(s); return isNaN(d.getTime()) ? null : d } catch { return null } }

export default function AnalyticsPage() {
  const { state, loadEvents, loadJobs } = useWorkspace()
  const activeClientId = (state as { agency?: { activeClientId?: string | null } }).agency?.activeClientId || null
  const [events, setEvents] = useState<RawEvent[]>([])
  const [jobs, setJobs] = useState<RawJob[]>([])
  const [loading, setLoading] = useState(true)
  const [rangeDays, setRangeDays] = useState(30)

  useEffect(() => {
    let active = true
    Promise.all([loadEvents(300), loadJobs("", 100)]).then(([ev, jb]) => {
      if (!active) return
      setEvents(Array.isArray(ev) ? (ev as RawEvent[]) : [])
      setJobs(Array.isArray(jb) ? (jb as RawJob[]) : [])
    }).catch(() => {
      if (!active) return
      setEvents([])
      setJobs([])
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [loadEvents, loadJobs])

  const data = useMemo(() => {
    const byStatus = { draft: state.drafts.length, scheduled: state.scheduled.length, published: state.published.length, total: state.posts.length }
    const typeMap: Record<string, number> = {}
    for (const post of state.posts) {
      const key = post.type || "Unknown"
      typeMap[key] = (typeMap[key] || 0) + 1
    }
    const typeRows = Object.entries(typeMap).sort((a, b) => b[1] - a[1])
    const grid = Array.from({ length: 7 }, () => new Array<number>(4).fill(0))
    for (const post of [...state.scheduled, ...state.published]) {
      const date = parsePostDate(post.date)
      if (!date) continue
      const di = dayIndex(date)
      const ti = timeBucket(post.scheduledTime)
      if (ti >= 0) grid[di][ti]++
    }
    const gridMax = Math.max(1, ...grid.flat())
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const timeline = Array.from({ length: rangeDays }, (_, i) => {
      const d = new Date(today)
      d.setDate(today.getDate() - (rangeDays - 1 - i))
      return { key: d.toISOString().slice(0, 10), label: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }), count: 0 }
    })
    for (const event of events) {
      const createdAt = event.created_at
      if (!createdAt) continue
      const slot = timeline.find((item) => item.key === isoDay(createdAt))
      if (slot) slot.count++
    }
    const pendingApproval = state.posts.filter((post) => post.status === "pending_approval").length
    const rejected = state.posts.filter((post) => post.status === "rejected").length

    const scoreBuckets = { weak: 0, needsPolish: 0, solid: 0, strong: 0 }
    for (const post of state.posts) {
      const score = analyzeContent({ title: post.title, content: post.content, type: post.type, profile: state.profile }).overallScore
      if (score >= 82) scoreBuckets.strong++
      else if (score >= 68) scoreBuckets.solid++
      else if (score >= 52) scoreBuckets.needsPolish++
      else scoreBuckets.weak++
    }

    return {
      byStatus,
      pendingApproval,
      rejected,
      scoreBuckets,
      typeRows,
      grid,
      gridMax,
      timeline,
      timelineMax: Math.max(1, ...timeline.map((item) => item.count)),
      publishEvents: events.filter((event) => event.event_type === "post_published").length,
      scheduleEvents: events.filter((event) => event.event_type === "post_scheduled").length,
      draftEvents: events.filter((event) => event.event_type === "draft_saved").length,
      carouselCount: jobs.filter((job) => job.job_type === "carousel_generation").length,
    }
  }, [events, jobs, rangeDays, state])

  const hasData = state.posts.length > 0 || events.length > 0

  return (
    <div className="mx-auto max-w-6xl px-6 py-10 font-jakarta sm:px-10">
      <div className="relative mb-8 overflow-hidden rounded-2xl border border-zinc-100 bg-white px-6 py-5 shadow-sm">
        <div
          className="pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full"
          style={{ background: "radial-gradient(circle, rgba(13,74,69,0.1) 0%, transparent 70%)" }}
        />
        <div className="relative flex items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-zinc-900">Analytics</h1>
            <p className="mt-1 text-sm text-zinc-500">Graph view of your actual drafts, schedules, publishing activity, and job history.</p>
          </div>
          <Link href={withClientParam("/writer", activeClientId)} className="shrink-0 rounded-lg bg-teal px-4 py-2 text-sm font-semibold text-white hover:bg-teal-600">Write post</Link>
        </div>
      </div>

      {loading ? <div className="rounded-2xl border border-zinc-200 bg-white px-6 py-12 text-center text-sm text-zinc-500">Loading workspace data...</div> : null}
      {!loading && !hasData ? <div className="rounded-2xl border border-zinc-200 bg-white px-6 py-14 text-center"><p className="text-sm font-semibold text-zinc-900">No data yet</p><p className="mt-2 text-sm text-zinc-500">Analytics fill in as you draft, schedule, and publish posts.</p><Link href={withClientParam("/writer", activeClientId)} className="mt-5 inline-block rounded-lg bg-teal px-4 py-2 text-sm font-semibold text-white hover:bg-teal-600">Go to writer</Link></div> : null}

      {!loading && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Drafts" value={data.byStatus.draft} note="workspace" accent="zinc" />
            <Stat label="Scheduled" value={data.byStatus.scheduled} note="workspace" accent="amber" />
            <Stat label="Published" value={data.byStatus.published} note="workspace" accent="teal" />
            <Stat label="Total posts" value={data.byStatus.total} note="all statuses" accent="zinc" />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="In review" value={data.pendingApproval} note="pending approval" accent="blue" />
            <Stat label="Rejected" value={data.rejected} note="workspace" accent="red" />
            <Stat label="Carousel jobs" value={data.carouselCount} note="job history" accent="zinc" />
            <Stat label="Publish events" value={data.publishEvents} note="event log" accent="teal" />
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
            <section className="rounded-2xl border border-zinc-200 bg-white p-6">
              <div className="mb-5 flex items-end justify-between">
                <div>
                  <h2 className="text-base font-bold text-zinc-900">Activity timeline</h2>
              <p className="mt-0.5 text-xs text-zinc-500">Real event activity for the selected range.</p>
            </div>
                <select value={rangeDays} onChange={(e) => setRangeDays(Number(e.target.value))} className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-600 outline-none focus:border-teal">
                  {[14, 30, 90, 180, 365].map((days) => <option key={days} value={days}>{days}d</option>)}
                </select>
              </div>
              <div className="grid h-52 items-end gap-1 overflow-x-auto" style={{ gridTemplateColumns: `repeat(${rangeDays}, minmax(${rangeDays > 90 ? 4 : 18}px, 1fr))` }}>
                {data.timeline.map((item) => (
                  <div key={item.key} className="group flex h-full flex-col justify-end">
                    <div className="relative">
                      {item.count > 0 && (
                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 rounded bg-zinc-900 px-1.5 py-0.5 text-[9px] font-bold text-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                          {item.count}
                        </div>
                      )}
                      <div className="rounded-t-md transition-all group-hover:brightness-110" style={{ height: `${Math.max(6, (item.count / data.timelineMax) * 180)}px`, background: item.count > 0 ? "rgb(13,74,69)" : "rgb(228,228,231)" }} />
                    </div>
                    <p className="mt-1.5 text-center text-[9px] text-zinc-400 leading-tight">{item.label.split(" ")[0]}</p>
                    <p className="text-center text-[9px] text-zinc-400 leading-tight">{item.label.split(" ")[1]}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-zinc-200 bg-white p-6">
              <div className="mb-5">
                <h2 className="text-base font-bold text-zinc-900">Post mix</h2>
                <p className="mt-0.5 text-xs text-zinc-500">What you are creating most often.</p>
              </div>
              <div className="space-y-4">
                {!data.typeRows.length ? (
                  <p className="text-sm text-zinc-400">No post types yet.</p>
                ) : data.typeRows.map(([type, count]) => (
                  <div key={type}>
                    <div className="mb-1.5 flex items-center justify-between">
                      <span className="truncate text-sm text-zinc-700">{type}</span>
                      <span className="ml-3 shrink-0 font-bold text-zinc-900">{count}</span>
                    </div>
                    <div className="h-2 rounded-full bg-zinc-100">
                      <div className="h-full rounded-full bg-gold transition-all" style={{ width: `${(count / Math.max(1, data.byStatus.total)) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <section className="mt-6 rounded-2xl border border-zinc-200 bg-white p-6">
            <div className="mb-5">
              <h2 className="text-base font-bold text-zinc-900">Content score distribution</h2>
              <p className="mt-0.5 text-xs text-zinc-500">Internal quality scores across all workspace posts.</p>
            </div>
            {data.byStatus.total === 0 ? (
              <p className="text-sm text-zinc-400">No posts to score yet. Write and save your first draft to see scores here.</p>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { label: "Strong", count: data.scoreBuckets.strong, bar: "bg-teal", border: "border-l-teal", range: "82–100", valueColor: "text-teal" },
                  { label: "Solid", count: data.scoreBuckets.solid, bar: "bg-teal/50", border: "border-l-teal/50", range: "68–81", valueColor: "text-teal/80" },
                  { label: "Needs polish", count: data.scoreBuckets.needsPolish, bar: "bg-amber-400", border: "border-l-amber-400", range: "52–67", valueColor: "text-amber-700" },
                  { label: "Weak", count: data.scoreBuckets.weak, bar: "bg-zinc-300", border: "border-l-zinc-300", range: "0–51", valueColor: "text-zinc-500" },
                ].map((bucket) => (
                  <div key={bucket.label} className={`rounded-xl border border-zinc-100 border-l-[3px] bg-zinc-50/60 p-4 ${bucket.border}`}>
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs font-semibold text-zinc-600">{bucket.label}</span>
                      <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[9px] font-bold text-zinc-500">{bucket.range}</span>
                    </div>
                    <p className={`text-3xl font-bold ${bucket.valueColor}`}>{bucket.count}</p>
                    <div className="mt-2 h-1 rounded-full bg-zinc-200">
                      <div className={`h-full rounded-full transition-all ${bucket.bar}`} style={{ width: `${data.byStatus.total ? (bucket.count / data.byStatus.total) * 100 : 0}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="mt-6 rounded-2xl border border-zinc-200 bg-white p-6">
            <div className="mb-5">
              <h2 className="text-base font-bold text-zinc-900">Best time heatmap</h2>
              <p className="mt-0.5 text-xs text-zinc-500">Scheduled and published posts, grouped by weekday and time window.</p>
            </div>
            <div className="grid grid-cols-[80px_repeat(4,minmax(0,1fr))] gap-1.5">
              <div />
              {TIME_LABELS.map((label) => <div key={label} className="py-1 text-center text-[10px] font-bold uppercase tracking-wider text-zinc-400">{label}</div>)}
              {DAYS.map((day, row) => (
                <div key={day} className="contents">
                  <div className="flex items-center text-xs font-semibold text-zinc-500">{day}</div>
                  {data.grid[row].map((value, col) => (
                    <div key={`${day}-${col}`} className="group relative rounded-xl border border-zinc-100 py-3 text-center transition-all hover:scale-[1.02]" style={{ backgroundColor: value ? `rgba(13,74,69,${0.1 + (value / data.gridMax) * 0.65})` : "rgba(250,250,250,0.8)" }}>
                      <span className={`text-sm font-bold ${value ? "text-zinc-900" : "text-zinc-300"}`}>{value || "·"}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  )
}

function Stat({ label, value, note, accent }: { label: string; value: number; note: string; accent: "teal" | "amber" | "zinc" | "blue" | "red" }) {
  const borderColor = accent === "teal" ? "border-l-teal" : accent === "amber" ? "border-l-amber-400" : accent === "blue" ? "border-l-blue-400" : accent === "red" ? "border-l-red-400" : "border-l-zinc-300"
  const valueColor = accent === "teal" ? "text-teal" : accent === "amber" ? "text-amber-700" : accent === "blue" ? "text-blue-700" : accent === "red" ? "text-red-600" : "text-zinc-900"
  return (
    <div className={`rounded-xl border border-zinc-200 border-l-[3px] bg-white p-4 ${borderColor}`}>
      <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-400">{label}</p>
      <p className={`mt-1.5 text-3xl font-bold ${valueColor}`}>{value}</p>
      <p className="mt-0.5 text-[10px] uppercase tracking-wider text-zinc-400">{note}</p>
    </div>
  )
}
