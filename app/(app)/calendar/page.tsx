"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/providers/AuthProvider"
import { useWorkspace, type WorkspacePost } from "@/components/providers/WorkspaceProvider"
import { shareToLinkedIn } from "@/lib/api/client"
import { persistWriterIntent, withClientParam } from "@/lib/workspace-navigation"

const normalizeLinkedInUrn = (value: string) => {
  const urn = value.trim()
  if (!urn) return ""
  return urn.startsWith("urn:") ? urn : `urn:li:share:${urn}`
}

const monthLabel = (date: Date) => date.toLocaleDateString("en-US", { month: "long", year: "numeric" })
const toDate = (value: string) => new Date(`${value}T00:00:00`)
const isIsoDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value)
const todayIso = () => {
  const d = new Date()
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 10)
}
const isPastDay = (value: string) => isIsoDate(value) && value < todayIso()

const goToWriter = (router: ReturnType<typeof useRouter>, clientId?: string | null, post?: WorkspacePost, date?: string) => {
  if (post) persistWriterIntent(post, date || null)
  else if (date) sessionStorage.setItem("writerScheduleDate", date)
  router.push(withClientParam("/writer", clientId))
}

export default function CalendarPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { state, publishPost, createJob, workspaceId } = useWorkspace()
  const activeClientId = (state as { agency?: { activeClientId?: string | null } }).agency?.activeClientId || null
  const [status, setStatus] = useState<string | null>(null)
  const [publishingId, setPublishingId] = useState<string | null>(null)
  const [monthCursor, setMonthCursor] = useState(() => {
    const scheduledDate = state.scheduled.find((post) => isIsoDate(post.date))?.date
    return scheduledDate ? toDate(scheduledDate) : new Date()
  })
  const [selectedDay, setSelectedDay] = useState(new Date().toISOString().slice(0, 10))

  const scheduledByDay = useMemo(() => {
    const map = new Map<string, WorkspacePost[]>()
    state.scheduled.filter((post) => isIsoDate(post.date)).forEach((post) => {
      const bucket = map.get(post.date) || []
      bucket.push(post)
      map.set(post.date, bucket)
    })
    return map
  }, [state.scheduled])

  const draftByDay = useMemo(() => {
    const map = new Map<string, WorkspacePost[]>()
    state.drafts.filter((post) => isIsoDate(post.date)).forEach((post) => {
      const bucket = map.get(post.date) || []
      bucket.push(post)
      map.set(post.date, bucket)
    })
    return map
  }, [state.drafts])

  const publishedByDay = useMemo(() => {
    const map = new Map<string, WorkspacePost[]>()
    state.published.filter((post) => isIsoDate(post.date)).forEach((post) => {
      const bucket = map.get(post.date) || []
      bucket.push(post)
      map.set(post.date, bucket)
    })
    return map
  }, [state.published])

  const effectiveSelectedDay = useMemo(() => {
    const inCurrentMonth = selectedDay && isIsoDate(selectedDay) && toDate(selectedDay).getMonth() === monthCursor.getMonth() && toDate(selectedDay).getFullYear() === monthCursor.getFullYear()
    if (inCurrentMonth) return selectedDay
    return state.scheduled.find((post) => isIsoDate(post.date) && toDate(post.date).getMonth() === monthCursor.getMonth() && toDate(post.date).getFullYear() === monthCursor.getFullYear())?.date
      || new Date(monthCursor.getFullYear(), monthCursor.getMonth(), 1).toISOString().slice(0, 10)
  }, [monthCursor, selectedDay, state.scheduled])

  const monthGrid = useMemo(() => {
    const start = new Date(monthCursor.getFullYear(), monthCursor.getMonth(), 1)
    const firstWeekday = (start.getDay() + 6) % 7
    const cursor = new Date(start)
    cursor.setDate(cursor.getDate() - firstWeekday)
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(cursor)
      date.setDate(cursor.getDate() + index)
      const iso = date.toISOString().slice(0, 10)
      return {
        iso,
        day: date.getDate(),
        inMonth: date.getMonth() === monthCursor.getMonth(),
        scheduled: scheduledByDay.get(iso) || [],
        drafts: draftByDay.get(iso) || [],
        published: publishedByDay.get(iso) || [],
      }
    })
  }, [draftByDay, monthCursor, publishedByDay, scheduledByDay])

  const dayItems = useMemo(() => {
    return {
      scheduled: scheduledByDay.get(effectiveSelectedDay) || [],
      drafts: draftByDay.get(effectiveSelectedDay) || [],
      published: publishedByDay.get(effectiveSelectedDay) || [],
    }
  }, [draftByDay, effectiveSelectedDay, publishedByDay, scheduledByDay])

  const selectedMonthScheduled = useMemo(
    () => state.scheduled.filter((post) => isIsoDate(post.date) && toDate(post.date).getMonth() === monthCursor.getMonth() && toDate(post.date).getFullYear() === monthCursor.getFullYear()),
    [monthCursor, state.scheduled]
  )

  const onPublishNow = async (post: WorkspacePost) => {
    if (!user?.linkedinMemberId) { setStatus("Connect LinkedIn in settings first"); return }
    setPublishingId(post.id)
    setStatus(`Publishing ${post.title}...`)
    try {
      const result = await shareToLinkedIn({ content: post.content, postId: post.id, workspaceKey: workspaceId })
      const postUrn = normalizeLinkedInUrn(result.postUrn || "") || null
      await publishPost({ id: post.id, title: post.title, content: post.content, type: post.type, publishedAt: new Date().toISOString(), externalPostUrn: postUrn })
      if (post.type.toLowerCase().includes("carousel")) {
        await createJob({ type: "carousel_generation", status: "queued", title: "Carousel asset generation", payload: { postId: post.id, postUrn, title: post.title } }).catch(() => undefined)
      }
      setStatus(`Published ${post.title}`)
    } catch (error) {
      setStatus((error as Error).message || "LinkedIn publish failed")
    } finally {
      setPublishingId(null)
    }
  }

  const shiftMonth = (delta: number) => {
    const next = new Date(monthCursor)
    next.setMonth(next.getMonth() + delta)
    setMonthCursor(next)
  }

  const selectedDateLabel = isIsoDate(effectiveSelectedDay) ? toDate(effectiveSelectedDay).toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" }) : "Selected day"

  return (
    <div className="mx-auto max-w-6xl px-6 py-10 sm:px-10">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900">Planner</h1>
          <p className="mt-1 text-sm text-zinc-500">Month view with draft, scheduled, and published activity by day.</p>
        </div>
        <button onClick={() => !isPastDay(effectiveSelectedDay) && goToWriter(router, activeClientId, undefined, effectiveSelectedDay)} disabled={isPastDay(effectiveSelectedDay)} className="cursor-pointer rounded-lg bg-teal px-4 py-2 text-sm font-semibold text-white hover:bg-teal-600 disabled:cursor-not-allowed disabled:bg-zinc-300">New post for selected day</button>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Scheduled posts" value={String(state.scheduled.length)} />
        <Stat label="Drafts with date" value={String(Array.from(draftByDay.values()).reduce((sum, items) => sum + items.length, 0))} />
        <Stat label="Published with date" value={String(Array.from(publishedByDay.values()).reduce((sum, items) => sum + items.length, 0))} />
        <Stat label="This month" value={String(selectedMonthScheduled.length)} />
      </div>

      {status ? <p className="mb-4 text-sm text-zinc-600">{status}</p> : null}

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-2xl border border-zinc-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <button onClick={() => shiftMonth(-1)} className="cursor-pointer rounded-lg border border-zinc-300 px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50">&lt;</button>
            <h2 className="text-lg font-semibold text-zinc-900">{monthLabel(monthCursor)}</h2>
            <button onClick={() => shiftMonth(1)} className="cursor-pointer rounded-lg border border-zinc-300 px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50">&gt;</button>
          </div>
          <div className="grid grid-cols-7 gap-2 text-center text-[11px] font-bold uppercase tracking-wide text-zinc-400">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => <div key={day}>{day}</div>)}
          </div>
          <div className="mt-2 grid grid-cols-7 gap-2">
            {monthGrid.map((day) => {
              const isActive = day.iso === effectiveSelectedDay
              return (
                <button key={day.iso} onClick={() => setSelectedDay(day.iso)} className={`min-h-28 cursor-pointer rounded-2xl border p-2 text-left transition-colors ${isPastDay(day.iso) ? "border-zinc-100 bg-zinc-50 text-zinc-400 opacity-70" : isActive ? "border-teal bg-teal/5" : day.inMonth ? "border-zinc-200 bg-white hover:bg-zinc-50" : "border-zinc-100 bg-zinc-50 text-zinc-400"}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">{day.day}</span>
                    {day.scheduled.length > 0 ? <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">{day.scheduled.length}</span> : null}
                  </div>
                  <div className="mt-2 space-y-1">
                    {day.scheduled.slice(0, 2).map((post) => <div key={post.id} className="truncate rounded-lg bg-amber-50 px-2 py-1 text-[10px] font-medium text-amber-800">{post.title}</div>)}
                    {day.drafts.length > 0 ? <div className="text-[10px] text-zinc-500">{day.drafts.length} draft{day.drafts.length > 1 ? "s" : ""}</div> : null}
                    {day.published.length > 0 ? <div className="text-[10px] text-emerald-600">{day.published.length} published</div> : null}
                  </div>
                </button>
              )
            })}
          </div>
        </section>

        <section className="space-y-4">
          <div className="rounded-2xl border border-zinc-200 bg-white p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-zinc-900">{selectedDateLabel}</h2>
                <p className="text-xs text-zinc-500">Everything tied to this day.</p>
              </div>
              <button onClick={() => !isPastDay(effectiveSelectedDay) && goToWriter(router, activeClientId, undefined, effectiveSelectedDay)} disabled={isPastDay(effectiveSelectedDay)} className="cursor-pointer text-xs font-semibold text-teal hover:text-teal-700 disabled:cursor-not-allowed disabled:text-zinc-400">Write here</button>
            </div>
            <PlannerBlock title="Scheduled" items={dayItems.scheduled} empty="No scheduled posts." onEdit={(post) => goToWriter(router, activeClientId, post, selectedDay)} onPublish={onPublishNow} publishingId={publishingId} canPublish={Boolean(user?.linkedinMemberId)} />
            <PlannerBlock title="Drafts" items={dayItems.drafts} empty="No dated drafts." onEdit={(post) => goToWriter(router, activeClientId, post, selectedDay)} />
            <PlannerBlock title="Published" items={dayItems.published} empty="No published posts on this day." onEdit={(post) => goToWriter(router, activeClientId, post, selectedDay)} />
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-zinc-900">This month queue</h2>
                <p className="text-xs text-zinc-500">{selectedMonthScheduled.length} scheduled post{selectedMonthScheduled.length === 1 ? "" : "s"}</p>
              </div>
            </div>
            {selectedMonthScheduled.length === 0 ? <p className="text-sm text-zinc-500">No scheduled posts in this month yet.</p> : <div className="space-y-3">{selectedMonthScheduled.slice(0, 8).map((post) => <article key={post.id} className="rounded-xl border border-zinc-200 p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold text-zinc-900">{post.title}</p><p className="mt-1 text-xs text-zinc-500">{post.date}{post.scheduledTime ? ` at ${post.scheduledTime}` : ""}</p></div><button onClick={() => goToWriter(router, activeClientId, post, post.date)} className="cursor-pointer text-xs font-semibold text-teal hover:text-teal-700">Edit</button></div></article>)}</div>}
          </div>
        </section>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-zinc-200 bg-white p-4"><p className="text-xs text-zinc-500">{label}</p><p className="mt-1 text-lg font-bold text-zinc-900">{value}</p></div>
}

function PlannerBlock({
  title,
  items,
  empty,
  onEdit,
  onPublish,
  publishingId,
  canPublish,
}: {
  title: string
  items: WorkspacePost[]
  empty: string
  onEdit: (post: WorkspacePost) => void
  onPublish?: (post: WorkspacePost) => void
  publishingId?: string | null
  canPublish?: boolean
}) {
  return (
    <div className="mb-4 last:mb-0">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">{title}</h3>
      {items.length === 0 ? <p className="rounded-xl bg-zinc-50 px-3 py-3 text-sm text-zinc-500">{empty}</p> : <div className="space-y-2">{items.map((post) => <div key={post.id} className="rounded-xl border border-zinc-200 p-3"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-semibold text-zinc-900">{post.title}</p><p className="mt-1 line-clamp-2 text-xs text-zinc-500">{post.content}</p></div><div className="flex shrink-0 items-center gap-2"><button onClick={() => onEdit(post)} className="cursor-pointer rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50">Open</button>{onPublish ? <button onClick={() => onPublish(post)} disabled={!canPublish || publishingId === post.id} className="cursor-pointer rounded-lg bg-teal px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-600 disabled:opacity-60">{publishingId === post.id ? "Publishing..." : "Publish"}</button> : null}</div></div></div>)}</div>}
    </div>
  )
}
