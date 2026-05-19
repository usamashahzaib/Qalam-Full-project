"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { useWorkspace } from "@/components/providers/WorkspaceProvider"

type Post = { id: string; title: string; status: string; type: string; content: string | null; updated_at: string }
type Approval = { id: string; post_id: string; reviewer_id: string | null; status: string; comments: string | null; created_at: string } | null
type ApprovalItem = { post: Post; approval: Approval }

const STATUS_STYLES: Record<string, string> = {
  pending_approval: "bg-blue-50 text-blue-700 border-blue-200",
  approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  rejected: "bg-red-50 text-red-700 border-red-200",
}

export default function ApprovalsPage() {
  const { state } = useWorkspace()
  const workspaceId = (state as { agency?: { activeClientId?: string | null } })?.agency?.activeClientId || ""

  const [items, setItems] = useState<ApprovalItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actioning, setActioning] = useState<string | null>(null)
  const [comments, setComments] = useState<Record<string, string>>({})

  const fetchItems = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/approvals${workspaceId ? `?workspaceKey=${encodeURIComponent(workspaceId)}` : ""}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to load approvals")
      setItems(Array.isArray(data.items) ? data.items : [])
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setIsLoading(false)
    }
  }, [workspaceId])

  useEffect(() => { fetchItems() }, [fetchItems])

  const handleDecision = async (postId: string, decision: "approved" | "rejected") => {
    setActioning(postId)
    try {
      const res = await fetch("/api/approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId, decision, comments: comments[postId] || null, workspaceKey: workspaceId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Action failed")
      // Update local state
      setItems(prev => prev.map(item =>
        item.post.id === postId
          ? { ...item, post: { ...item.post, status: decision }, approval: data.approval }
          : item
      ))
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setActioning(null)
    }
  }

  const pending = items.filter(i => i.post.status === "pending_approval")
  const resolved = items.filter(i => i.post.status !== "pending_approval")

  return (
    <div className="mx-auto max-w-5xl px-6 py-10 sm:px-10 font-jakarta">
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900">Approvals</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Review and approve content before it publishes. All decisions are recorded.
          </p>
        </div>
        <button onClick={fetchItems} className="text-sm font-semibold text-teal hover:text-teal-700">
          Refresh
        </button>
      </div>

      {error && (
        <div className="mb-6 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="space-y-4">
          {[1,2,3].map(i => <div key={i} className="h-28 rounded-2xl bg-zinc-100 animate-pulse" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-zinc-200 bg-white px-6 py-16 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-100">
            <svg className="h-7 w-7 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <p className="font-semibold text-zinc-900">No posts in the approval queue</p>
          <p className="mt-1 text-sm text-zinc-500">When writers send posts for approval, they appear here.</p>
          <Link href="/writer" className="mt-5 inline-block rounded-lg bg-teal px-4 py-2 text-sm font-semibold text-white hover:bg-teal-600">
            Go to writer
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Pending */}
          {pending.length > 0 && (
            <section>
              <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-zinc-700 uppercase tracking-wider">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-700">{pending.length}</span>
                Awaiting Review
              </h2>
              <div className="space-y-4">
                {pending.map(({ post }) => (
                  <div key={post.id} className="rounded-2xl border border-blue-200 bg-white shadow-sm overflow-hidden">
                    <div className="flex items-start justify-between gap-4 p-5 border-b border-zinc-100">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase ${STATUS_STYLES[post.status] || "bg-zinc-50 text-zinc-600"}`}>
                            {post.status.replace(/_/g, " ")}
                          </span>
                          <span className="text-xs text-zinc-400">{post.type}</span>
                        </div>
                        <h3 className="font-semibold text-zinc-900 truncate">{post.title}</h3>
                        <p className="mt-1 text-xs text-zinc-500">Updated {new Date(post.updated_at).toLocaleString()}</p>
                      </div>
                      <Link href={workspaceId ? `/writer?client=${encodeURIComponent(workspaceId)}` : "/writer"} onClick={() => {
                        if (typeof window !== "undefined") {
                          sessionStorage.setItem("writerLoad", JSON.stringify({ id: post.id, title: post.title, content: post.content || "", type: post.type }))
                        }
                      }} className="shrink-0 text-xs font-semibold text-teal hover:underline">
                        View in writer →
                      </Link>
                    </div>

                    {post.content && (
                      <div className="px-5 py-3 bg-zinc-50 text-sm text-zinc-700 line-clamp-3 whitespace-pre-wrap border-b border-zinc-100">
                        {post.content}
                      </div>
                    )}

                    <div className="p-4 flex flex-col sm:flex-row gap-3 items-start">
                      <input
                        type="text"
                        placeholder="Add a comment (optional)..."
                        value={comments[post.id] || ""}
                        onChange={e => setComments(prev => ({ ...prev, [post.id]: e.target.value }))}
                        className="flex-1 rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-teal"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleDecision(post.id, "rejected")}
                          disabled={actioning === post.id}
                          className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50 transition-colors"
                        >
                          {actioning === post.id ? "..." : "Reject"}
                        </button>
                        <button
                          onClick={() => handleDecision(post.id, "approved")}
                          disabled={actioning === post.id}
                          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                        >
                          {actioning === post.id ? "..." : "Approve"}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Resolved */}
          {resolved.length > 0 && (
            <section>
              <h2 className="mb-4 text-sm font-bold text-zinc-500 uppercase tracking-wider">
                Recently Resolved ({resolved.length})
              </h2>
              <div className="space-y-3">
                {resolved.slice(0, 10).map(({ post, approval }) => (
                  <div key={post.id} className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-5 py-3.5">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase ${STATUS_STYLES[post.status] || "bg-zinc-50 text-zinc-600"}`}>
                          {post.status.replace(/_/g, " ")}
                        </span>
                        <p className="text-sm font-medium text-zinc-900 truncate">{post.title}</p>
                      </div>
                      {approval?.comments && (
                        <p className="mt-1 text-xs text-zinc-500 italic">"{approval.comments}"</p>
                      )}
                    </div>
                    <span className="ml-4 shrink-0 text-xs text-zinc-400">
                      {approval?.created_at ? new Date(approval.created_at).toLocaleDateString() : ""}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}

