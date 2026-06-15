"use client"

import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { useWorkspace, type WorkspacePost } from "@/components/providers/WorkspaceProvider"
import { persistWriterIntent, withClientParam } from "@/lib/workspace-navigation"
import { LockedFeature } from "@/components/LockedFeature"
import { useCalendarLogic } from "@/lib/hooks/useCalendarLogic"

// ─── Helpers (render-only, no state) ─────────────────────────────────────────

const monthLabel = (date: Date) => date.toLocaleDateString("en-US", { month: "long", year: "numeric" })
const toDate = (value: string) => new Date(`${value}T00:00:00`)

const goToWriter = (router: ReturnType<typeof useRouter>, clientId?: string | null, post?: WorkspacePost, date?: string) => {
  if (post) persistWriterIntent(post, date || null)
  else if (date) sessionStorage.setItem("writerScheduleDate", date)
  router.push(withClientParam("/writer", clientId))
}

const formatDateLabel = (iso: string, isIsoDate: (v: string) => boolean) =>
  isIsoDate(iso) ? toDate(iso).toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" }) : "Selected day"

const formatDateTime = (iso: string | null) => {
  if (!iso) return ""
  try {
    return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
  } catch {
    return iso.slice(0, 10)
  }
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === "scheduled" ? "bg-amber-100 text-amber-700" :
    status === "published" ? "bg-emerald-100 text-emerald-700" :
    "bg-zinc-100 text-zinc-500"
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold capitalize ${cls}`}>{status}</span>
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function CalendarPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const { state, publishPost, createJob, workspaceId, refreshPosts } = useWorkspace()
  const activeClientId = (state as { agency?: { activeClientId?: string | null } }).agency?.activeClientId || null
  const linkedinMemberId = session?.user?.email || null

  const cal = useCalendarLogic({
    scheduled: state.scheduled,
    drafts: state.drafts,
    published: state.published,
    workspaceId,
    linkedinMemberId,
    publishPost,
    createJob,
    refreshPosts,
  })

  const {
    today, status, publishingId, rescheduling,
    monthCursor, selectedDay, setSelectedDay,
    view, setView,
    draggingPost, dragOverDay,
    monthGrid, dayItems, selectedMonthScheduled, allScheduledSorted,
    effectiveSelectedDay,
    onPublishNow, onReschedule, onUnschedule,
    onDragStart, onDragEnd, onDragOver, onDragLeave, onDrop,
    shiftMonth, goToToday,
    isIsoDate, isPastDay,
  } = cal

  return (
    <LockedFeature feature="Content Planner" requiredPlan="Solo">
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">

      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Planner</h1>
          <p className="mt-0.5 text-sm text-zinc-500">Schedule and manage your content pipeline.</p>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex rounded-xl border border-zinc-200 bg-white p-1">
            <button
              onClick={() => setView("calendar")}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${view === "calendar" ? "bg-zinc-900 text-white" : "text-zinc-500 hover:text-zinc-700"}`}
            >
              Calendar
            </button>
            <button
              onClick={() => setView("list")}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${view === "list" ? "bg-zinc-900 text-white" : "text-zinc-500 hover:text-zinc-700"}`}
            >
              List
            </button>
          </div>
          <button
            onClick={() => !isPastDay(effectiveSelectedDay) && goToWriter(router, activeClientId, undefined, effectiveSelectedDay)}
            disabled={isPastDay(effectiveSelectedDay)}
            className="cursor-pointer rounded-xl bg-teal px-4 py-2 text-sm font-semibold text-white hover:bg-teal-600 disabled:cursor-not-allowed disabled:bg-zinc-300"
          >
            New post
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Scheduled" value={String(state.scheduled.length)} />
        <Stat label="Drafts" value={String(state.drafts.length)} />
        <Stat label="Published" value={String(state.published.length)} />
        <Stat label="This month" value={String(selectedMonthScheduled.length)} />
      </div>

      {status && (
        <div className="mb-4 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm text-zinc-700">
          {rescheduling && <span className="mr-2 animate-pulse">⏳</span>}{status}
        </div>
      )}

      {/* ── Calendar view ─────────────────────────────────────────────────── */}
      {view === "calendar" && (
        <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">

          {/* Grid */}
          <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
            <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-3.5">
              <button onClick={() => shiftMonth(-1)} className="cursor-pointer rounded-lg border border-zinc-200 px-3 py-1.5 text-sm font-semibold text-zinc-600 hover:bg-zinc-50">&lt;</button>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-zinc-900">{monthLabel(monthCursor)}</h2>
                <button
                  onClick={goToToday}
                  className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-0.5 text-[10px] font-bold text-zinc-500 hover:bg-zinc-100"
                >
                  Today
                </button>
              </div>
              <button onClick={() => shiftMonth(1)} className="cursor-pointer rounded-lg border border-zinc-200 px-3 py-1.5 text-sm font-semibold text-zinc-600 hover:bg-zinc-50">&gt;</button>
            </div>

            <div className="px-3 pb-3 pt-2">
              <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold uppercase tracking-wide text-zinc-400 pb-1">
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => <div key={d}>{d}</div>)}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {monthGrid.map((day) => {
                  const isSelected = day.iso === effectiveSelectedDay
                  const isToday = day.iso === today
                  const isDragOver = day.iso === dragOverDay
                  const hasContent = day.scheduled.length + day.drafts.length + day.published.length > 0
                  return (
                    <button
                      key={day.iso}
                      onClick={() => setSelectedDay(day.iso)}
                      onDragOver={(e) => onDragOver(e, day.iso)}
                      onDragLeave={onDragLeave}
                      onDrop={(e) => void onDrop(e, day.iso)}
                      className={`relative min-h-[80px] cursor-pointer rounded-xl border p-1.5 text-left transition-all ${
                        isDragOver
                          ? "border-teal bg-teal/10 ring-2 ring-teal/30"
                          : isSelected
                          ? "border-teal bg-teal/5"
                          : day.inMonth
                          ? "border-zinc-200 bg-white hover:bg-zinc-50/80"
                          : "border-zinc-100 bg-zinc-50 opacity-50"
                      }`}
                    >
                      <span className={`flex h-5 w-5 items-center justify-center rounded-full text-xs font-semibold ${
                        isToday ? "bg-teal text-white" : isSelected ? "text-teal" : "text-zinc-700"
                      }`}>
                        {day.day}
                      </span>
                      <div className="mt-1 space-y-0.5">
                        {day.scheduled.slice(0, 2).map((post) => (
                          <div
                            key={post.id}
                            draggable
                            onDragStart={(e) => onDragStart(e, post)}
                            onDragEnd={onDragEnd}
                            onClick={(e) => e.stopPropagation()}
                            className={`truncate rounded-md px-1.5 py-0.5 text-[9px] font-medium text-amber-800 transition-opacity cursor-grab ${draggingPost?.id === post.id ? "opacity-40" : "bg-amber-50"}`}
                          >
                            {post.title}
                          </div>
                        ))}
                        {day.scheduled.length > 2 && (
                          <div className="text-[9px] text-zinc-400">+{day.scheduled.length - 2} more</div>
                        )}
                        {hasContent && day.scheduled.length === 0 && (
                          <div className="flex gap-0.5 mt-0.5">
                            {day.drafts.length > 0 && <span className="h-1.5 w-1.5 rounded-full bg-zinc-300" />}
                            {day.published.length > 0 && <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />}
                          </div>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {draggingPost && (
              <div className="border-t border-zinc-100 bg-zinc-50/80 px-4 py-2.5 text-xs text-zinc-500">
                Drop <span className="font-semibold text-zinc-800">{draggingPost.title}</span> onto a day to reschedule
              </div>
            )}
          </section>

          {/* Day sidebar */}
          <section className="space-y-4">
            <div className="rounded-2xl border border-zinc-200 bg-white p-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-zinc-900">{formatDateLabel(effectiveSelectedDay, isIsoDate)}</h2>
                  <p className="text-xs text-zinc-500">Posts for this day</p>
                </div>
                <button
                  onClick={() => !isPastDay(effectiveSelectedDay) && goToWriter(router, activeClientId, undefined, effectiveSelectedDay)}
                  disabled={isPastDay(effectiveSelectedDay)}
                  className="cursor-pointer text-xs font-semibold text-teal hover:text-teal-700 disabled:cursor-not-allowed disabled:text-zinc-400"
                >
                  Write here
                </button>
              </div>
              <PlannerBlock
                title="Scheduled"
                items={dayItems.scheduled}
                empty="No scheduled posts."
                onEdit={(post) => goToWriter(router, activeClientId, post, effectiveSelectedDay)}
                onPublish={onPublishNow}
                onUnschedule={onUnschedule}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
                publishingId={publishingId}
                canPublish={Boolean(linkedinMemberId)}
                draggingId={draggingPost?.id || null}
              />
              <PlannerBlock
                title="Drafts"
                items={dayItems.drafts}
                empty="No dated drafts."
                onEdit={(post) => goToWriter(router, activeClientId, post, effectiveSelectedDay)}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
                draggingId={draggingPost?.id || null}
              />
              <PlannerBlock
                title="Published"
                items={dayItems.published}
                empty="No published posts on this day."
                onEdit={(post) => goToWriter(router, activeClientId, post, effectiveSelectedDay)}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
                draggingId={draggingPost?.id || null}
              />
            </div>

            {/* Month queue */}
            <div className="rounded-2xl border border-zinc-200 bg-white p-5">
              <h2 className="mb-3 text-sm font-semibold text-zinc-900">
                This month queue
                <span className="ml-2 text-xs font-normal text-zinc-400">({selectedMonthScheduled.length})</span>
              </h2>
              {selectedMonthScheduled.length === 0 ? (
                <p className="text-sm text-zinc-400">Nothing scheduled this month.</p>
              ) : (
                <div className="space-y-2">
                  {selectedMonthScheduled.slice(0, 8).map((post) => (
                    <div key={post.id} className="flex items-center justify-between gap-2 rounded-xl border border-zinc-100 p-3">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-zinc-900">{post.title}</p>
                        <p className="text-[10px] text-zinc-400">{post.date}{post.scheduledTime ? ` · ${post.scheduledTime.slice(11, 16)}` : ""}</p>
                      </div>
                      <button
                        onClick={() => goToWriter(router, activeClientId, post, post.date)}
                        className="shrink-0 cursor-pointer text-[10px] font-bold text-teal hover:text-teal-700"
                      >
                        Edit
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      )}

      {/* ── List view ─────────────────────────────────────────────────────── */}
      {view === "list" && (
        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <div className="border-b border-zinc-100 px-5 py-3.5">
            <h2 className="text-sm font-bold text-zinc-900">All scheduled posts</h2>
            <p className="mt-0.5 text-xs text-zinc-500">{allScheduledSorted.length} posts sorted by date</p>
          </div>
          {allScheduledSorted.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <p className="text-sm font-semibold text-zinc-700">No scheduled posts yet</p>
              <p className="mt-1 text-xs text-zinc-400">Go to the writer and schedule a post to see it here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-100 bg-zinc-50">
                    <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-zinc-400">Title</th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-zinc-400">Type</th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-zinc-400">Scheduled</th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-zinc-400">Status</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-50">
                  {allScheduledSorted.map((post) => (
                    <tr key={post.id} className="group hover:bg-zinc-50/60">
                      <td className="px-5 py-3">
                        <p className="max-w-xs truncate text-sm font-medium text-zinc-900">{post.title}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[10px] font-semibold text-zinc-500">
                          {post.type.toLowerCase().includes("carousel") ? "Carousel" : "Text"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-zinc-500">
                        {formatDateTime(post.scheduledTime)}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={post.status} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                          <button
                            onClick={() => goToWriter(router, activeClientId, post, post.date)}
                            className="cursor-pointer text-xs font-semibold text-teal hover:text-teal-700"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => void onUnschedule(post.id)}
                            className="cursor-pointer text-xs font-semibold text-zinc-400 hover:text-zinc-700"
                          >
                            Unschedule
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
    </LockedFeature>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4">
      <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-400">{label}</p>
      <p className="mt-1 text-xl font-bold text-zinc-900">{value}</p>
    </div>
  )
}

function PlannerBlock({
  title, items, empty, onEdit, onPublish, onUnschedule, onDragStart, onDragEnd, publishingId, canPublish, draggingId,
}: {
  title: string
  items: WorkspacePost[]
  empty: string
  onEdit: (post: WorkspacePost) => void
  onPublish?: (post: WorkspacePost) => void
  onUnschedule?: (id: string) => void
  onDragStart?: (e: React.DragEvent, post: WorkspacePost) => void
  onDragEnd?: () => void
  publishingId?: string | null
  canPublish?: boolean
  draggingId?: string | null
}) {
  if (!items.length) return (
    <div className="mb-3 last:mb-0">
      <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-zinc-400">{title}</p>
      <p className="rounded-xl bg-zinc-50 px-3 py-2.5 text-xs text-zinc-400">{empty}</p>
    </div>
  )

  return (
    <div className="mb-3 last:mb-0">
      <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-zinc-400">{title} ({items.length})</p>
      <div className="space-y-2">
        {items.map((post) => (
          <div
            key={post.id}
            draggable={!!onDragStart}
            onDragStart={onDragStart ? (e) => onDragStart(e, post) : undefined}
            onDragEnd={onDragEnd}
            className={`rounded-xl border border-zinc-200 p-3 transition-opacity ${draggingId === post.id ? "opacity-40" : ""} ${onDragStart ? "cursor-grab active:cursor-grabbing" : ""}`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-zinc-900">{post.title}</p>
                <p className="mt-0.5 line-clamp-1 text-[10px] text-zinc-400">{post.content?.slice(0, 80)}</p>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <button onClick={() => onEdit(post)} className="cursor-pointer rounded-lg border border-zinc-200 px-2 py-1 text-[10px] font-semibold text-zinc-600 hover:bg-zinc-50">
                  Edit
                </button>
                {onPublish && (
                  <button
                    onClick={() => onPublish(post)}
                    disabled={!canPublish || publishingId === post.id}
                    className="cursor-pointer rounded-lg bg-teal px-2 py-1 text-[10px] font-semibold text-white hover:bg-teal-600 disabled:opacity-50"
                  >
                    {publishingId === post.id ? "..." : "Publish"}
                  </button>
                )}
                {onUnschedule && (
                  <button
                    onClick={() => onUnschedule(post.id)}
                    className="cursor-pointer rounded-lg border border-zinc-200 px-2 py-1 text-[10px] font-semibold text-zinc-400 hover:text-zinc-700"
                    title="Move back to drafts"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
