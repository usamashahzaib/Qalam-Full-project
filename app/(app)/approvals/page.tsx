"use client"

import { useCallback, useEffect, useState } from "react"
import { useWorkspace } from "@/components/providers/WorkspaceProvider"
import { canAccessPlan } from "@/lib/entitlements"
import { LockedFeature } from "@/components/LockedFeature"

type ApprovalRow = {
  id: string
  post_id: string | null
  reviewer_email: string
  post_title: string
  post_content: string
  status: "pending" | "approved" | "rejected"
  message: string | null
  comment: string | null
  created_at: string
  updated_at: string
}

type StatusMsg = { text: string; type: "info" | "error" | "success" }

const STATUS_META: Record<string, { label: string; badge: string }> = {
  pending: { label: "Awaiting review", badge: "bg-amber-50 text-amber-700 border border-amber-200" },
  approved: { label: "Ready to publish", badge: "bg-emerald-50 text-emerald-700 border border-emerald-200" },
  rejected: { label: "Needs revision", badge: "bg-red-50 text-red-700 border border-red-200" },
}

const formatDate = (iso: string) => {
  try { return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) } catch { return "" }
}

export default function ApprovalsPage() {
  const { billing } = useWorkspace()
  const canUse = canAccessPlan(billing.plan, "Pro")

  const [approvals, setApprovals] = useState<ApprovalRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [sendModalOpen, setSendModalOpen] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [status, setStatus] = useState<StatusMsg | null>(null)

  const showStatus = useCallback((text: string, type: StatusMsg["type"]) => {
    setStatus({ text, type })
    if (type !== "error") setTimeout(() => setStatus(null), 4000)
  }, [])

  const fetchApprovals = useCallback(async () => {
    if (!canUse) { setIsLoading(false); return }
    setIsLoading(true)
    try {
      const res = await fetch("/api/approvals")
      const data = await res.json() as { approvals?: ApprovalRow[] }
      setApprovals(data.approvals || [])
    } catch { /* silent */ }
    finally { setIsLoading(false) }
  }, [canUse])

  useEffect(() => { void fetchApprovals() }, [fetchApprovals])

  const pending = approvals.filter((a) => a.status === "pending")
  const resolved = approvals.filter((a) => a.status !== "pending")

  return (
    <LockedFeature requiredPlan="Pro" feature="Approval workflow">
      <div className="mx-auto max-w-[900px] px-4 py-8 lg:px-6">

        {/* Header */}
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-zinc-400">Approval Workflow</p>
            <h1 className="mt-1 text-2xl font-bold text-zinc-900">Approvals</h1>
            <p className="mt-1 text-sm text-zinc-500">
              Send drafts to reviewers and track status in one place.
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => void fetchApprovals()}
              className="cursor-pointer rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-600 transition-colors hover:bg-zinc-50"
            >
              Refresh
            </button>
            <button
              onClick={() => setSendModalOpen(true)}
              className="cursor-pointer rounded-xl bg-teal px-4 py-2 text-xs font-bold text-white shadow-sm transition-colors hover:bg-teal-600"
            >
              Send for approval
            </button>
          </div>
        </div>

        {status && (
          <div className={`mb-5 rounded-xl px-4 py-3 text-sm font-medium ${status.type === "error" ? "bg-red-50 text-red-700 border border-red-200" : "bg-emerald-50 text-emerald-700 border border-emerald-200"}`}>
            {status.text}
          </div>
        )}

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-20 animate-pulse rounded-2xl bg-zinc-100" />)}
          </div>
        ) : approvals.length === 0 ? (
          <div className="rounded-2xl border border-zinc-200 bg-white px-6 py-16 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-100">
              <svg className="h-7 w-7 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="font-semibold text-zinc-900">No approval requests yet</p>
            <p className="mt-1 text-sm text-zinc-500">Send a draft for review and it will appear here.</p>
            <button
              onClick={() => setSendModalOpen(true)}
              className="mt-5 cursor-pointer rounded-xl bg-teal px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-teal-600"
            >
              Send first approval
            </button>
          </div>
        ) : (
          <div className="space-y-8">

            {/* Pending */}
            {pending.length > 0 && (
              <section>
                <h2 className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 text-[9px] font-bold text-amber-700">{pending.length}</span>
                  Awaiting review
                </h2>
                <div className="space-y-3">
                  {pending.map((row) => (
                    <ApprovalCard
                      key={row.id}
                      row={row}
                      expanded={expandedId === row.id}
                      onToggle={() => setExpandedId(expandedId === row.id ? null : row.id)}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Resolved */}
            {resolved.length > 0 && (
              <section>
                <h2 className="mb-3 text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                  Resolved ({resolved.length})
                </h2>
                <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white divide-y divide-zinc-100">
                  {resolved.map((row) => (
                    <ApprovalCard
                      key={row.id}
                      row={row}
                      expanded={expandedId === row.id}
                      onToggle={() => setExpandedId(expandedId === row.id ? null : row.id)}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

        {sendModalOpen && (
          <SendApprovalModal
            onClose={() => setSendModalOpen(false)}
            onSent={(row) => {
              setApprovals((prev) => [row, ...prev])
              showStatus(`Approval request sent to ${row.reviewer_email}`, "success")
            }}
            onError={(msg) => showStatus(msg, "error")}
          />
        )}
      </div>
    </LockedFeature>
  )
}

function ApprovalCard({ row, expanded, onToggle }: {
  row: ApprovalRow
  expanded: boolean
  onToggle: () => void
}) {
  const meta = STATUS_META[row.status] ?? STATUS_META.pending

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
      <button
        onClick={onToggle}
        className="w-full cursor-pointer px-5 py-4 text-left transition-colors hover:bg-zinc-50/60"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${meta.badge}`}>
                {meta.label}
              </span>
              <span className="text-xs text-zinc-400">{row.reviewer_email}</span>
            </div>
            <p className="mt-1 truncate text-sm font-semibold text-zinc-900">{row.post_title}</p>
            <p className="mt-0.5 text-[10px] text-zinc-400">{formatDate(row.created_at)}</p>
          </div>
          <svg
            className={`h-4 w-4 shrink-0 text-zinc-400 transition-transform ${expanded ? "rotate-180" : ""}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-zinc-100 px-5 py-4 space-y-3">
          <div>
            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-zinc-400">Post content</p>
            <div className="max-h-40 overflow-y-auto rounded-xl border border-zinc-100 bg-zinc-50 px-4 py-3 text-sm leading-relaxed text-zinc-700 whitespace-pre-wrap">
              {row.post_content}
            </div>
          </div>
          {row.message && (
            <div>
              <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-zinc-400">Your message</p>
              <p className="text-sm text-zinc-600 italic">&ldquo;{row.message}&rdquo;</p>
            </div>
          )}
          {row.comment && (
            <div className={`rounded-xl px-4 py-3 ${row.status === "rejected" ? "border border-red-200 bg-red-50" : "border border-emerald-200 bg-emerald-50"}`}>
              <p className={`mb-1 text-[10px] font-bold uppercase tracking-wide ${row.status === "rejected" ? "text-red-500" : "text-emerald-600"}`}>
                Reviewer comment
              </p>
              <p className={`text-sm ${row.status === "rejected" ? "text-red-700" : "text-emerald-700"}`}>
                &ldquo;{row.comment}&rdquo;
              </p>
            </div>
          )}
          <a
            href={`/approvals/${row.id}/review`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block text-[10px] font-semibold text-teal underline underline-offset-2 hover:text-teal-700"
          >
            Open review link &rarr;
          </a>
        </div>
      )}
    </div>
  )
}

function SendApprovalModal({ onClose, onSent, onError }: {
  onClose: () => void
  onSent: (row: ApprovalRow) => void
  onError: (msg: string) => void
}) {
  const [reviewerEmail, setReviewerEmail] = useState("")
  const [postTitle, setPostTitle] = useState("")
  const [postContent, setPostContent] = useState("")
  const [message, setMessage] = useState("")
  const [isSending, setIsSending] = useState(false)

  const onSubmit = async () => {
    if (!reviewerEmail.trim() || !postContent.trim()) {
      onError("Reviewer email and post content are required.")
      return
    }
    setIsSending(true)
    try {
      const res = await fetch("/api/approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reviewerEmail: reviewerEmail.trim(),
          postTitle: postTitle.trim() || "Untitled post",
          postContent: postContent.trim(),
          message: message.trim(),
        }),
      })
      const data = await res.json() as { approval?: ApprovalRow; error?: string }
      if (!res.ok) throw new Error(data.error || "Failed to send")
      onSent(data.approval!)
      onClose()
    } catch (e) {
      onError((e as Error).message)
      setIsSending(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/40 px-4">
      <div className="w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl">
        <h2 className="text-base font-bold text-zinc-900">Send for approval</h2>
        <p className="mt-1 text-sm text-zinc-500">The reviewer will get an email with a link to review and approve or reject.</p>

        <div className="mt-5 space-y-4">
          <div>
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-zinc-400">
              Reviewer email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={reviewerEmail}
              onChange={(e) => setReviewerEmail(e.target.value)}
              placeholder="reviewer@company.com"
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-4 py-2.5 text-sm text-zinc-900 outline-none transition-all focus:border-teal focus:bg-white focus:ring-4 focus:ring-teal/10"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-zinc-400">
              Post title <span className="font-normal normal-case text-zinc-400">(optional)</span>
            </label>
            <input
              value={postTitle}
              onChange={(e) => setPostTitle(e.target.value)}
              placeholder="e.g. Thought leadership piece on AI"
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-4 py-2.5 text-sm text-zinc-900 outline-none transition-all focus:border-teal focus:bg-white focus:ring-4 focus:ring-teal/10"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-zinc-400">
              Post content <span className="text-red-500">*</span>
            </label>
            <textarea
              value={postContent}
              onChange={(e) => setPostContent(e.target.value)}
              rows={6}
              placeholder="Paste your draft post here..."
              className="w-full resize-none rounded-xl border border-zinc-200 bg-zinc-50/50 px-4 py-3 text-sm leading-relaxed text-zinc-900 outline-none transition-all focus:border-teal focus:bg-white focus:ring-4 focus:ring-teal/10"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-zinc-400">
              Message to reviewer <span className="font-normal normal-case text-zinc-400">(optional)</span>
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={2}
              placeholder="e.g. Please check tone and factual accuracy before we publish."
              className="w-full resize-none rounded-xl border border-zinc-200 bg-zinc-50/50 px-4 py-3 text-sm leading-relaxed text-zinc-900 outline-none transition-all focus:border-teal focus:bg-white focus:ring-4 focus:ring-teal/10"
            />
          </div>
        </div>

        <div className="mt-6 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 cursor-pointer rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
          >
            Cancel
          </button>
          <button
            onClick={() => void onSubmit()}
            disabled={isSending || !reviewerEmail.trim() || !postContent.trim()}
            className="flex-1 cursor-pointer rounded-xl bg-teal px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-teal-600 disabled:opacity-50"
          >
            {isSending ? "Sending..." : "Send for review"}
          </button>
        </div>
      </div>
    </div>
  )
}
