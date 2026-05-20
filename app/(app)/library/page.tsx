"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useWorkspace, type WorkspacePost } from "@/components/providers/WorkspaceProvider"
import { analyzeContent } from "@/lib/content-intelligence"
import { persistWriterIntent, withClientParam } from "@/lib/workspace-navigation"

const STATUSES = ["all", "draft", "scheduled", "published", "pending_approval", "rejected"] as const

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

  const rankedPosts = useMemo(() => {
    return state.posts
      .map((post) => ({ post, intelligence: analyzeContent({ title: post.title, content: post.content, type: post.type, profile: state.profile }) }))
      .sort((a, b) => b.intelligence.overallScore - a.intelligence.overallScore)
  }, [state.posts, state.profile])

  const posts = useMemo(() => {
    const term = query.trim().toLowerCase()
    return rankedPosts
      .filter(({ post }) => (statusFilter === "all" ? true : post.status === statusFilter))
      .filter(({ post }) => !term || [post.title, post.content, post.type].some((value) => value.toLowerCase().includes(term)))
  }, [query, rankedPosts, statusFilter])

  const topPerformers = useMemo(() => rankedPosts.filter(({ post }) => post.status === "published").slice(0, 4), [rankedPosts])
  const avgScore = useMemo(() => (rankedPosts.length ? Math.round(rankedPosts.reduce((sum, item) => sum + item.intelligence.overallScore, 0) / rankedPosts.length) : 0), [rankedPosts])

  const onDelete = async (post: WorkspacePost) => {
    if (typeof window !== "undefined" && !window.confirm(`Delete "${post.title}"?`)) return
    await deletePost(post.id)
    setStatus(`Deleted ${post.title}`)
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-10 sm:px-10">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900">Library</h1>
          <p className="mt-1 text-sm text-zinc-500">Archive, recycle, and reload workspace content with actual internal quality scoring.</p>
        </div>
        <Link href={withClientParam("/writer?compose=new", activeClientId)} className="cursor-pointer rounded-lg bg-teal px-4 py-2 text-sm font-semibold text-white hover:bg-teal-600">New draft</Link>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Stat label="All posts" value={String(state.posts.length)} />
        <Stat label="Drafts" value={String(state.drafts.length)} />
        <Stat label="Scheduled" value={String(state.scheduled.length)} />
        <Stat label="Published" value={String(state.published.length)} />
        <Stat label="Avg score" value={`${avgScore}/100`} />
      </div>

      <div className="mb-6 rounded-2xl border border-zinc-200 bg-white p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-zinc-900">Top performers - click to recycle</h2>
            <p className="text-xs text-zinc-500">Best internal scores from published posts.</p>
          </div>
          <span className="text-xs text-zinc-500">{topPerformers.length} ready</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {topPerformers.length ? topPerformers.map(({ post, intelligence }) => (
            <button key={post.id} onClick={() => openInWriter(router, post, activeClientId)} className="cursor-pointer rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-left transition-colors hover:bg-zinc-100">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-700">{intelligence.overallScore}%</span>
                <span className="max-w-[240px] truncate text-sm font-semibold text-zinc-900">{post.title}</span>
              </div>
            </button>
          )) : <p className="text-sm text-zinc-500">Publish a few posts to surface top recycle candidates.</p>}
        </div>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]">
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search title, content, or type" className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900" />
        <div className="flex flex-wrap gap-2">{STATUSES.map((item) => <button key={item} onClick={() => setStatusFilter(item)} className={`cursor-pointer rounded-lg px-3 py-2 text-sm font-semibold ${statusFilter === item ? "bg-zinc-900 text-white" : "border border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-50"}`}>{item.replaceAll("_", " ")}</button>)}</div>
      </div>

      {status ? <p className="mb-4 text-sm text-zinc-600">{status}</p> : null}

      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
        <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-zinc-900">Workspace content</h2>
          <span className="text-xs text-zinc-500">{posts.length} shown</span>
        </div>
        {posts.length === 0 ? <div className="px-5 py-10 text-center text-sm text-zinc-500">No matching posts yet.</div> : (
          <div className="divide-y divide-zinc-100">
            {posts.map(({ post, intelligence }) => (
              <article key={post.id} className="px-5 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate text-sm font-semibold text-zinc-900">{post.title}</h3>
                      <span className="rounded-full bg-zinc-100 px-2 py-1 text-[11px] uppercase tracking-wide text-zinc-600">{post.status.replaceAll("_", " ")}</span>
                      <span className="rounded-full bg-zinc-100 px-2 py-1 text-[11px] uppercase tracking-wide text-zinc-600">{post.type}</span>
                      <span className="rounded-full bg-teal/10 px-2 py-1 text-[11px] font-bold text-teal">{intelligence.overallScore}/100</span>
                    </div>
                    <p className="mt-1 text-xs text-zinc-500">{post.date}{post.scheduledTime ? ` at ${post.scheduledTime}` : ""}</p>
                    <p className="mt-2 line-clamp-3 text-sm text-zinc-600">{post.content}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {intelligence.hashtags.slice(0, 4).map((tag) => <span key={tag} className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-1 text-[11px] text-zinc-600">{tag}</span>)}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => openInWriter(router, post, activeClientId)} className="cursor-pointer rounded-lg border border-zinc-300 px-3 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-50">Load in writer</button>
                    <button onClick={() => navigator.clipboard.writeText(post.content)} className="cursor-pointer rounded-lg border border-zinc-300 px-3 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-50">Copy</button>
                    <button onClick={() => onDelete(post)} className="cursor-pointer rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50">Delete</button>
                  </div>
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  {intelligence.scores.slice(0, 3).map((item) => (
                    <div key={item.label} className="rounded-xl bg-zinc-50 px-3 py-2">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">{item.label}</p>
                      <p className="mt-1 text-sm font-bold text-zinc-900">{item.score}/100</p>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-zinc-200 bg-white p-4"><p className="text-xs text-zinc-500">{label}</p><p className="mt-1 text-lg font-bold text-zinc-900">{value}</p></div>
}
