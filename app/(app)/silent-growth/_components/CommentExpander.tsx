"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { CopyButton } from "./CopyButton"

const MIN_LENGTH = 5
const MAX_LENGTH = 1000

export function CommentExpander() {
  const [comment, setComment] = useState("")
  const [post, setPost] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleExpand = async () => {
    const trimmed = comment.trim()
    if (trimmed.length < MIN_LENGTH) {
      setError(`Paste at least ${MIN_LENGTH} characters.`)
      return
    }
    setLoading(true)
    setError(null)
    setPost("")
    try {
      const res = await fetch("/api/silent-growth/expand-comment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment: trimmed }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.message || data.error || "Failed to expand. Please try again.")
        return
      }
      setPost(data.post)
    } catch {
      setError("Network error. Please check your connection and try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
      <div className="border-b border-zinc-100 p-6">
        <label className="mb-2 block text-sm font-semibold text-zinc-800">Paste a comment idea</label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value.slice(0, MAX_LENGTH))}
          placeholder="A comment you'd leave, or a rough thought..."
          rows={4}
          className="w-full resize-y rounded-xl border border-zinc-200 px-4 py-3 text-sm text-zinc-800 placeholder-zinc-400 transition-all focus:border-teal/50 focus:outline-none focus:ring-2 focus:ring-teal/30"
          disabled={loading}
        />
        <div className="mt-1 flex justify-end">
          <span className="text-xs text-zinc-400">{comment.length}/{MAX_LENGTH}</span>
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => void handleExpand()}
          disabled={comment.trim().length < MIN_LENGTH || loading}
          className={`mt-4 w-full rounded-xl px-6 py-3 text-sm font-semibold transition-all ${
            comment.trim().length >= MIN_LENGTH && !loading
              ? "bg-teal text-white shadow-sm hover:bg-teal-600"
              : "cursor-not-allowed bg-zinc-200 text-zinc-400"
          }`}
        >
          {loading ? "Expanding..." : "Expand to Full Post"}
        </motion.button>
      </div>

      {error && (
        <div className="border-b border-red-100 bg-red-50 px-6 py-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {post && (
        <div className="px-6 py-5">
          <div className="mb-3 flex items-center justify-between">
            <p className="t-eyebrow text-zinc-400">Draft Post</p>
            <CopyButton text={post} />
          </div>
          <p className="whitespace-pre-wrap rounded-xl border border-zinc-100 bg-zinc-50/50 p-3 text-sm leading-relaxed text-zinc-700">
            {post}
          </p>
        </div>
      )}
    </section>
  )
}
