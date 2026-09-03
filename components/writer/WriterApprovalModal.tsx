"use client"

import { useState } from "react"
import { useWorkspace } from "@/components/providers/WorkspaceProvider"

type WriterApprovalModalProps = {
  draftContent: string
  draftTitle: string
  postId: string | null
  onClose: () => void
  onSent: () => void
  onError: (message: string) => void
}

export function WriterApprovalModal({
  draftContent,
  draftTitle,
  postId,
  onClose,
  onSent,
  onError,
}: WriterApprovalModalProps) {
  const { workspaceId } = useWorkspace()
  const [reviewerEmail, setReviewerEmail] = useState("")
  const [message, setMessage] = useState("")
  const [isSending, setIsSending] = useState(false)

  const onSubmit = async () => {
    if (!reviewerEmail.trim()) return
    setIsSending(true)
    try {
      const response = await fetch("/api/approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reviewerEmail: reviewerEmail.trim(),
          postTitle: draftTitle,
          postContent: draftContent,
          message: message.trim(),
          postId,
          workspaceKey: workspaceId,
        }),
      })
      const data = await response.json() as { error?: string }
      if (!response.ok) throw new Error(data.error || "Failed to send")
      onSent()
    } catch (error) {
      onError((error as Error).message)
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/40 px-4">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-5 shadow-xl">
        <h2 className="text-base font-bold text-zinc-900">Send for approval</h2>
        <p className="mt-1 text-sm text-zinc-500">Share this draft with a colleague, manager, or client before it goes live. They receive a private review link and do not need a Qalam account.</p>
        <div className="mt-4 space-y-3">
          <div>
            <label className="mb-1.5 block t-eyebrowst text-zinc-400">
              Reviewer email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={reviewerEmail}
              onChange={(event) => setReviewerEmail(event.target.value)}
              placeholder="reviewer@company.com"
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-4 py-2.5 text-sm text-zinc-900 outline-none transition-all focus:border-teal focus:bg-white focus:ring-4 focus:ring-teal/10"
            />
          </div>
          <div>
            <label className="mb-1.5 block t-eyebrowst text-zinc-400">
              Message <span className="font-normal normal-case text-zinc-400">(optional)</span>
            </label>
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              rows={2}
              placeholder="Please check tone and facts before we publish."
              className="w-full resize-none rounded-xl border border-zinc-200 bg-zinc-50/50 px-4 py-2.5 text-sm text-zinc-900 outline-none transition-all focus:border-teal focus:bg-white focus:ring-4 focus:ring-teal/10"
            />
          </div>
          <div className="rounded-xl border border-zinc-100 bg-zinc-50 px-4 py-3">
            <p className="t-eyebrow text-zinc-400">Post being sent</p>
            <p className="mt-1 line-clamp-2 text-xs text-zinc-700">{draftTitle}</p>
          </div>
        </div>
        <div className="mt-5 flex gap-2">
          <button onClick={onClose} className="flex-1 cursor-pointer rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50">
            Cancel
          </button>
          <button
            onClick={() => void onSubmit()}
            disabled={isSending || !reviewerEmail.trim()}
            className="flex-1 cursor-pointer rounded-xl bg-teal px-4 py-2.5 text-sm font-bold text-white hover:bg-teal-600 disabled:opacity-50"
          >
            {isSending ? "Sending..." : "Send for review"}
          </button>
        </div>
      </div>
    </div>
  )
}
