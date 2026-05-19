"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useWorkspace } from "@/components/providers/WorkspaceProvider"
import { withClientParam } from "@/lib/workspace-navigation"

type RawEvent = { event_type?: string; payload?: Record<string, unknown>; created_at?: string }
type RawJob = { job_type?: string; status?: string; title?: string; created_at?: string }

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const
const TIME_LABELS = ["Morning\n5-12", "Midday\n12-14", "Afternoon\n14-18", "Evening\n18+"] as const
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
    for (const post of state.posts) { const key = post.type || "Unknown"; typeMap[key] = (typeMap[key] || 0) + 1 }
    const typeRows = Object.entries(typeMap).sort((a, b) => b[1] - a[1])
    const grid = Array.from({ length: 7 }, () => new Array<number>(4).fill(0))
    for (const post of [...state.scheduled, ...state.published]) { const date = parsePostDate(post.date); if (!date) continue; const di = dayIndex(date); const ti = timeBucket(post.scheduledTime); if (ti >= 0) grid[di][ti]++ }
    const gridMax = Math.max(1, ...grid.flat())
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const timeline = Array.from({ length: 14 }, (_, i) => { const d = new Date(today); d.setDate(today.getDate() - (13 - i)); return { key: d.toISOString().slice(0, 10), label: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }), count: 0 } })
    for (const event of events) { const createdAt = event.created_at; if (!createdAt) continue; const slot = timeline.find((item) => item.key === isoDay(createdAt)); if (slot) slot.count++ }
    const timelineMax = Math.max(1, ...timeline.map((item) => item.count))
    return { byStatus, typeRows, grid, gridMax, timeline, timelineMax, publishEvents: events.filter((event) => event.event_type === "post_published").length, scheduleEvents: events.filter((event) => event.event_type === "post_scheduled").length, draftEvents: events.filter((event) => event.event_type === "draft_saved").length, jobByStatus: jobs.reduce<Record<string, number>>((acc, job) => { const key = job.status || "unknown"; acc[key] = (acc[key] || 0) + 1; return acc }, {}), carouselCount: jobs.filter((job) => job.job_type === "carousel_generation").length }
  }, [events, jobs, state])

  const hasData = state.posts.length > 0 || events.length > 0

  return (
    <div className="mx-auto max-w-5xl px-6 py-10 font-jakarta sm:px-10">
      <div className="mb-8 flex items-end justify-between gap-4"><div><h1 className="text-3xl font-bold text-zinc-900">Analytics</h1><p className="mt-1 text-sm text-zinc-500">All metrics derived from your workspace events and post state only.</p></div><Link href={withClientParam("/writer", activeClientId)} className="shrink-0 rounded-lg bg-teal px-4 py-2 text-sm font-semibold text-white hover:bg-teal-600">Write post</Link></div>
      {loading && <div className="rounded-2xl border border-zinc-200 bg-white px-6 py-12 text-center text-sm text-zinc-500">Loading workspace data...</div>}
      {!loading && !hasData && <div className="rounded-2xl border border-zinc-200 bg-white px-6 py-14 text-center"><p className="text-sm font-semibold text-zinc-900">No data yet</p><p className="mt-2 text-sm text-zinc-500">Analytics populate as you draft, schedule, and publish posts from the writer.</p><Link href={withClientParam("/writer", activeClientId)} className="mt-5 inline-block rounded-lg bg-teal px-4 py-2 text-sm font-semibold text-white hover:bg-teal-600">Go to writer</Link></div>}
      {!loading && <><div className="grid grid-cols-2 gap-3 sm:grid-cols-4"><Stat label="Drafts" value={data.byStatus.draft} note="workspace state" /><Stat label="Scheduled" value={data.byStatus.scheduled} note="workspace state" /><Stat label="Published" value={data.byStatus.published} note="workspace state" /><Stat label="Total posts" value={data.byStatus.total} note="all statuses" /></div><div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4"><Stat label="Publish events" value={data.publishEvents} note="event log" /><Stat label="Schedule events" value={data.scheduleEvents} note="event log" /><Stat label="Draft events" value={data.draftEvents} note="event log" /><Stat label="Jobs" value={jobs.length} note={`${data.carouselCount} carousel`} /></div></>}
    </div>
  )
}

function Stat({ label, value, note }: { label: string; value: number; note: string }) { return <div className="rounded-xl border border-zinc-200 bg-white p-4"><p className="text-xs text-zinc-500">{label}</p><p className="mt-1 text-2xl font-bold text-zinc-900">{value}</p><p className="mt-0.5 text-[10px] uppercase tracking-wide text-zinc-400">{note}</p></div> }
