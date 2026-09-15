"use client"

import { useEffect, useRef, useState } from "react"
import { useParams, useSearchParams } from "next/navigation"
import { QalamLogo } from "@/components/QalamLogo"

type InlineComment = { quote: string; note: string }

type ApprovalData = {
  id: string
  post_title: string
  post_content: string
  status: "pending" | "approved" | "rejected"
  message: string | null
  comment: string | null
  created_at: string
  auto_approve_at: string | null
  inline_comments: InlineComment[]
}

type Stage = "loading" | "error" | "review" | "done"

const MAX_QUOTE = 500

const untilText = (iso: string) => {
  const diff = Date.parse(iso) - Date.now()
  if (diff <= 0) return "shortly"
  const hours = Math.floor(diff / 3_600_000)
  if (hours >= 48) return `in ${Math.round(hours / 24)} days`
  if (hours >= 1) return `in ${hours} hour${hours === 1 ? "" : "s"}`
  return `in ${Math.max(1, Math.round(diff / 60_000))} minutes`
}

export default function ReviewPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const id = String(params.id)
  const token = searchParams.get("token") || ""

  const [approval, setApproval] = useState<ApprovalData | null>(null)
  const [stage, setStage] = useState<Stage>("loading")
  const [errorMsg, setErrorMsg] = useState("")
  const [comment, setComment] = useState("")
  const [inlineComments, setInlineComments] = useState<InlineComment[]>([])
  const [selection, setSelection] = useState("")
  const [selectionNote, setSelectionNote] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [decision, setDecision] = useState<"approved" | "rejected" | null>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const noteRef = useRef<HTMLInputElement>(null)

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

  useEffect(() => {
    if (stage !== "review") return
    const onSelectionChange = () => {
      const current = window.getSelection()
      const root = contentRef.current
      if (!current || current.isCollapsed || !root || !current.anchorNode || !root.contains(current.anchorNode) || !root.contains(current.focusNode)) return
      const text = current.toString().replace(/\s+/g, " ").trim()
      if (text.length >= 2) setSelection(text.slice(0, MAX_QUOTE))
    }
    document.addEventListener("selectionchange", onSelectionChange)
    return () => document.removeEventListener("selectionchange", onSelectionChange)
  }, [stage])

  const addInlineComment = () => {
    const note = selectionNote.trim()
    if (!selection || !note) return
    setInlineComments((current) => [...current, { quote: selection, note }].slice(0, 20))
    setSelection("")
    setSelectionNote("")
    window.getSelection()?.removeAllRanges()
  }

  const handleDecision = async (action: "approve" | "reject") => {
    setIsSubmitting(true)
    setErrorMsg("")
    try {
      const res = await fetch(`/api/approvals/${id}/${action}?token=${encodeURIComponent(token)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment: comment.trim(), inlineComments }),
      })
      const data = await res.json() as { status?: string; error?: string }
      if (!res.ok) throw new Error(data.error || "Failed to submit review")
      setDecision(action === "approve" ? "approved" : "rejected")
      setApproval((current) => current ? { ...current, comment: comment.trim() || null, inline_comments: inlineComments } : current)
      setStage("done")
    } catch (e) {
      setErrorMsg((e as Error).message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 pb-28 font-jakarta sm:pb-0">
      <header className="border-b border-zinc-200 bg-white px-4 py-3 sm:px-6">
        <QalamLogo href="/" size={24} textClassName="text-base font-extrabold text-zinc-900" containerClassName="flex min-h-11 items-center gap-2" />
      </header>

      <main className="mx-auto max-w-2xl px-4 py-8 sm:py-12">
        {stage === "loading" && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => <div key={i} className="h-20 animate-pulse rounded-2xl bg-zinc-200" />)}
          </div>
        )}

        {stage === "error" && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-8 text-center">
            <p className="text-base font-semibold text-red-800">Review request not found</p>
            <p className="mt-2 text-sm text-red-600">This link may have been used already, replaced by a newer email, or expired.</p>
          </div>
        )}

        {(stage === "review" || stage === "done") && approval && (
          <div className="space-y-6">
            <div>
              <p className="t-eyebrow text-zinc-400">Review request</p>
              <h1 className="mt-1 text-2xl font-bold text-zinc-900">{approval.post_title}</h1>
              <p className="mt-1 text-sm text-zinc-500">
                Submitted {new Date(approval.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
              </p>
            </div>

            {stage === "review" && approval.auto_approve_at ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-3 text-sm text-amber-900" role="note">
                As agreed with your team, this draft will be treated as approved {untilText(approval.auto_approve_at)} if there is no reply. Approve, comment, or request changes any time before then.
              </div>
            ) : null}

            {approval.message && (
              <div className="rounded-2xl border border-zinc-200 bg-white px-5 py-4">
                <p className="mb-1.5 t-eyebrow text-zinc-400">Note from your team</p>
                <p className="text-sm italic leading-relaxed text-zinc-700">&ldquo;{approval.message}&rdquo;</p>
              </div>
            )}

            <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
              <div className="border-b border-zinc-100 bg-zinc-50/60 px-5 py-3.5">
                <h2 className="text-sm font-bold text-zinc-900">Post</h2>
                <p className="mt-0.5 text-xs text-zinc-500">{stage === "review" ? "Select any words to comment on that exact line." : "Read-only"}</p>
              </div>
              <div ref={contentRef} className="select-text whitespace-pre-wrap px-5 py-5 text-base leading-[1.8] text-zinc-900 selection:bg-amber-200">
                {approval.post_content}
              </div>
              {stage === "review" && selection ? (
                <div className="border-t border-amber-200 bg-amber-50 px-5 py-4">
                  <p className="text-xs font-semibold text-amber-900">Comment on:</p>
                  <p className="mt-1 line-clamp-3 text-sm italic text-zinc-800">&ldquo;{selection}&rdquo;</p>
                  <form className="mt-3 flex flex-col gap-2 sm:flex-row" onSubmit={(event) => { event.preventDefault(); addInlineComment() }}>
                    <input
                      ref={noteRef}
                      value={selectionNote}
                      onChange={(event) => setSelectionNote(event.target.value)}
                      maxLength={500}
                      placeholder="What should change here?"
                      aria-label="Comment on the selected text"
                      className="min-h-11 flex-1 rounded-xl border border-amber-300 bg-white px-3 text-sm outline-none focus:ring-4 focus:ring-amber-200"
                    />
                    <div className="flex gap-2">
                      <button type="submit" disabled={!selectionNote.trim()} className="min-h-11 flex-1 rounded-xl bg-zinc-900 px-4 text-sm font-bold text-white disabled:opacity-40">Add comment</button>
                      <button type="button" onClick={() => { setSelection(""); setSelectionNote("") }} className="min-h-11 rounded-xl border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-600">Cancel</button>
                    </div>
                  </form>
                </div>
              ) : null}
            </div>

            {(stage === "review" ? inlineComments : approval.inline_comments).length ? (
              <div className="rounded-2xl border border-zinc-200 bg-white p-5">
                <h2 className="text-sm font-bold text-zinc-900">Line comments</h2>
                <ul className="mt-3 space-y-3">
                  {(stage === "review" ? inlineComments : approval.inline_comments).map((item, index) => (
                    <li key={`${item.quote}-${index}`} className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <mark className="rounded bg-amber-100 px-1 text-sm text-zinc-800">{item.quote}</mark>
                        <p className="mt-1 text-sm text-zinc-700">{item.note}</p>
                      </div>
                      {stage === "review" ? (
                        <button onClick={() => setInlineComments((current) => current.filter((_, i) => i !== index))} className="shrink-0 text-xs font-semibold text-zinc-400 hover:text-red-600" aria-label="Remove comment">Remove</button>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {stage === "review" ? (
              <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
                <div className="border-b border-zinc-100 bg-zinc-50/60 px-5 py-3.5">
                  <h2 className="text-sm font-bold text-zinc-900">Your review</h2>
                </div>
                <div className="space-y-4 p-5">
                  <div>
                    <label htmlFor="review-comment" className="mb-1.5 block text-xs font-semibold text-zinc-500">
                      Overall note <span className="font-normal text-zinc-400">(optional)</span>
                    </label>
                    <textarea
                      id="review-comment"
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      rows={3}
                      maxLength={2000}
                      placeholder="Anything else your team should know..."
                      className="w-full resize-none rounded-xl border border-zinc-200 bg-zinc-50/50 px-4 py-3 text-sm leading-relaxed text-zinc-900 outline-none transition-all focus:border-teal focus:bg-white focus:ring-4 focus:ring-teal/10"
                    />
                  </div>

                  {errorMsg && <p className="text-sm font-medium text-red-600" role="alert">{errorMsg}</p>}

                  <div className="fixed inset-x-0 bottom-0 z-20 flex gap-3 border-t border-zinc-200 bg-white p-3 sm:static sm:border-0 sm:p-0">
                    <button
                      onClick={() => void handleDecision("reject")}
                      disabled={isSubmitting}
                      className="min-h-12 flex-1 cursor-pointer rounded-xl border border-red-200 bg-red-50 text-sm font-bold text-red-700 transition-colors hover:bg-red-100 disabled:opacity-50"
                    >
                      {isSubmitting ? "..." : "Request changes"}
                    </button>
                    <button
                      onClick={() => void handleDecision("approve")}
                      disabled={isSubmitting}
                      className="min-h-12 flex-1 cursor-pointer rounded-xl bg-emerald-600 text-sm font-bold text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {isSubmitting ? "Submitting..." : inlineComments.length ? "Approve with comments" : "Approve"}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className={`rounded-2xl border px-6 py-6 text-center ${decision === "approved" ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50"}`}>
                <p className={`text-base font-bold ${decision === "approved" ? "text-emerald-800" : "text-red-800"}`}>
                  {decision === "approved" ? "Approved" : "Changes requested"}
                </p>
                <p className={`mt-1 text-sm ${decision === "approved" ? "text-emerald-700" : "text-red-700"}`}>
                  {decision === "approved"
                    ? "Your team has been notified that this post is ready to publish."
                    : "Your team has been notified and will revise the post."}
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
