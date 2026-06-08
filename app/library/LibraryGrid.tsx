"use client"

import { useState, useCallback } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

export type LibraryPost = {
  id: string
  title?: string | null
  content?: string | null
  role?: string | null
  score?: number | null
  type?: string | null
  created_at: string
}

const labelRole = (role?: string | null) =>
  (role || "General").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })

const scoreBadge = (score: number | null | undefined) => {
  const v = Number(score ?? 0)
  if (!v) return { label: "—", cls: "bg-zinc-100 text-zinc-400 border-zinc-200" }
  if (v >= 80) return { label: String(v), cls: "bg-teal/8 text-teal border-teal/20" }
  if (v >= 60) return { label: String(v), cls: "bg-amber-50 text-amber-700 border-amber-200" }
  return { label: String(v), cls: "bg-red-50 text-red-600 border-red-200" }
}

function copyToClipboard(text: string) {
  if (navigator.clipboard) {
    return navigator.clipboard.writeText(text)
  }
  const el = document.createElement("textarea")
  el.value = text
  document.body.appendChild(el)
  el.select()
  document.execCommand("copy")
  document.body.removeChild(el)
  return Promise.resolve()
}

function exportCsv(posts: LibraryPost[]) {
  const header = ["ID", "Title", "Role", "Score", "Date", "Content"]
  const rows = posts.map((p) => [
    p.id,
    p.title || "",
    labelRole(p.role),
    String(p.score ?? ""),
    fmtDate(p.created_at),
    (p.content || "").replace(/"/g, '""'),
  ])
  const csv = [header, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n")
  const blob = new Blob([csv], { type: "text/csv" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `qalam-library-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ─── Post card ────────────────────────────────────────────────────────────────

function PostCard({
  post,
  selected,
  onToggle,
  onDelete,
}: {
  post: LibraryPost
  selected: boolean
  onToggle: () => void
  onDelete: (id: string) => void
}) {
  const [copied, setCopied] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const hook = (post.title || post.content || "Untitled post").slice(0, 120)
  const truncated = (post.title || post.content || "").length > 120
  const badge = scoreBadge(post.score)

  const handleCopy = async () => {
    await copyToClipboard(post.content || post.title || "")
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }
    setDeleting(true)
    try {
      const res = await fetch(`/api/posts?id=${post.id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Delete failed")
      onDelete(post.id)
    } catch {
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  const isCarousel = post.type?.toLowerCase().includes("carousel")

  return (
    <article
      className={`relative flex flex-col rounded-2xl border bg-white shadow-sm transition-all ${
        selected ? "border-teal ring-2 ring-teal/20" : "border-zinc-200 hover:border-zinc-300 hover:shadow"
      }`}
    >
      {/* Selection checkbox */}
      <button
        onClick={onToggle}
        aria-label={selected ? "Deselect post" : "Select post"}
        className="absolute left-4 top-4 z-10 flex h-5 w-5 items-center justify-center rounded border border-zinc-300 bg-white transition-colors hover:border-teal"
      >
        {selected && (
          <svg className="h-3 w-3 text-teal" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        )}
      </button>

      <div className="flex flex-1 flex-col p-5 pt-4">
        {/* Badges row */}
        <div className="mb-3 flex items-center gap-2 pl-7">
          {post.role && (
            <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-zinc-600">
              {labelRole(post.role)}
            </span>
          )}
          {isCarousel && (
            <span className="rounded-full bg-violet-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-violet-600 border border-violet-200">
              Carousel
            </span>
          )}
          <span className={`ml-auto rounded-full border px-2.5 py-0.5 text-xs font-bold tabular-nums ${badge.cls}`}>
            {badge.label}
          </span>
        </div>

        {/* Hook text */}
        <p className="flex-1 text-sm font-semibold leading-relaxed text-zinc-900">
          {hook}{truncated ? "…" : ""}
        </p>

        <p className="mt-3 text-xs text-zinc-400">{fmtDate(post.created_at)}</p>

        {/* Actions */}
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-zinc-100 pt-4">
          <button
            onClick={handleCopy}
            className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-semibold text-zinc-700 transition-colors hover:border-zinc-300 hover:bg-zinc-50"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
          <Link
            href={`/write?id=${post.id}`}
            className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-semibold text-zinc-700 transition-colors hover:border-zinc-300 hover:bg-zinc-50"
          >
            Edit
          </Link>
          {confirmDelete ? (
            <div className="ml-auto flex items-center gap-1.5">
              <button
                onClick={() => setConfirmDelete(false)}
                className="rounded-lg border border-zinc-200 px-2.5 py-1.5 text-xs font-semibold text-zinc-500 hover:bg-zinc-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="rounded-lg border border-red-300 bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-600 transition-colors hover:bg-red-100 disabled:opacity-50"
              >
                {deleting ? "Deleting…" : "Confirm"}
              </button>
            </div>
          ) : (
            <button
              onClick={handleDelete}
              className="ml-auto rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-semibold text-red-500 transition-colors hover:border-red-200 hover:bg-red-50"
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </article>
  )
}

// ─── Main grid component ──────────────────────────────────────────────────────

export function LibraryGrid({ initialPosts }: { initialPosts: LibraryPost[] }) {
  const router = useRouter()
  const [posts, setPosts] = useState<LibraryPost[]>(initialPosts)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [copiedAll, setCopiedAll] = useState(false)

  const toggleSelect = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const toggleAll = () => {
    if (selected.size === posts.length) setSelected(new Set())
    else setSelected(new Set(posts.map((p) => p.id)))
  }

  const handleDelete = useCallback((id: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== id))
    setSelected((prev) => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
    router.refresh()
  }, [router])

  const selectedPosts = posts.filter((p) => selected.has(p.id))

  const handleCopySelected = async () => {
    const text = selectedPosts.map((p) => p.content || p.title || "").join("\n\n---\n\n")
    await copyToClipboard(text)
    setCopiedAll(true)
    setTimeout(() => setCopiedAll(false), 1500)
  }

  const handleExportCsv = () => {
    const toExport = selectedPosts.length > 0 ? selectedPosts : posts
    exportCsv(toExport)
  }

  if (posts.length === 0) {
    return (
      <section className="rounded-2xl border border-dashed border-zinc-300 bg-white px-8 py-16 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-zinc-200 bg-zinc-50">
          <svg className="h-8 w-8 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <p className="mt-5 text-base font-bold text-zinc-900">Your library is empty</p>
        <p className="mt-1 text-sm text-zinc-500">Generate your first post to get started.</p>
        <Link
          href="/write"
          className="mt-6 inline-block rounded-xl bg-zinc-950 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-zinc-800"
        >
          Write first post
        </Link>
      </section>
    )
  }

  return (
    <div className="space-y-4">
      {/* Bulk action bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={toggleAll}
            className="flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
          >
            <span className={`inline-flex h-4 w-4 items-center justify-center rounded border text-[9px] ${selected.size === posts.length && posts.length > 0 ? "border-teal bg-teal text-white" : "border-zinc-300 bg-white"}`}>
              {selected.size === posts.length && posts.length > 0 ? "✓" : ""}
            </span>
            {selected.size > 0 ? `${selected.size} selected` : "Select all"}
          </button>
          {selected.size > 0 && (
            <span className="text-xs text-zinc-400">{selected.size} of {posts.length}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {selected.size > 0 && (
            <button
              onClick={handleCopySelected}
              className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
            >
              {copiedAll ? "Copied!" : `Copy selected (${selected.size})`}
            </button>
          )}
          <button
            onClick={handleExportCsv}
            className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
          >
            {selected.size > 0 ? `Export selected (${selected.size})` : "Export all"} CSV
          </button>
          <button
            disabled
            title="Coming soon"
            className="cursor-not-allowed rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-semibold text-zinc-400"
          >
            Export PDF <span className="ml-1 rounded bg-zinc-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide">Soon</span>
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {posts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            selected={selected.has(post.id)}
            onToggle={() => toggleSelect(post.id)}
            onDelete={handleDelete}
          />
        ))}
      </div>
    </div>
  )
}
