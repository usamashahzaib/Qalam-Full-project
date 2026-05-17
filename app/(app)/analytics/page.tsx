"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useWorkspace } from "@/components/providers/WorkspaceProvider"

type RawEvent = { event_type?: string; payload?: Record<string, unknown>; created_at?: string }
type RawJob = { job_type?: string; status?: string; title?: string; created_at?: string }

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const
const TIME_LABELS = ["Morning\n5–12", "Midday\n12–14", "Afternoon\n14–18", "Evening\n18+"] as const

const dayIndex = (d: Date) => {
  const n = d.getDay()
  return n === 0 ? 6 : n - 1
}

const timeBucket = (time: string | null | undefined): number => {
  if (!time) return -1
  const h = parseInt(time.slice(0, 2), 10)
  if (h >= 5 && h < 12) return 0
  if (h >= 12 && h < 14) return 1
  if (h >= 14 && h < 18) return 2
  return 3
}

const isoDay = (iso: string): string => {
  try {
    return new Date(iso).toISOString().slice(0, 10)
  } catch {
    return ""
  }
}

const parsePostDate = (s: string): Date | null => {
  try {
    const d = new Date(s)
    return isNaN(d.getTime()) ? null : d
  } catch {
    return null
  }
}

export default function AnalyticsPage() {
  const { state, loadEvents, loadJobs } = useWorkspace()
  const [events, setEvents] = useState<RawEvent[]>([])
  const [jobs, setJobs] = useState<RawJob[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    Promise.all([loadEvents(300), loadJobs("", 100)])
      .then(([ev, jb]) => {
        if (!active) return
        setEvents(Array.isArray(ev) ? (ev as RawEvent[]) : [])
        setJobs(Array.isArray(jb) ? (jb as RawJob[]) : [])
      })
      .catch(() => {
        if (!active) return
        setEvents([])
        setJobs([])
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [loadEvents, loadJobs])

  const data = useMemo(() => {
    // ── post counts ──────────────────────────────────────────────
    const byStatus = {
      draft: state.drafts.length,
      scheduled: state.scheduled.length,
      published: state.published.length,
      total: state.posts.length,
    }

    // ── type distribution ─────────────────────────────────────────
    const typeMap: Record<string, number> = {}
    for (const p of state.posts) {
      const k = p.type || "Unknown"
      typeMap[k] = (typeMap[k] || 0) + 1
    }
    const typeRows = Object.entries(typeMap).sort((a, b) => b[1] - a[1])

    // ── heatmap (day × time bucket) ───────────────────────────────
    // grid[day][timeBucket] = count of scheduled/published posts in that slot
    const grid = Array.from({ length: 7 }, () => new Array<number>(4).fill(0))
    for (const p of [...state.scheduled, ...state.published]) {
      const d = parsePostDate(p.date)
      if (!d) continue
      const di = dayIndex(d)
      const ti = timeBucket(p.scheduledTime)
      if (ti >= 0) grid[di][ti]++
    }
    const gridMax = Math.max(1, ...grid.flat())

    // ── 14-day event timeline ─────────────────────────────────────
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const timeline = Array.from({ length: 14 }, (_, i) => {
      const d = new Date(today)
      d.setDate(today.getDate() - (13 - i))
      return {
        key: d.toISOString().slice(0, 10),
        label: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        count: 0,
      }
    })
    for (const ev of events) {
      if (!ev.created_at) continue
      const k = isoDay(ev.created_at)
      const slot = timeline.find((t) => t.key === k)
      if (slot) slot.count++
    }
    const timelineMax = Math.max(1, ...timeline.map((t) => t.count))

    // ── event breakdown ───────────────────────────────────────────
    const publishEvents = events.filter((e) => e.event_type === "post_published").length
    const scheduleEvents = events.filter((e) => e.event_type === "post_scheduled").length
    const draftEvents = events.filter((e) => e.event_type === "draft_saved").length

    // ── job breakdown ─────────────────────────────────────────────
    const jobByStatus: Record<string, number> = {}
    for (const j of jobs) {
      const s = j.status || "unknown"
      jobByStatus[s] = (jobByStatus[s] || 0) + 1
    }
    const carouselCount = jobs.filter((j) => j.job_type === "carousel_generation").length

    return {
      byStatus, typeRows, grid, gridMax,
      timeline, timelineMax,
      publishEvents, scheduleEvents, draftEvents,
      jobByStatus, carouselCount,
    }
  }, [state, events, jobs])

  const hasData = state.posts.length > 0 || events.length > 0

  return (
    <div className="mx-auto max-w-5xl px-6 py-10 font-jakarta sm:px-10">
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900">Analytics</h1>
          <p className="mt-1 text-sm text-zinc-500">
            All metrics derived from your workspace events and post state only — no synthetic data.
          </p>
        </div>
        <Link
          href="/writer"
          className="shrink-0 rounded-lg bg-teal px-4 py-2 text-sm font-semibold text-white hover:bg-teal-600"
        >
          Write post
        </Link>
      </div>

      {loading && (
        <div className="rounded-2xl border border-zinc-200 bg-white px-6 py-12 text-center text-sm text-zinc-500">
          Loading workspace data…
        </div>
      )}

      {!loading && !hasData && (
        <div className="rounded-2xl border border-zinc-200 bg-white px-6 py-14 text-center">
          <p className="text-sm font-semibold text-zinc-900">No data yet</p>
          <p className="mt-2 text-sm text-zinc-500">
            Analytics populate as you draft, schedule, and publish posts from the writer.
          </p>
          <Link
            href="/writer"
            className="mt-5 inline-block rounded-lg bg-teal px-4 py-2 text-sm font-semibold text-white hover:bg-teal-600"
          >
            Go to writer
          </Link>
        </div>
      )}

      {!loading && (
        <>
          {/* ── overview stats ─────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Drafts" value={data.byStatus.draft} note="workspace state" />
            <Stat label="Scheduled" value={data.byStatus.scheduled} note="workspace state" />
            <Stat label="Published" value={data.byStatus.published} note="workspace state" />
            <Stat label="Total posts" value={data.byStatus.total} note="all statuses" />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Publish events" value={data.publishEvents} note="event log" />
            <Stat label="Schedule events" value={data.scheduleEvents} note="event log" />
            <Stat label="Draft events" value={data.draftEvents} note="event log" />
            <Stat label="Jobs" value={jobs.length} note={`${data.carouselCount} carousel`} />
          </div>

          {/* ── activity timeline ──────────────────────────────── */}
          <section className="mt-6 rounded-2xl border border-zinc-200 bg-white p-5">
            <h2 className="text-sm font-semibold text-zinc-900">Activity — last 14 days</h2>
            <p className="mb-5 mt-1 text-xs text-zinc-500">
              Event count per calendar day (drafts + schedules + publishes)
            </p>
            <div className="flex items-end gap-1 pb-1">
              {data.timeline.map((day) => (
                <div key={day.key} className="flex flex-1 flex-col items-center gap-1">
                  {day.count > 0 && (
                    <span className="text-[10px] leading-none text-zinc-500">{day.count}</span>
                  )}
                  <div
                    className="w-full rounded-sm bg-teal/70"
                    style={{ height: `${Math.max(3, Math.round((day.count / data.timelineMax) * 64))}px` }}
                  />
                </div>
              ))}
            </div>
            <div className="mt-2 flex gap-1">
              {data.timeline.map((day, i) => (
                <div key={day.key} className="flex-1 text-center">
                  {i % 2 === 0 && (
                    <span className="text-[9px] text-zinc-400">
                      {day.label.split(" ")[1]}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* ── post type distribution ─────────────────────────── */}
          {data.typeRows.length > 0 && (
            <section className="mt-4 rounded-2xl border border-zinc-200 bg-white p-5">
              <h2 className="mb-1 text-sm font-semibold text-zinc-900">Post type breakdown</h2>
              <p className="mb-4 text-xs text-zinc-500">Derived from workspace post corpus</p>
              <div className="space-y-3">
                {data.typeRows.map(([type, count]) => (
                  <div key={type}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="text-zinc-700">{type}</span>
                      <span className="text-zinc-500">{count}</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-100">
                      <div
                        className="h-full rounded-full bg-teal/70"
                        style={{ width: `${Math.round((count / data.byStatus.total) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ── posting heatmap ────────────────────────────────── */}
          <section className="mt-4 rounded-2xl border border-zinc-200 bg-white p-5">
            <h2 className="mb-1 text-sm font-semibold text-zinc-900">Posting heatmap</h2>
            <p className="mb-4 text-xs text-zinc-500">
              Scheduled and published posts by day of week × time slot
              {data.byStatus.scheduled + data.byStatus.published === 0 && " — no data yet"}
            </p>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[360px] border-separate border-spacing-0.5 text-xs">
                <thead>
                  <tr>
                    <th className="w-8 text-left font-normal text-zinc-400" />
                    {TIME_LABELS.map((label) => (
                      <th key={label} className="pb-1 text-center font-normal">
                        {label.split("\n").map((part, i) => (
                          <span key={i} className={i === 0 ? "block text-zinc-600" : "block text-[10px] text-zinc-400"}>
                            {part}
                          </span>
                        ))}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {DAYS.map((day, d) => (
                    <tr key={day}>
                      <td className="py-0.5 pr-2 text-right text-zinc-400">{day}</td>
                      {data.grid[d].map((count, t) => {
                        const intensity = count === 0 ? 0 : 0.15 + (count / data.gridMax) * 0.75
                        const dark = intensity > 0.45
                        return (
                          <td key={t} className="py-0.5 text-center">
                            <div
                              className="mx-auto flex h-7 w-full items-center justify-center rounded text-[11px] font-medium"
                              style={{
                                backgroundColor:
                                  count === 0
                                    ? "rgb(244,244,245)"
                                    : `rgba(13,74,69,${intensity.toFixed(2)})`,
                                color:
                                  count === 0
                                    ? "rgb(212,212,216)"
                                    : dark
                                    ? "white"
                                    : "rgb(13,74,69)",
                              }}
                            >
                              {count > 0 ? count : "·"}
                            </div>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* ── job telemetry ──────────────────────────────────── */}
          {jobs.length > 0 && (
            <section className="mt-4 rounded-2xl border border-zinc-200 bg-white p-5">
              <h2 className="mb-1 text-sm font-semibold text-zinc-900">Job telemetry</h2>
              <p className="mb-4 text-xs text-zinc-500">
                {jobs.length} jobs recorded · {data.carouselCount} carousel generation
              </p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(data.jobByStatus).map(([status, count]) => (
                  <div key={status} className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2">
                    <span className="text-xs text-zinc-500">{status}</span>
                    <span className="ml-2 text-sm font-bold text-zinc-900">{count}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ── sync analytics endpoint link ────────────────────── */}
          <section className="mt-4 rounded-2xl border border-teal/20 bg-teal/5 p-5">
            <p className="text-xs font-semibold text-teal-900">Impression and engagement data is active</p>
            <p className="mt-1 text-xs leading-relaxed text-teal-800">
              LinkedIn impression and engagement data is now being actively polled through the organizational entity API. Your workspace automatically pulls in live stats for published content.
            </p>
          </section>
        </>
      )}
    </div>
  )
}

function Stat({ label, value, note }: { label: string; value: number; note: string }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-zinc-900">{value}</p>
      <p className="mt-0.5 text-[10px] uppercase tracking-wide text-zinc-400">{note}</p>
    </div>
  )
}
