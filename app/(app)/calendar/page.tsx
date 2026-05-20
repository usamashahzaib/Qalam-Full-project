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
    const map = new Map<string, number>()
    state.drafts.filter((post) => isIsoDate(post.date)).forEach((post) => map.set(post.date, (map.get(post.date) || 0) + 1))
    return map
  }, [state.drafts])

  const publishedByDay = useMemo(() => {
    const map = new Map<string, number>()
    state.published.filter((post) => isIsoDate(post.date)).forEach((post) => map.set(post.date, (map.get(post.date) || 0) + 1))
    return map
  }, [state.published])

  const monthGrid = useMemo(() => {
    const start = new Date(monthCursor.getFullYear(), monthCursor.getMonth(), 1)
    const firstWeekday = (start.getDay() + 6) % 7
    const cursor = new Date(start)
    cursor.setDate(cursor.getDate() - firstWeekday)
    return Array.from({ length: 35 }, (_, index) => {
      const date = new Date(cursor)
      date.setDate(cursor.getDate() + index)
      const iso = date.toISOString().slice(0, 10)
      return {
        iso,
        day: date.getDate(),
        inMonth: date.getMonth() === monthCursor.getMonth(),
        scheduled: scheduledByDay.get(iso) || [],
        drafts: draftByDay.get(iso) || 0,
        published: publishedByDay.get(iso) || 0,
      }
    })
  }, [draftByDay, monthCursor, publishedByDay, scheduledByDay])

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

  return (
    <div className="mx-auto max-w-6xl px-6 py-10 sm:px-10">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900">Planner</h1>
          <p className="mt-1 text-sm text-zinc-500">See scheduled posts by month, plus any drafts or published activity already tied to a date.</p>
        </div>
        <button onClick={() => goToWriter(router, activeClientId, undefined, new Date().toISOString().slice(0, 10))} className="rounded-lg bg-teal px-4 py-2 text-sm font-semibold text-white hover:bg-teal-600">New scheduled draft</button>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-4">
        <Stat label="Scheduled posts" value={String(state.scheduled.length)} />
        <Stat label="Drafts with date" value={String(Array.from(draftByDay.values()).reduce((sum, count) => sum + count, 0))} />
        <Stat label="Published with date" value={String(Array.from(publishedByDay.values()).reduce((sum, count) => sum + count, 0))} />
        <Stat label="LinkedIn" value={user?.linkedinMemberId ? "Connected" : "Connect to publish"} />
      </div>

      {status ? <p className="mb-4 text-sm text-zinc-600">{status}</p> : null}

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-2xl border border-zinc-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <button onClick={() => shiftMonth(-1)} className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50">&lt;</button>
            <h2 className="text-lg font-semibold text-zinc-900">{monthLabel(monthCursor)}</h2>
            <button onClick={() => shiftMonth(1)} className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50">&gt;</button>
          </div>
          <div className="grid grid-cols-7 gap-2 text-center text-[11px] font-bold uppercase tracking-wide text-zinc-400">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => <div key={day}>{day}</div>)}
          </div>
          <div className="mt-2 grid grid-cols-7 gap-2">
            {monthGrid.map((day) => (
              <button key={day.iso} onClick={() => goToWriter(router, activeClientId, undefined, day.iso)} className={`min-h-24 rounded-2xl border p-2 text-left transition-colors ${day.inMonth ? "border-zinc-200 bg-white hover:bg-zinc-50" : "border-zinc-100 bg-zinc-50 text-zinc-400"}`}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">{day.day}</span>
                  {day.scheduled.length > 0 ? <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">{day.scheduled.length}</span> : null}
                </div>
                <div className="mt-2 space-y-1">
                  {day.scheduled.slice(0, 2).map((post) => <div key={post.id} className="truncate rounded-lg bg-amber-50 px-2 py-1 text-[10px] font-medium text-amber-800">{post.title}</div>)}
                  {day.drafts > 0 ? <div className="text-[10px] text-zinc-500">{day.drafts} draft{day.drafts > 1 ? "s" : ""}</div> : null}
                  {day.published > 0 ? <div className="text-[10px] text-emerald-600">{day.published} published</div> : null}
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-zinc-900">This month</h2>
              <p className="text-xs text-zinc-500">{selectedMonthScheduled.length} scheduled post{selectedMonthScheduled.length === 1 ? "" : "s"}</p>
            </div>
            <button onClick={() => goToWriter(router, activeClientId)} className="text-xs font-semibold text-teal hover:text-teal-700">Open writer</button>
          </div>

          {selectedMonthScheduled.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 px-6 py-10 text-center">
              <p className="text-sm text-zinc-600">No scheduled posts in this month yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {selectedMonthScheduled.map((post) => (
                <article key={post.id} className="rounded-xl border border-zinc-200 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate text-sm font-semibold text-zinc-900">{post.title}</h3>
                        <span className="rounded-full bg-amber-50 px-2 py-1 text-[10px] uppercase tracking-wide text-amber-700">{post.scheduledTime || "No time"}</span>
                      </div>
                      <p className="mt-1 text-xs text-zinc-500">{post.date}</p>
                      <p className="mt-2 line-clamp-2 text-sm text-zinc-600">{post.content}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => goToWriter(router, activeClientId, post, post.date)} className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-50">Edit</button>
                      <button onClick={() => onPublishNow(post)} disabled={!user?.linkedinMemberId || publishingId === post.id} className="rounded-lg bg-teal px-3 py-2 text-sm font-semibold text-white hover:bg-teal-600 disabled:cursor-not-allowed disabled:opacity-60">{publishingId === post.id ? "Publishing..." : "Publish now"}</button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-zinc-200 bg-white p-4"><p className="text-xs text-zinc-500">{label}</p><p className="mt-1 text-lg font-bold text-zinc-900">{value}</p></div>
}
