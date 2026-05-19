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

const formatDay = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : value || "No date"
const toTimestamp = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00`).getTime() : Number.isFinite(Date.parse(value)) ? Date.parse(value) : 0

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

  const groups = useMemo(() => {
    const map = new Map<string, WorkspacePost[]>()
    state.scheduled.forEach((post) => {
      const key = post.date || "Unscheduled"
      const bucket = map.get(key) || []
      bucket.push(post)
      map.set(key, bucket)
    })
    return Array.from(map.entries()).map(([date, posts]) => ({ date, posts: [...posts].sort((a, b) => (a.scheduledTime || "").localeCompare(b.scheduledTime || "")) })).sort((a, b) => toTimestamp(a.date) - toTimestamp(b.date))
  }, [state.scheduled])

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

  return (
    <div className="mx-auto max-w-6xl px-6 py-10 sm:px-10">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-3xl font-bold text-zinc-900">Calendar</h1><p className="mt-1 text-sm text-zinc-500">Scheduled posts from the active workspace. Cron publishing is live for due LinkedIn posts.</p></div><button onClick={() => goToWriter(router, activeClientId, undefined, new Date().toISOString().slice(0, 10))} className="rounded-lg bg-teal px-4 py-2 text-sm font-semibold text-white hover:bg-teal-600">New scheduled draft</button></div>
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3"><Stat label="Scheduled posts" value={String(state.scheduled.length)} /><Stat label="Published posts" value={String(state.published.length)} /><Stat label="LinkedIn" value={user?.linkedinMemberId ? "Connected" : "Required for publish-now"} /></div>
      {status ? <p className="mb-4 text-sm text-zinc-600">{status}</p> : null}
      {groups.length === 0 ? <div className="rounded-2xl border border-dashed border-zinc-300 bg-white px-6 py-12 text-center"><p className="text-sm text-zinc-600">No scheduled posts yet.</p><button onClick={() => goToWriter(router, activeClientId, undefined, new Date().toISOString().slice(0, 10))} className="mt-4 rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-50">Schedule in writer</button></div> : <div className="space-y-4">{groups.map((group) => <section key={group.date} className="rounded-2xl border border-zinc-200 bg-white"><div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4"><div><h2 className="text-base font-semibold text-zinc-900">{formatDay(group.date)}</h2><p className="text-xs text-zinc-500">{group.posts.length} scheduled</p></div><button onClick={() => goToWriter(router, activeClientId, undefined, /^\d{4}-\d{2}-\d{2}$/.test(group.date) ? group.date : undefined)} className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-50">Add post</button></div><div className="divide-y divide-zinc-100">{group.posts.map((post) => <article key={post.id} className="px-5 py-4"><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="truncate text-sm font-semibold text-zinc-900">{post.title}</h3><span className="rounded-full bg-zinc-100 px-2 py-1 text-[11px] uppercase tracking-wide text-zinc-600">{post.type}</span><span className="rounded-full bg-amber-50 px-2 py-1 text-[11px] uppercase tracking-wide text-amber-700">{post.scheduledTime || "No time"}</span></div><p className="mt-2 line-clamp-3 text-sm text-zinc-600">{post.content}</p></div><div className="flex flex-wrap gap-2"><button onClick={() => goToWriter(router, activeClientId, post, /^\d{4}-\d{2}-\d{2}$/.test(post.date) ? post.date : undefined)} className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-50">Edit in writer</button><button onClick={() => onPublishNow(post)} disabled={!user?.linkedinMemberId || publishingId === post.id} className="rounded-lg bg-teal px-3 py-2 text-sm font-semibold text-white hover:bg-teal-600 disabled:cursor-not-allowed disabled:opacity-60">{publishingId === post.id ? "Publishing..." : "Publish now"}</button></div></div>{!user?.linkedinMemberId ? <p className="mt-2 text-xs text-zinc-500">Publish-now needs a live LinkedIn session in settings.</p> : null}</article>)}</div></section>)}</div>}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) { return <div className="rounded-xl border border-zinc-200 bg-white p-4"><p className="text-xs text-zinc-500">{label}</p><p className="mt-1 text-lg font-bold text-zinc-900">{value}</p></div> }
