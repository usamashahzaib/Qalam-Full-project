"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { useWorkspace } from "@/components/providers/WorkspaceProvider"
import { PlanGate } from "@/components/PlanGate"
import { withClientParam } from "@/lib/workspace-navigation"

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
  const isClientWorkspace = Boolean(workspaceId)

  const [items, setItems] = useState<ApprovalItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actioning, setActioning] = useState<string | null>(null)
  const [comments, setComments] = useState<Record<string, string>>({})

  const fetchItems = useCallback(async () => {
    if (!isClientWorkspace) {
      setItems([])
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/approvals?workspaceKey=${encodeURIComponent(workspaceId)}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to load approvals")
      setItems(Array.isArray(data.items) ? data.items : [])
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setIsLoading(false)
    }
  }, [isClientWorkspace, workspaceId])

  // eslint-disable-next-line react-hooks/set-state-in-effect
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
      setItems((prev) => prev.map((item) => item.post.id === postId ? { ...item, post: { ...item.post, status: decision }, approval: data.approval } : item))
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setActioning(null)
    }
  }

  const pending = items.filter((i) => i.post.status === "pending_approval")
  const resolved = items.filter((i) => i.post.status !== "pending_approval")

  return (
    <PlanGate requiredPlan="Pro" feature="Approval Workflow" description="Manage post reviews and client approvals with the ">
    <div className="mx-auto max-w-5xl px-6 py-10 sm:px-10 font-jakarta">
      <div className="relative mb-8 overflow-hidden rounded-2xl border border-zinc-100 bg-white px-6 py-5 shadow-sm">
        <div
          className="pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full"
          style={{ background: "radial-gradient(circle, rgba(13,74,69,0.1) 0%, transparent 70%)" }}
        />
        <div className="relative flex items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-zinc-900">Approvals</h1>
            <p className="mt-1 text-sm text-zinc-500">Client review lives here. Personal workspaces do not need an approval queue.</p>
          </div>
          {isClientWorkspace ? <button onClick={fetchItems} className="shrink-0 text-sm font-semibold text-teal hover:text-teal-700">Refresh</button> : null}
        </div>
      </div>

      {error && <div className="mb-6 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>}

      {!isClientWorkspace ? (
        <div className="rounded-2xl border border-zinc-200 bg-white px-6 py-10">
          <p className="text-lg font-semibold text-zinc-900">No approval queue in Personal Workspace</p>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">Use Save draft, Schedule post, or Publish now in your own workspace. Approval queues activate when you switch into a client workspace from Agency Hub.</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/writer" className="rounded-lg bg-teal px-4 py-2 text-sm font-semibold text-white hover:bg-teal-600">Open writer</Link>
            <Link href="/agency" className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-50">Open Agency Hub</Link>
          </div>
        </div>
      ) : isLoading ? (
        <div className="space-y-4">{[1, 2, 3].map((i) => <div key={i} className="h-28 rounded-2xl bg-zinc-100 animate-pulse" />)}</div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-zinc-200 bg-white px-6 py-16 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-100"><svg className="h-7 w-7 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div>
          <p className="font-semibold text-zinc-900">No posts waiting for review</p>
          <p className="mt-1 text-sm text-zinc-500">Writers can send posts here when a client needs to review before publishing.</p>
          <Link href={withClientParam("/writer", workspaceId)} className="mt-5 inline-block rounded-lg bg-teal px-4 py-2 text-sm font-semibold text-white hover:bg-teal-600">Go to writer</Link>
        </div>
      ) : (
        <div className="space-y-8">
          {pending.length > 0 && (
            <section>
              <h2 className="mb-4 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-[9px] font-bold text-blue-700">{pending.length}</span>
                Awaiting Review
              </h2>
              <div className="space-y-4">
                {pending.map(({ post }) => (
                  <div key={post.id} className="overflow-hidden rounded-2xl border border-blue-200/70 bg-white shadow-sm">
                    <div className="flex items-start justify-between gap-4 border-b border-zinc-100 bg-blue-50/30 p-5">
                      <div className="min-w-0 flex-1">
                        <div className="mb-1.5 flex items-center gap-2">
                          <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase ${STATUS_STYLES[post.status] || "bg-zinc-50 text-zinc-600"}`}>{post.status.replaceAll("_", " ")}</span>
                          <span className="rounded border border-zinc-100 bg-white px-2 py-0.5 text-[10px] text-zinc-500">{post.type}</span>
                        </div>
                        <h3 className="font-bold text-zinc-900 truncate">{post.title}</h3>
                        <p className="mt-1 text-xs text-zinc-400">Updated {new Date(post.updated_at).toLocaleString()}</p>
                      </div>
                      <Link href={withClientParam("/writer", workspaceId)} onClick={() => {
                        if (typeof window !== "undefined") {
                          sessionStorage.setItem("writerLoad", JSON.stringify({ id: post.id, title: post.title, content: post.content || "", type: post.type }))
                        }
                      }} className="shrink-0 text-xs font-semibold text-teal transition-colors hover:text-teal-700">View in writer →</Link>
                    </div>

                    {post.content && <div className="border-b border-zinc-100 bg-zinc-50/60 px-5 py-3.5 text-sm leading-relaxed text-zinc-700 line-clamp-4 whitespace-pre-wrap">{post.content}</div>}

                    <div className="flex flex-col items-start gap-3 p-4 sm:flex-row">
                      <input
                        type="text"
                        placeholder="Add a comment (optional)..."
                        value={comments[post.id] || ""}
                        onChange={(e) => setComments((prev) => ({ ...prev, [post.id]: e.target.value }))}
                        className="flex-1 rounded-xl border border-zinc-200 px-3.5 py-2.5 text-sm text-zinc-900 outline-none transition-all focus:border-teal/40 focus:ring-4 focus:ring-teal/8"
                      />
                      <div className="flex gap-2">
                        <button onClick={() => handleDecision(post.id, "rejected")} disabled={actioning === post.id} className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-bold text-red-700 transition-all hover:bg-red-100 disabled:opacity-50">{actioning === post.id ? "..." : "Reject"}</button>
                        <button onClick={() => handleDecision(post.id, "approved")} disabled={actioning === post.id} className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-emerald-700 disabled:opacity-50">{actioning === post.id ? "..." : "Approve"}</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {resolved.length > 0 && (
            <section>
              <h2 className="mb-4 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Recently resolved ({resolved.length})</h2>
              <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white divide-y divide-zinc-100">
                {resolved.slice(0, 10).map(({ post, approval }) => (
                  <div key={post.id} className="flex items-center justify-between px-5 py-3.5 transition-colors hover:bg-zinc-50">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${STATUS_STYLES[post.status] || "bg-zinc-50 text-zinc-600"}`}>{post.status.replaceAll("_", " ")}</span>
                        <p className="truncate text-sm font-medium text-zinc-900">{post.title}</p>
                      </div>
                      {approval?.comments && <p className="mt-1 text-xs italic text-zinc-500">&quot;{approval.comments}&quot;</p>}
                    </div>
                    <span className="ml-4 shrink-0 text-xs text-zinc-400">{approval?.created_at ? new Date(approval.created_at).toLocaleDateString() : ""}</span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
    </PlanGate>
  )
}
