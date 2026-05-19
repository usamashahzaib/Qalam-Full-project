"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useWorkspace, type WorkspacePost } from "@/components/providers/WorkspaceProvider"
import { persistWriterIntent, withClientParam } from "@/lib/workspace-navigation"

const STATUSES = ["all", "draft", "scheduled", "published"] as const

const openInWriter = (router: ReturnType<typeof useRouter>, post: WorkspacePost, clientId?: string | null) => {
  persistWriterIntent(post, /^\d{4}-\d{2}-\d{2}$/.test(post.date) ? post.date : null)
  router.push(withClientParam("/writer", clientId))
}

export default function LibraryPage() {
  const router = useRouter()
  const { state, deletePost } = useWorkspace()
  const activeClientId = (state as { agency?: { activeClientId?: string | null } }).agency?.activeClientId || null
  const [query, setQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<(typeof STATUSES)[number]>("all")
  const [status, setStatus] = useState<string | null>(null)

  const posts = useMemo(() => {
    const term = query.trim().toLowerCase()
    return [...state.posts]
      .filter((post) => (statusFilter === "all" ? true : post.status === statusFilter))
      .filter((post) => !term || [post.title, post.content, post.type].some((value) => value.toLowerCase().includes(term)))
      .sort((a, b) => (a.updatedAt > b.updatedAt ? -1 : 1))
  }, [query, state.posts, statusFilter])

  const onDelete = async (post: WorkspacePost) => {
    if (typeof window !== "undefined" && !window.confirm(`Delete \"${post.title}\"?`)) return
    await deletePost(post.id)
    setStatus(`Deleted ${post.title}`)
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-10 sm:px-10">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div><h1 className="text-3xl font-bold text-zinc-900">Library</h1><p className="mt-1 text-sm text-zinc-500">Saved drafts, scheduled posts, and published posts from the active workspace.</p></div>
        <Link href={withClientParam("/writer", activeClientId)} className="rounded-lg bg-teal px-4 py-2 text-sm font-semibold text-white hover:bg-teal-600">New draft</Link>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]"><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search title, content, or type" className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900" /><div className="flex flex-wrap gap-2">{STATUSES.map((item) => <button key={item} onClick={() => setStatusFilter(item)} className={`rounded-lg px-3 py-2 text-sm font-semibold ${statusFilter === item ? "bg-zinc-900 text-white" : "border border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-50"}`}>{item}</button>)}</div></div>
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4"><Stat label="All posts" value={String(state.posts.length)} /><Stat label="Drafts" value={String(state.drafts.length)} /><Stat label="Scheduled" value={String(state.scheduled.length)} /><Stat label="Published" value={String(state.published.length)} /></div>
      {status ? <p className="mb-4 text-sm text-zinc-600">{status}</p> : null}

      <div className="rounded-2xl border border-zinc-200 bg-white">
        <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4"><h2 className="text-sm font-semibold text-zinc-900">Workspace content</h2><span className="text-xs text-zinc-500">{posts.length} shown</span></div>
        {posts.length === 0 ? <div className="px-5 py-10 text-center text-sm text-zinc-500">No matching posts yet.</div> : <div className="divide-y divide-zinc-100">{posts.map((post) => <article key={post.id} className="px-5 py-4"><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="truncate text-sm font-semibold text-zinc-900">{post.title}</h3><span className="rounded-full bg-zinc-100 px-2 py-1 text-[11px] uppercase tracking-wide text-zinc-600">{post.status}</span><span className="rounded-full bg-zinc-100 px-2 py-1 text-[11px] uppercase tracking-wide text-zinc-600">{post.type}</span></div><p className="mt-1 text-xs text-zinc-500">{post.date}{post.scheduledTime ? ` at ${post.scheduledTime}` : ""}</p><p className="mt-2 line-clamp-3 text-sm text-zinc-600">{post.content}</p></div><div className="flex flex-wrap gap-2"><button onClick={() => openInWriter(router, post, activeClientId)} className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-50">Load in writer</button><button onClick={() => onDelete(post)} className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50">Delete</button></div></div><p className="mt-3 text-xs text-zinc-500">Updates happen through writer. This route lists, loads, and deletes real workspace posts.</p></article>)}</div>}
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) { return <div className="rounded-xl border border-zinc-200 bg-white p-4"><p className="text-xs text-zinc-500">{label}</p><p className="mt-1 text-lg font-bold text-zinc-900">{value}</p></div> }
