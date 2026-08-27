"use client"

import { copyText } from "@/lib/hooks/useWriterLogic"

type Reply = { style: string; text: string }

interface WriterRepliesPanelProps {
  repliesOpen: boolean
  setRepliesOpen: (updater: boolean | ((prev: boolean) => boolean)) => void
  replyMode: "comment" | "reply"
  setReplyMode: (mode: "comment" | "reply") => void
  parentCommentInput: string
  setParentCommentInput: (value: string) => void
  commentInput: string
  setCommentInput: (value: string) => void
  isGeneratingReplies: boolean
  replies: Reply[]
  repliesError: string | null
  onGenerateReplies: () => void | Promise<void>
}

export function WriterRepliesPanel({
  repliesOpen, setRepliesOpen, replyMode, setReplyMode,
  parentCommentInput, setParentCommentInput,
  commentInput, setCommentInput,
  isGeneratingReplies, replies, repliesError, onGenerateReplies,
}: WriterRepliesPanelProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
      <button
        onClick={() => setRepliesOpen((v) => !v)}
        className="flex w-full cursor-pointer items-center justify-between px-4 py-3.5 text-left"
      >
        <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-500">Comment Replies</h2>
        <span className="text-xs text-zinc-400">{repliesOpen ? "Hide" : "Show"}</span>
      </button>
      {repliesOpen && (
        <div className="border-t border-zinc-100 p-4">
          <div className="mb-3 flex items-center gap-1 rounded-xl border border-zinc-200 bg-zinc-50/50 p-1">
            <button
              onClick={() => setReplyMode("comment")}
              className={`flex-1 cursor-pointer rounded-lg px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider transition-colors ${
                replyMode === "comment" ? "bg-white text-teal shadow-sm" : "text-zinc-400 hover:text-zinc-600"
              }`}
            >
              Reply to a comment
            </button>
            <button
              onClick={() => setReplyMode("reply")}
              className={`flex-1 cursor-pointer rounded-lg px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider transition-colors ${
                replyMode === "reply" ? "bg-white text-teal shadow-sm" : "text-zinc-400 hover:text-zinc-600"
              }`}
            >
              Reply to a reply
            </button>
          </div>
          {replyMode === "reply" && (
            <div className="mb-3">
              <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-widest text-zinc-400">Original comment (optional, for context)</label>
              <textarea
                value={parentCommentInput}
                onChange={(e) => setParentCommentInput(e.target.value)}
                rows={2}
                placeholder="Paste the original comment your reply was under..."
                className="w-full resize-none rounded-xl border border-zinc-200 bg-zinc-50/50 px-3 py-2.5 text-xs text-zinc-900 outline-none transition-all focus:border-teal focus:bg-white focus:ring-4 focus:ring-teal/10"
              />
            </div>
          )}
          <div className="mb-3">
            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-widest text-zinc-400">
              {replyMode === "reply" ? "Paste the reply you received" : "Paste a comment to reply to"}
            </label>
            <textarea
              value={commentInput}
              onChange={(e) => setCommentInput(e.target.value)}
              rows={3}
              placeholder={replyMode === "reply" ? "Paste the reply here..." : "Paste a comment here..."}
              className="w-full resize-none rounded-xl border border-zinc-200 bg-zinc-50/50 px-3 py-2.5 text-xs text-zinc-900 outline-none transition-all focus:border-teal focus:bg-white focus:ring-4 focus:ring-teal/10"
            />
          </div>
          <button
            onClick={() => void onGenerateReplies()}
            disabled={isGeneratingReplies || !commentInput.trim()}
            className="w-full cursor-pointer rounded-xl bg-teal px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-teal-600 disabled:opacity-50"
          >
            {isGeneratingReplies ? "Generating..." : "Generate 3 replies"}
          </button>
          {repliesError && (
            <p className="mt-2 text-xs text-red-600">{repliesError}</p>
          )}
          {replies.length > 0 && (
            <div className="mt-3 space-y-2">
              {replies.map((r, i) => (
                <div key={i} className="overflow-hidden rounded-xl border border-zinc-100 bg-zinc-50 p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="shrink-0 rounded-full border border-zinc-200 bg-white px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-zinc-500">{r.style}</span>
                    <button onClick={() => copyText(r.text)} className="cursor-pointer shrink-0 text-[11px] font-bold text-teal hover:text-teal-700">Copy</button>
                  </div>
                  <p className="w-full break-words text-xs leading-relaxed text-zinc-700">{r.text}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
