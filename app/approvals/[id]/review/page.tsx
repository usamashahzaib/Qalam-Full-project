"use client"

import { useEffect, useState } from "react"
import { useParams, useSearchParams } from "next/navigation"
import { QalamLogo } from "@/components/QalamLogo"

type ApprovalData = {
  id: string
  post_title: string
  post_content: string
  status: "pending" | "approved" | "rejected"
  message: string | null
  comment: string | null
  created_at: string
}

type Stage = "loading" | "error" | "review" | "done"

export default function ReviewPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const id = String(params.id)
  const token = searchParams.get("token") || ""

  const [approval, setApproval] = useState<ApprovalData | null>(null)
  const [stage, setStage] = useState<Stage>("loading")
  const [errorMsg, setErrorMsg] = useState("")
  const [comment, setComment] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [decision, setDecision] = useState<"approved" | "rejected" | null>(null)

  useEffect(() => {
    fetch(`/api/approvals/${id}/review?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((data: { approval?: ApprovalData; error?: string }) => {
        if (!data.approval) { setErrorMsg(data.error || "Not found"); setStage("error"); return }
        setApproval(data.approval)
        if (data.approval.status !== "pending") {
          setDecision(data.approval.status as "approved" | "rejected")
          setStage("done")
        } else {
          setStage("review")
        }
      })
      .catch(() => { setErrorMsg("Failed to load review request."); setStage("error") })
  }, [id, token])

  const handleDecision = async (action: "approve" | "reject") => {
    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/approvals/${id}/${action}?token=${encodeURIComponent(token)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment: comment.trim() }),
      })
      const data = await res.json() as { status?: string; error?: string }
      if (!res.ok) throw new Error(data.error || "Failed to submit review")
      setDecision(action === "approve" ? "approved" : "rejected")
      setStage("done")
    } catch (e) {
      setErrorMsg((e as Error).message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 font-jakarta">
      <header className="border-b border-zinc-200 bg-white px-6 py-4">
        <QalamLogo href="/" size={24} textClassName="text-base font-extrabold text-zinc-900" containerClassName="flex min-h-11 items-center gap-2" />
      </header>

      <main className="mx-auto max-w-2xl px-4 py-12">

        {stage === "loading" && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => <div key={i} className="h-20 animate-pulse rounded-2xl bg-zinc-200" />)}
          </div>
        )}

        {stage === "error" && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-8 text-center">
            <p className="text-base font-semibold text-red-800">Review request not found</p>
            <p className="mt-2 text-sm text-red-600">{errorMsg}</p>
          </div>
        )}

        {(stage === "review" || stage === "done") && approval && (
          <div className="space-y-6">

            {/* Header */}
            <div>
              <p className="t-eyebrow text-zinc-400">Review Request</p>
              <h1 className="mt-1 text-2xl font-bold text-zinc-900">{approval.post_title}</h1>
              <p className="mt-1 text-sm text-zinc-500">
                Submitted {new Date(approval.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
              </p>
            </div>

            {/* Message from requester */}
            {approval.message && (
              <div className="rounded-2xl border border-zinc-200 bg-white px-5 py-4">
                <p className="mb-1.5 t-eyebrow text-zinc-400">Note from requester</p>
                <p className="text-sm leading-relaxed text-zinc-700 italic">&ldquo;{approval.message}&rdquo;</p>
              </div>
            )}

            {/* Post content */}
            <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
              <div className="border-b border-zinc-100 bg-zinc-50/60 px-5 py-3.5">
                <h2 className="text-sm font-bold text-zinc-900">Post content</h2>
                <p className="mt-0.5 text-xs text-zinc-400">Read-only preview</p>
              </div>
              <div className="px-5 py-5 text-base leading-[1.8] text-zinc-900 whitespace-pre-wrap">
                {approval.post_content}
              </div>
            </div>

            {/* Review form or done state */}
            {stage === "review" ? (
              <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
                <div className="border-b border-zinc-100 bg-zinc-50/60 px-5 py-3.5">
                  <h2 className="text-sm font-bold text-zinc-900">Your review</h2>
                </div>
                <div className="p-5 space-y-4">
                  <div>
                    <label className="mb-1.5 block t-eyebrowst text-zinc-400">
                      Comment <span className="font-normal normal-case text-zinc-400">(optional)</span>
                    </label>
                    <textarea
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      rows={3}
                      placeholder="Leave a note for the author..."
                      className="w-full resize-none rounded-xl border border-zinc-200 bg-zinc-50/50 px-4 py-3 text-sm leading-relaxed text-zinc-900 outline-none transition-all focus:border-teal focus:bg-white focus:ring-4 focus:ring-teal/10"
                    />
                  </div>

                  {errorMsg && (
                    <p className="text-sm font-medium text-red-600">{errorMsg}</p>
                  )}

                  <div className="flex gap-3">
                    <button
                      onClick={() => void handleDecision("reject")}
                      disabled={isSubmitting}
                      className="flex-1 cursor-pointer rounded-xl border border-red-200 bg-red-50 py-3 text-sm font-bold text-red-700 transition-colors hover:bg-red-100 disabled:opacity-50"
                    >
                      {isSubmitting ? "..." : "Request changes"}
                    </button>
                    <button
                      onClick={() => void handleDecision("approve")}
                      disabled={isSubmitting}
                      className="flex-1 cursor-pointer rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {isSubmitting ? "Submitting..." : "Approve"}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className={`rounded-2xl border px-6 py-6 text-center ${decision === "approved" ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50"}`}>
                <div className={`mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full ${decision === "approved" ? "bg-emerald-100" : "bg-red-100"}`}>
                  {decision === "approved" ? (
                    <svg className="h-6 w-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                </div>
                <p className={`text-base font-bold ${decision === "approved" ? "text-emerald-800" : "text-red-800"}`}>
                  {decision === "approved" ? "Approved" : "Changes requested"}
                </p>
                <p className={`mt-1 text-sm ${decision === "approved" ? "text-emerald-600" : "text-red-600"}`}>
                  {decision === "approved"
                    ? "The author has been notified that this post is ready to publish."
                    : "The author has been notified and will revise the post."}
                </p>
                {approval.comment && (
                  <p className={`mt-3 text-sm italic ${decision === "approved" ? "text-emerald-700" : "text-red-700"}`}>
                    Your note: &ldquo;{approval.comment}&rdquo;
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
