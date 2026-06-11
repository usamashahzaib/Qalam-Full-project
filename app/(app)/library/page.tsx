"use client"

import { useCallback, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useWorkspace, type WorkspacePost } from "@/components/providers/WorkspaceProvider"
import { persistWriterIntent, withClientParam } from "@/lib/workspace-navigation"
import { LockedFeature } from "@/components/LockedFeature"

// ─── Types ────────────────────────────────────────────────────────────────────

type View = "table" | "grid"
type SortKey = "newest" | "oldest"
type FilterType = "all" | "text" | "carousel"
type FilterStatus = "all" | "draft" | "scheduled" | "published"

// ─── Helpers ─────────────────────────────────────────────────────────────────

const PER_PAGE = 20

const isCarouselType = (type: string) => type.toLowerCase().includes("carousel")
const formatDate = (iso: string) => {
  if (!iso) return "-"
  try { return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) }
  catch { return iso.slice(0, 10) }
}

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === "scheduled" ? "bg-amber-100 text-amber-700" :
    status === "published" ? "bg-emerald-100 text-emerald-700" :
    "bg-zinc-100 text-zinc-500"
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold capitalize ${cls}`}>{status}</span>
}

// ─── Main Component ───────────────────────────────────────────────────────────

function LibrarySkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
      <div className="divide-y divide-zinc-100">
        {[1, 2, 3, 4, 5, 6, 7].map((i) => (
          <div key={i} className="flex items-center gap-4 px-5 py-4">
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-4 w-3/5 animate-pulse rounded bg-zinc-100" />
              <div className="h-3 w-1/4 animate-pulse rounded bg-zinc-100" />
            </div>
            <div className="h-5 w-16 animate-pulse rounded-full bg-zinc-100" />
            <div className="h-5 w-20 animate-pulse rounded-full bg-zinc-100" />
          </div>
        ))}
      </div>
    </div>
  )
}

export default function LibraryPage() {
  const router = useRouter()
  const { posts, deletePost, refreshPosts, workspaceId, state, isLoadingPosts } = useWorkspace()
  const activeClientId = state.agency?.activeClientId ?? null

  // Filters
  const [filterType, setFilterType] = useState<FilterType>("all")
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all")
  const [search, setSearch] = useState("")
  const [sort, setSort] = useState<SortKey>("newest")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [view, setView] = useState<View>("table")
  const [page, setPage] = useState(1)

  // Action state
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isDuplicating, setIsDuplicating] = useState<string | null>(null)
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: "success" | "error" } | null>(null)

  const showStatus = useCallback((text: string, type: "success" | "error") => {
    setStatusMsg({ text, type })
    setTimeout(() => setStatusMsg(null), 4000)
  }, [])

  // ─── Filtered + sorted list ───────────────────────────────────────────────

  const filtered = useMemo(() => {
    let result = [...posts]

    if (filterType === "carousel") result = result.filter((p) => isCarouselType(p.type))
    else if (filterType === "text") result = result.filter((p) => !isCarouselType(p.type))

    if (filterStatus !== "all") result = result.filter((p) => p.status === filterStatus)

    if (search.trim()) {
      const q = search.trim().toLowerCase()
      result = result.filter((p) => p.title.toLowerCase().includes(q) || p.content.toLowerCase().includes(q))
    }

    if (dateFrom) result = result.filter((p) => (p.updatedAt || p.date) >= dateFrom)
    if (dateTo) result = result.filter((p) => (p.updatedAt || p.date) <= dateTo + "T99")

    result.sort((a, b) => {
      const aTime = a.updatedAt || a.date || ""
      const bTime = b.updatedAt || b.date || ""
      return sort === "newest" ? bTime.localeCompare(aTime) : aTime.localeCompare(bTime)
    })

    return result
  }, [posts, filterType, filterStatus, search, sort, dateFrom, dateTo])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE))
  const paginated = useMemo(() => filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE), [filtered, page])

  const resetPage = () => setPage(1)

  // ─── Actions ─────────────────────────────────────────────────────────────

  const onEdit = (post: WorkspacePost) => {
    persistWriterIntent(post, null)
    router.push(withClientParam("/writer", activeClientId))
  }

  const onDeleteConfirm = async () => {
    if (!deleteConfirmId) return
    setIsDeleting(true)
    try {
      await deletePost(deleteConfirmId)
      setDeleteConfirmId(null)
      showStatus("Post deleted.", "success")
    } catch (e) {
      showStatus((e as Error).message || "Delete failed", "error")
    } finally {
      setIsDeleting(false)
    }
  }

  const onDuplicate = async (post: WorkspacePost) => {
    setIsDuplicating(post.id)
    try {
      const res = await fetch("/api/posts/duplicate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId: post.id, workspaceKey: workspaceId }),
      })
      const data = await res.json() as { error?: string }
      if (!res.ok) throw new Error(data.error || "Duplicate failed")
      await refreshPosts()
      showStatus(`"${post.title}" duplicated as a draft.`, "success")
    } catch (e) {
      showStatus((e as Error).message || "Duplicate failed", "error")
    } finally {
      setIsDuplicating(null)
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <LockedFeature feature="Post Library" requiredPlan="Solo">
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">

      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Post Library</h1>
          <p className="mt-0.5 text-sm text-zinc-500">{posts.length} posts in this workspace</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-xl border border-zinc-200 bg-white p-1">
            <button
              onClick={() => setView("table")}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${view === "table" ? "bg-zinc-900 text-white" : "text-zinc-500 hover:text-zinc-700"}`}
            >
              Table
            </button>
            <button
              onClick={() => setView("grid")}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${view === "grid" ? "bg-zinc-900 text-white" : "text-zinc-500 hover:text-zinc-700"}`}
            >
              Grid
            </button>
          </div>
        </div>
      </div>

      {/* Filters bar */}
      <div className="mb-5 flex flex-wrap gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <svg className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" viewBox="0 0 16 16" fill="none">
            <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.4"/>
            <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); resetPage() }}
            placeholder="Search posts..."
            className="w-full rounded-xl border border-zinc-200 bg-white py-2 pl-8 pr-4 text-sm outline-none focus:border-teal focus:ring-4 focus:ring-teal/10"
          />
        </div>

        {/* Type filter */}
        <select
          value={filterType}
          onChange={(e) => { setFilterType(e.target.value as FilterType); resetPage() }}
          className="cursor-pointer rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 outline-none focus:border-teal focus:ring-4 focus:ring-teal/10"
        >
          <option value="all">All types</option>
          <option value="text">Text posts</option>
          <option value="carousel">Carousels</option>
        </select>

        {/* Status filter */}
        <select
          value={filterStatus}
          onChange={(e) => { setFilterStatus(e.target.value as FilterStatus); resetPage() }}
          className="cursor-pointer rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 outline-none focus:border-teal focus:ring-4 focus:ring-teal/10"
        >
          <option value="all">All statuses</option>
          <option value="draft">Drafts</option>
          <option value="scheduled">Scheduled</option>
          <option value="published">Published</option>
        </select>

        {/* Sort */}
        <select
          value={sort}
          onChange={(e) => { setSort(e.target.value as SortKey); resetPage() }}
          className="cursor-pointer rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 outline-none focus:border-teal focus:ring-4 focus:ring-teal/10"
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
        </select>

        {/* Date range */}
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => { setDateFrom(e.target.value); resetPage() }}
          className="cursor-pointer rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 outline-none focus:border-teal focus:ring-4 focus:ring-teal/10"
          title="From date"
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => { setDateTo(e.target.value); resetPage() }}
          className="cursor-pointer rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 outline-none focus:border-teal focus:ring-4 focus:ring-teal/10"
          title="To date"
        />

        {(search || filterType !== "all" || filterStatus !== "all" || dateFrom || dateTo) && (
          <button
            onClick={() => { setSearch(""); setFilterType("all"); setFilterStatus("all"); setDateFrom(""); setDateTo(""); resetPage() }}
            className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-500 hover:text-zinc-700"
          >
            Clear
          </button>
        )}
      </div>

      {statusMsg && (
        <div className={`mb-4 rounded-xl border px-4 py-2.5 text-sm font-medium ${statusMsg.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700"}`}>
          {statusMsg.text}
        </div>
      )}

      {/* Results count */}
      {!isLoadingPosts && (
        <p className="mb-3 text-xs text-zinc-400">
          {filtered.length === 0 ? "No posts found" : `${filtered.length} post${filtered.length !== 1 ? "s" : ""} · page ${page} of ${totalPages}`}
        </p>
      )}

      {/* Loading skeleton */}
      {isLoadingPosts ? (
        <LibrarySkeleton />
      ) : /* Empty state */ posts.length === 0 ? (
        <div className="rounded-2xl border border-zinc-200 bg-white px-6 py-20 text-center shadow-sm">
          <p className="text-sm font-semibold text-zinc-800">No posts yet</p>
          <p className="mt-1 text-sm text-zinc-400">Create your first post in the writer to see it here.</p>
          <button
            onClick={() => router.push(withClientParam("/writer", activeClientId))}
            className="mt-4 cursor-pointer rounded-xl bg-teal px-4 py-2 text-sm font-semibold text-white hover:bg-teal-600"
          >
            Open Writer
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-zinc-200 bg-white px-6 py-16 text-center shadow-sm">
          <p className="text-sm font-semibold text-zinc-700">No posts match your filters</p>
          <p className="mt-1 text-xs text-zinc-400">Try adjusting the search or filter criteria.</p>
        </div>
      ) : view === "table" ? (
        /* ── Table view ── */
        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50">
                  <th className="w-[40%] px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-zinc-400">Title / Hook</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-zinc-400">Type</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-zinc-400">Date</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-zinc-400">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {paginated.map((post) => (
                  <tr key={post.id} className="group transition-colors hover:bg-zinc-50/60">
                    <td className="px-5 py-3.5">
                      <p className="max-w-sm truncate text-sm font-semibold text-zinc-900">{post.title}</p>
                      <p className="mt-0.5 max-w-sm truncate text-xs text-zinc-400">{post.content?.slice(0, 100)}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[10px] font-semibold text-zinc-500">
                        {isCarouselType(post.type) ? "Carousel" : "Text"}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-zinc-500">
                      {formatDate(post.scheduledTime || post.updatedAt || post.date)}
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusBadge status={post.status} />
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                        <button
                          onClick={() => onEdit(post)}
                          className="cursor-pointer rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => void onDuplicate(post)}
                          disabled={isDuplicating === post.id}
                          className="cursor-pointer rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
                        >
                          {isDuplicating === post.id ? "..." : "Duplicate"}
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(post.id)}
                          className="cursor-pointer rounded-lg border border-red-200 bg-white px-2.5 py-1 text-xs font-semibold text-red-500 hover:bg-red-50"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* ── Grid view ── */
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {paginated.map((post) => (
            <div
              key={post.id}
              className="group overflow-hidden rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition-all hover:border-teal/40 hover:shadow-md"
            >
              <div className="mb-3 flex items-start justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[10px] font-semibold text-zinc-500">
                    {isCarouselType(post.type) ? "Carousel" : "Text"}
                  </span>
                  <StatusBadge status={post.status} />
                </div>
                <span className="text-[10px] text-zinc-400">{formatDate(post.scheduledTime || post.updatedAt || post.date)}</span>
              </div>
              <p className="mb-1.5 text-sm font-bold leading-snug text-zinc-900 line-clamp-2">{post.title}</p>
              <p className="text-xs leading-relaxed text-zinc-500 line-clamp-3">{post.content}</p>
              <div className="mt-4 flex items-center gap-2 border-t border-zinc-100 pt-3">
                <button
                  onClick={() => onEdit(post)}
                  className="cursor-pointer rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
                >
                  Edit
                </button>
                <button
                  onClick={() => void onDuplicate(post)}
                  disabled={isDuplicating === post.id}
                  className="cursor-pointer rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-50"
                >
                  {isDuplicating === post.id ? "..." : "Duplicate"}
                </button>
                <button
                  onClick={() => setDeleteConfirmId(post.id)}
                  className="cursor-pointer ml-auto rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-50 hover:border-red-200"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {filtered.length > 0 && totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-1">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="cursor-pointer rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-600 hover:bg-zinc-50 disabled:opacity-40"
          >
            Prev
          </button>
          {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
            let pageNum: number
            if (totalPages <= 7) {
              pageNum = i + 1
            } else if (page <= 4) {
              pageNum = i + 1
            } else if (page >= totalPages - 3) {
              pageNum = totalPages - 6 + i
            } else {
              pageNum = page - 3 + i
            }
            return (
              <button
                key={pageNum}
                onClick={() => setPage(pageNum)}
                className={`cursor-pointer rounded-xl border px-3 py-2 text-xs font-semibold transition-all ${
                  pageNum === page ? "border-teal bg-teal/10 text-teal" : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
                }`}
              >
                {pageNum}
              </button>
            )
          })}
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="cursor-pointer rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-600 hover:bg-zinc-50 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}

      {/* Delete confirm modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/40 px-4">
          <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-5 shadow-xl">
            <h2 className="text-base font-bold text-zinc-900">Delete post?</h2>
            <p className="mt-1.5 text-sm text-zinc-500">
              This will permanently delete the post. This cannot be undone.
            </p>
            <div className="mt-5 flex gap-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                disabled={isDeleting}
                className="flex-1 cursor-pointer rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
              >
                Cancel
              </button>
              <button
                onClick={() => void onDeleteConfirm()}
                disabled={isDeleting}
                className="flex-1 cursor-pointer rounded-xl bg-red-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-600 disabled:opacity-60"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </LockedFeature>
  )
}
