"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"

const ROLE_FILTERS = [
  ["all", "All"],
  ["ai_engineer", "AI Engineer"],
  ["ceo", "CEO"],
  ["hr", "HR"],
  ["sales", "Sales"],
  ["designer", "Designer"],
  ["founder", "Founder"],
  ["consultant", "Consultant"],
] as const
const SORTS = [
  ["newest", "Newest"],
  ["oldest", "Oldest"],
  ["score", "Highest score"],
] as const

type RoleFilter = (typeof ROLE_FILTERS)[number][0]
type SortKey = (typeof SORTS)[number][0]
type ViewMode = "grid" | "list"
type Post = {
  id: string
  title: string | null
  content: string
  status: string
  role_profile: string | null
  engagement_score: number | null
  created_at: string | null
  updated_at?: string | null
  published_at?: string | null
  scheduled_for?: string | null
  metadata?: Record<string, unknown> | null
}

const roleLabel = (role?: string | null) => ROLE_FILTERS.find(([key]) => key === role)?.[1] || "General"
const dateLabel = (value?: string | null) => value ? new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "No date"
const clean = (value?: string | null) => String(value || "").trim()
const postTitle = (post: Post) => clean(post.title) || clean(post.content).split("\n")[0]?.slice(0, 80) || "Untitled post"
const excerpt = (value: string) => clean(value).replace(/\s+/g, " ").slice(0, 100)

export default function LibraryPage() {
  const [posts, setPosts] = useState<Post[]>([])
  const [query, setQuery] = useState("")
  const [role, setRole] = useState<RoleFilter>("all")
  const [sort, setSort] = useState<SortKey>("newest")
  const [view, setView] = useState<ViewMode>("grid")
  const [selected, setSelected] = useState<Post | null>(null)
  const [draft, setDraft] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState("")
  const [status, setStatus] = useState("")

  useEffect(() => {
    let active = true
    ;(async () => {
      setIsLoading(true)
      setError("")
      try {
        const res = await fetch("/api/posts", { cache: "no-store" })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.error || "Failed to load posts")
        if (active) setPosts(Array.isArray(data.posts) ? data.posts : [])
      } catch (err) {
        if (active) setError((err as Error).message)
      } finally {
        if (active) setIsLoading(false)
      }
    })()
    return () => { active = false }
  }, [])

  const shown = useMemo(() => {
    const term = query.trim().toLowerCase()
    return posts
      .filter((post) => role === "all" || post.role_profile === role)
      .filter((post) => !term || `${postTitle(post)} ${post.content}`.toLowerCase().includes(term))
      .sort((a, b) => {
        if (sort === "score") return (b.engagement_score || 0) - (a.engagement_score || 0)
        const diff = new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()
        return sort === "oldest" ? diff : -diff
      })
  }, [posts, query, role, sort])

  const openPost = (post: Post) => {
    setSelected(post)
    setDraft(post.content)
    setStatus("")
  }

  const savePost = async () => {
    if (!selected) return
    setIsSaving(true)
    setStatus("")
    try {
      const res = await fetch("/api/generate", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selected.id, content: draft }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Failed to save post")
      setPosts((prev) => prev.map((post) => post.id === selected.id ? { ...post, content: draft, updated_at: new Date().toISOString() } : post))
      setSelected((prev) => prev ? { ...prev, content: draft } : prev)
      setStatus("Saved.")
    } catch (err) {
      setStatus((err as Error).message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-6 text-zinc-950 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-5 lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="h-fit rounded-lg border border-zinc-200 bg-white p-3 shadow-sm">
          <div className="px-2 py-2">
            <h1 className="text-lg font-bold">Library</h1>
            <p className="mt-1 text-xs text-zinc-500">{posts.length} real posts</p>
          </div>
          <div className="mt-3 space-y-1">
            {ROLE_FILTERS.map(([key, label]) => (
              <button key={key} onClick={() => setRole(key)} className={`w-full rounded-md px-3 py-2 text-left text-sm font-semibold ${role === key ? "bg-zinc-950 text-white" : "text-zinc-600 hover:bg-zinc-100"}`}>
                {label}
              </button>
            ))}
          </div>
        </aside>

        <section className="min-w-0">
          <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto]">
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search title + content..." className="rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-teal" />
              <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className="rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-teal">
                {SORTS.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
              </select>
              <div className="flex rounded-lg border border-zinc-200 p-1">
                {(["grid", "list"] as const).map((item) => (
                  <button key={item} onClick={() => setView(item)} className={`rounded-md px-3 py-1.5 text-xs font-bold capitalize ${view === item ? "bg-zinc-950 text-white" : "text-zinc-500 hover:bg-zinc-100"}`}>
                    {item}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {error ? <p className="mt-4 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}

          {isLoading ? (
            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {[0, 1, 2, 3, 4, 5].map((item) => <div key={item} className="h-44 animate-pulse rounded-lg bg-zinc-100" />)}
            </div>
          ) : shown.length === 0 ? (
            <div className="mt-5 rounded-lg border border-dashed border-zinc-300 bg-white px-6 py-16 text-center">
              <p className="text-sm font-semibold text-zinc-900">No posts yet. Go to Write to create your first post.</p>
              <Link href="/write" className="mt-4 inline-flex rounded-lg bg-zinc-950 px-4 py-2 text-sm font-bold text-white hover:bg-zinc-800">Go to Write</Link>
            </div>
          ) : (
            <div className={view === "grid" ? "mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3" : "mt-5 space-y-3"}>
              {shown.map((post) => <PostCard key={post.id} post={post} view={view} onOpen={() => openPost(post)} />)}
            </div>
          )}
        </section>
      </div>

      {selected ? (
        <div className="fixed inset-0 z-50 bg-zinc-950/40 px-4 py-6 backdrop-blur-sm">
          <div className="mx-auto flex max-h-[calc(100vh-48px)] max-w-3xl flex-col rounded-lg bg-white shadow-xl">
            <div className="border-b border-zinc-100 px-5 py-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-zinc-400">{roleLabel(selected.role_profile)} / {selected.status}</p>
                  <h2 className="mt-1 text-xl font-bold">{postTitle(selected)}</h2>
                </div>
                <button onClick={() => setSelected(null)} className="rounded-md border border-zinc-200 px-3 py-1.5 text-sm font-semibold hover:bg-zinc-50">Close</button>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-auto p-5">
              <textarea value={draft} onChange={(e) => setDraft(e.target.value)} className="min-h-[420px] w-full resize-y rounded-lg border border-zinc-200 px-4 py-3 text-sm leading-6 outline-none focus:border-teal" />
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-zinc-100 px-5 py-4">
              <p className="text-sm text-zinc-500">{status || `${draft.length} characters`}</p>
              <button onClick={savePost} disabled={isSaving} className="rounded-lg bg-teal px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{isSaving ? "Saving..." : "Save"}</button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  )
}

function PostCard({ post, view, onOpen }: { post: Post; view: ViewMode; onOpen: () => void }) {
  const score = post.engagement_score ?? 0
  const statusStyle = post.status === "published" ? "bg-teal/10 text-teal" : "bg-zinc-100 text-zinc-600"
  return (
    <button onClick={onOpen} className={`w-full rounded-lg border border-zinc-200 bg-white p-4 text-left shadow-sm transition hover:border-teal/40 hover:shadow-md ${view === "list" ? "grid gap-4 md:grid-cols-[1fr_auto]" : ""}`}>
      <div className="min-w-0">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-zinc-950 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">{roleLabel(post.role_profile)}</span>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${statusStyle}`}>{post.status || "draft"}</span>
        </div>
        <h2 className="line-clamp-2 text-base font-bold leading-snug text-zinc-950">{postTitle(post)}</h2>
        <p className="mt-2 text-sm leading-6 text-zinc-600">{excerpt(post.content)}{post.content.length > 100 ? "..." : ""}</p>
      </div>
      <div className={`mt-4 flex items-center justify-between gap-3 border-t border-zinc-100 pt-3 ${view === "list" ? "md:mt-0 md:min-w-48 md:flex-col md:items-end md:border-t-0 md:pt-0" : ""}`}>
        <span className="text-xs font-semibold text-zinc-400">{dateLabel(post.created_at)}</span>
        <span className="rounded-md border border-zinc-200 px-2.5 py-1 text-xs font-bold text-zinc-800">{score}/100</span>
      </div>
    </button>
  )
}
