"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useWorkspace } from "@/components/providers/WorkspaceProvider"
import { usePosts } from "@/lib/hooks/usePosts"
import { useProfile } from "@/lib/hooks/useProfile"
import { LockedFeature } from "@/components/LockedFeature"
import { analyzeContent } from "@/lib/content-intelligence"
import { withClientParam } from "@/lib/workspace-navigation"

type RawEvent = { event_type?: string; payload?: Record<string, unknown>; created_at?: string }
type RawJob = { type?: string; status?: string; title?: string; created_at?: string }
type RangeOption = { label: string; value: number | "all" }

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const
const TIME_LABELS = ["Morning", "Midday", "Afternoon", "Evening"] as const
const dayIndex = (d: Date) => { const n = d.getDay(); return n === 0 ? 6 : n - 1 }
const timeBucket = (time: string | null | undefined): number => !time ? -1 : (() => { const h = parseInt(time.slice(0, 2), 10); if (h >= 5 && h < 12) return 0; if (h >= 12 && h < 14) return 1; if (h >= 14 && h < 18) return 2; return 3 })()
const isoDay = (iso: string) => { try { return new Date(iso).toISOString().slice(0, 10) } catch { return "" } }
const parsePostDate = (s: string) => { try { const d = new Date(s); return isNaN(d.getTime()) ? null : d } catch { return null } }

export default function AnalyticsPage() {
  const { activeClientId } = useWorkspace()
  const { posts, drafts, scheduled, published, loadEvents, loadJobs } = usePosts()
  const { profile } = useProfile()
  const [events, setEvents] = useState<RawEvent[]>([])
  const [jobs, setJobs] = useState<RawJob[]>([])
  const [carouselDbCount, setCarouselDbCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [rangeDays, setRangeDays] = useState<number | "all">(30)
  const [analyticsNow] = useState(() => Date.now())

  useEffect(() => {
    let active = true
    Promise.all([
      loadEvents(500),
      loadJobs("", 200),
      fetch("/api/carousel").then((r) => r.json()).catch(() => ({ carousels: [] })),
    ]).then(([ev, jb, carouselRes]) => {
      if (!active) return
      setEvents(Array.isArray(ev) ? (ev as RawEvent[]) : [])
      setJobs(Array.isArray(jb) ? (jb as RawJob[]) : [])
      const carousels = (carouselRes as { carousels?: unknown[] }).carousels
      setCarouselDbCount(Array.isArray(carousels) ? carousels.length : 0)
    }).catch(() => {
      if (!active) return
      setEvents([])
      setJobs([])
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [loadEvents, loadJobs])

  const analytics = useMemo(() => {
    const analyses = posts.map((post) => ({
      post,
      analysis: analyzeContent({ title: post.title, content: post.content, type: post.type, profile: profile }),
    }))
    const earliestIso = [events[events.length - 1]?.created_at, ...posts.map((post) => post.scheduledTime || post.date)].filter(Boolean)[0]
    const earliestDate = earliestIso ? new Date(String(earliestIso)) : null
    const allTimeDays = earliestDate ? Math.max(14, Math.ceil((analyticsNow - earliestDate.getTime()) / 86400000) + 1) : 14
    const selectedDays = rangeDays === "all" ? allTimeDays : rangeDays
    const rangeOptions: RangeOption[] = [14, 30, 90, 180, 365].map((value) => ({ label: `${value}d`, value }))
    if (allTimeDays > 365) rangeOptions.push({ label: "All time", value: "all" })

    const byStatus = {
      draft: drafts.length,
      scheduled: scheduled.length,
      published: published.length,
      total: posts.length,
    }

    const typeMap: Record<string, number> = {}
    for (const post of posts) typeMap[post.type || "Unknown"] = (typeMap[post.type || "Unknown"] || 0) + 1
    const typeRows = Object.entries(typeMap).sort((a, b) => b[1] - a[1])

    const grid = Array.from({ length: 7 }, () => new Array<number>(4).fill(0))
    for (const post of [...scheduled, ...published]) {
      const date = parsePostDate(post.date)
      if (!date) continue
      const di = dayIndex(date)
      const ti = timeBucket(post.scheduledTime)
      if (ti >= 0) grid[di][ti]++
    }

    const today = new Date(); today.setHours(0, 0, 0, 0)
    const timeline = Array.from({ length: selectedDays }, (_, index) => {
      const d = new Date(today)
      d.setDate(today.getDate() - (selectedDays - 1 - index))
      return { key: d.toISOString().slice(0, 10), label: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }), count: 0 }
    })
    for (const event of events) {
      const createdAt = event.created_at
      if (!createdAt) continue
      const slot = timeline.find((item) => item.key === isoDay(createdAt))
      if (slot) slot.count++
    }

    const pendingApproval = posts.filter((post) => post.status === "pending_approval").length
    const rejected = posts.filter((post) => post.status === "rejected").length
    const scoreBuckets = { weak: 0, needsPolish: 0, solid: 0, strong: 0 }
    const dimensionSums: Record<string, number> = {}
    for (const item of analyses) {
      const score = item.analysis.overallScore
      if (score >= 90) scoreBuckets.strong++
      else if (score >= 75) scoreBuckets.solid++
      else if (score >= 60) scoreBuckets.needsPolish++
      else scoreBuckets.weak++
      for (const dimension of item.analysis.scores) {
        dimensionSums[dimension.label] = (dimensionSums[dimension.label] || 0) + dimension.score
      }
    }

    const avgScore = analyses.length ? Math.round(analyses.reduce((sum, item) => sum + item.analysis.overallScore, 0) / analyses.length) : 0
    const dimensionAverages = Object.entries(dimensionSums).map(([label, total]) => ({ label, score: Math.round(total / Math.max(1, analyses.length)) })).sort((a, b) => a.score - b.score)
    const weakestDimension = dimensionAverages[0] || null
    const strongestType = typeRows[0] || null
    const publishReady = analyses.filter((item) => item.analysis.overallScore >= 90).length
    const reviewPressure = pendingApproval > 0 ? "Approval queue has active work." : rejected > 0 ? "Rejections need revision attention." : "Review flow is clear."

    return {
      byStatus,
      avgScore,
      publishReady,
      pendingApproval,
      rejected,
      scoreBuckets,
      typeRows,
      strongestType,
      weakestDimension,
      dimensionAverages,
      grid,
      gridMax: Math.max(1, ...grid.flat()),
      timeline,
      timelineMax: Math.max(1, ...timeline.map((item) => item.count)),
      rangeOptions,
      selectedDays,
      publishEvents: events.filter((event) => event.event_type === "post_published").length,
      scheduleEvents: events.filter((event) => event.event_type === "post_scheduled").length,
      draftEvents: events.filter((event) => event.event_type === "draft_saved").length,
      carouselCount: carouselDbCount,
      reviewPressure,
    }
  }, [analyticsNow, carouselDbCount, drafts, events, jobs, posts, profile, published, rangeDays, scheduled])

  const hasData = posts.length > 0 || events.length > 0 || carouselDbCount > 0

  return (
    <LockedFeature feature="Analytics dashboard" requiredPlan="Solo">
    <div className="mx-auto max-w-6xl px-6 py-10 font-jakarta sm:px-10">
      <div className="relative mb-8 overflow-hidden rounded-2xl border border-zinc-100 bg-white px-6 py-5 shadow-sm">
        <div className="pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full" style={{ background: "radial-gradient(circle, rgba(13,74,69,0.1) 0%, transparent 70%)" }} />
        <div className="relative flex items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-zinc-900">Analytics</h1>
            <p className="mt-1 text-sm text-zinc-500">Workspace health across quality, publishing flow, timing, and output mix.</p>
          </div>
          <Link href={withClientParam("/writer", activeClientId)} className="shrink-0 rounded-lg bg-teal px-4 py-2 text-sm font-semibold text-white hover:bg-teal-600">Write post</Link>
        </div>
      </div>

      {loading ? <div className="rounded-2xl border border-zinc-200 bg-white px-6 py-12 text-center text-sm text-zinc-500">Loading workspace data...</div> : null}
      {!loading && !hasData ? <div className="rounded-2xl border border-zinc-200 bg-white px-6 py-14 text-center"><p className="text-sm font-semibold text-zinc-900">No data yet</p><p className="mt-2 text-sm text-zinc-500">Analytics fill in as you draft, schedule, publish, and generate assets.</p><Link href={withClientParam("/writer", activeClientId)} className="mt-5 inline-block rounded-lg bg-teal px-4 py-2 text-sm font-semibold text-white hover:bg-teal-600">Go to writer</Link></div> : null}

      {!loading ? (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Drafts" value={analytics.byStatus.draft} note="workspace" accent="zinc" />
            <Stat label="Scheduled" value={analytics.byStatus.scheduled} note="workspace" accent="amber" />
            <Stat label="Published" value={analytics.byStatus.published} note="workspace" accent="teal" />
            <Stat label="Total posts" value={analytics.byStatus.total} note="all statuses" accent="zinc" />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Avg score" value={analytics.avgScore} note="quality baseline" accent={analytics.avgScore >= 90 ? "teal" : analytics.avgScore >= 75 ? "amber" : "red"} />
            <Stat label="90+ ready" value={analytics.publishReady} note="copy-paste ready" accent="teal" />
            <Stat label="In review" value={analytics.pendingApproval} note="approval queue" accent="blue" />
            <Stat label="Carousel jobs" value={analytics.carouselCount} note="deck generation" accent="zinc" />
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <section className="rounded-2xl border border-zinc-200 bg-white p-6">
              <div className="mb-5 flex items-end justify-between">
                <div>
                  <h2 className="text-base font-bold text-zinc-900">Activity timeline</h2>
                  <p className="mt-0.5 text-xs text-zinc-500">Real event activity for the selected range.</p>
                </div>
                <select value={String(rangeDays)} onChange={(e) => setRangeDays(e.target.value === "all" ? "all" : Number(e.target.value))} className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-600 outline-none focus:border-teal">
                  {analytics.rangeOptions.map((option) => <option key={String(option.value)} value={String(option.value)}>{option.label}</option>)}
                </select>
              </div>
              <div className="grid h-52 items-end gap-1 overflow-x-auto" style={{ gridTemplateColumns: `repeat(${analytics.selectedDays}, minmax(${analytics.selectedDays > 90 ? 4 : 18}px, 1fr))` }}>
                {analytics.timeline.map((item) => (
                  <div key={item.key} className="group flex h-full flex-col justify-end">
                    <div className="relative">
                      {item.count > 0 ? <div className="pointer-events-none absolute -top-6 left-1/2 -translate-x-1/2 rounded bg-zinc-900 px-1.5 py-0.5 text-[9px] font-bold text-white opacity-0 transition-opacity group-hover:opacity-100">{item.count}</div> : null}
                      <div className="rounded-t-md transition-all group-hover:brightness-110" style={{ height: `${Math.max(6, (item.count / analytics.timelineMax) * 180)}px`, background: item.count > 0 ? "rgb(13,74,69)" : "rgb(228,228,231)" }} />
                    </div>
                    <p className="mt-1.5 text-center text-[9px] leading-tight text-zinc-400">{item.label.split(" ")[0]}</p>
                    <p className="text-center text-[9px] leading-tight text-zinc-400">{item.label.split(" ")[1]}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="space-y-6">
              <div className="rounded-2xl border border-zinc-200 bg-white p-6">
                <h2 className="text-base font-bold text-zinc-900">Workspace intelligence</h2>
                <div className="mt-4 space-y-3">
                  <InsightRow label="Strongest format" value={analytics.strongestType ? `${analytics.strongestType[0]} (${analytics.strongestType[1]})` : "No post mix yet"} />
                  <InsightRow label="Weakest dimension" value={analytics.weakestDimension ? `${analytics.weakestDimension.label} (${analytics.weakestDimension.score}/100)` : "No quality pattern yet"} />
                  <InsightRow label="Review pressure" value={analytics.reviewPressure} />
                  <InsightRow label="Event volume" value={`${analytics.publishEvents} published, ${analytics.scheduleEvents} scheduled, ${analytics.draftEvents} draft saves`} />
                </div>
              </div>

              <div className="rounded-2xl border border-zinc-200 bg-white p-6">
                <h2 className="text-base font-bold text-zinc-900">Post mix</h2>
                <p className="mt-0.5 text-xs text-zinc-500">What this workspace creates most often.</p>
                <div className="mt-4 space-y-4">
                  {!analytics.typeRows.length ? <p className="text-sm text-zinc-400">No post types yet.</p> : analytics.typeRows.map(([type, count]) => (
                    <div key={type}>
                      <div className="mb-1.5 flex items-center justify-between">
                        <span className="truncate text-sm text-zinc-700">{type}</span>
                        <span className="ml-3 shrink-0 font-bold text-zinc-900">{count}</span>
                      </div>
                      <div className="h-2 rounded-full bg-zinc-100"><div className="h-full rounded-full bg-gold transition-all" style={{ width: `${(count / Math.max(1, analytics.byStatus.total)) * 100}%` }} /></div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>

          <section className="mt-6 rounded-2xl border border-zinc-200 bg-white p-6">
            <div className="mb-5">
              <h2 className="text-base font-bold text-zinc-900">Content score distribution</h2>
              <p className="mt-0.5 text-xs text-zinc-500">Internal quality scores across all workspace posts.</p>
            </div>
            {analytics.byStatus.total === 0 ? <p className="text-sm text-zinc-400">No posts to score yet.</p> : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { label: "Strong", count: analytics.scoreBuckets.strong, bar: "bg-teal", border: "border-l-teal", range: "90-100", valueColor: "text-teal" },
                  { label: "Solid", count: analytics.scoreBuckets.solid, bar: "bg-teal/50", border: "border-l-teal/50", range: "75-89", valueColor: "text-teal/80" },
                  { label: "Needs polish", count: analytics.scoreBuckets.needsPolish, bar: "bg-amber-400", border: "border-l-amber-400", range: "60-74", valueColor: "text-amber-700" },
                  { label: "Weak", count: analytics.scoreBuckets.weak, bar: "bg-zinc-300", border: "border-l-zinc-300", range: "0-59", valueColor: "text-zinc-500" },
                ].map((bucket) => (
                  <div key={bucket.label} className={`rounded-xl border border-zinc-100 border-l-[3px] bg-zinc-50/60 p-4 ${bucket.border}`}>
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs font-semibold text-zinc-600">{bucket.label}</span>
                      <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[9px] font-bold text-zinc-500">{bucket.range}</span>
                    </div>
                    <p className={`text-3xl font-bold ${bucket.valueColor}`}>{bucket.count}</p>
                    <div className="mt-2 h-1 rounded-full bg-zinc-200"><div className={`h-full rounded-full transition-all ${bucket.bar}`} style={{ width: `${analytics.byStatus.total ? (bucket.count / analytics.byStatus.total) * 100 : 0}%` }} /></div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="mt-6 grid gap-6 lg:grid-cols-[1fr_1fr]">
            <div className="rounded-2xl border border-zinc-200 bg-white p-6">
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
                    {analytics.grid[row].map((value, col) => (
                      <div key={`${day}-${col}`} className="group relative rounded-xl border border-zinc-100 py-3 text-center transition-all hover:scale-[1.02]" style={{ backgroundColor: value ? `rgba(13,74,69,${0.1 + (value / analytics.gridMax) * 0.65})` : "rgba(250,250,250,0.8)" }}>
                        <span className={`text-sm font-bold ${value ? "text-zinc-900" : "text-zinc-300"}`}>{value || "-"}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white p-6">
              <div className="mb-5">
                <h2 className="text-base font-bold text-zinc-900">Dimension averages</h2>
                <p className="mt-0.5 text-xs text-zinc-500">Where this workspace is consistently strong or weak.</p>
              </div>
              <div className="space-y-3">
                {!analytics.dimensionAverages.length ? <p className="text-sm text-zinc-400">No scored drafts yet.</p> : analytics.dimensionAverages.map((item) => (
                  <div key={item.label}>
                    <div className="mb-1.5 flex items-center justify-between">
                      <span className="text-sm text-zinc-700">{item.label}</span>
                      <span className={`text-sm font-bold ${item.score >= 90 ? "text-teal" : item.score >= 75 ? "text-amber-700" : "text-red-500"}`}>{item.score}</span>
                    </div>
                    <div className="h-2 rounded-full bg-zinc-100"><div className={`h-full rounded-full ${item.score >= 90 ? "bg-teal" : item.score >= 75 ? "bg-amber-400" : "bg-red-400"}`} style={{ width: `${item.score}%` }} /></div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </>
      ) : null}
    </div>
    </LockedFeature>
  )
}

function InsightRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-3">
      <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-400">{label}</p>
      <p className="mt-1 text-sm leading-relaxed text-zinc-700">{value}</p>
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
