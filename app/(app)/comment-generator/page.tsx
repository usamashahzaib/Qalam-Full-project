"use client"

import { useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { CommentIcon } from "@/components/ui/qalam-icons"

const PROFILES = ["Founder", "Engineer", "HR", "Marketing", "Sales", "Consultant", "Tech", "Other"] as const

const STYLE_LABELS: Record<string, string> = {
  insightful: "Insightful",
  supportive: "Supportive",
  engaging: "Engaging",
}

const MAX_POST_LENGTH = 5000

type Comment = { style: string; text: string }

export default function CommentGeneratorPage() {
  const [postText, setPostText] = useState("")
  const [profile, setProfile] = useState<(typeof PROFILES)[number]>("Founder")
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [upgradeRequired, setUpgradeRequired] = useState(false)
  const [copied, setCopied] = useState<number | null>(null)

  const handleGenerate = async () => {
    const trimmed = postText.trim()
    if (trimmed.length < 10) {
      setError("Paste at least 10 characters of the post you want to comment on.")
      return
    }
    setLoading(true)
    setError(null)
    setUpgradeRequired(false)
    setComments([])

    try {
      const res = await fetch("/api/comments/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postText: trimmed, profile }),
      })

      const data = await res.json()

      if (res.status === 403 && (data.error === "monthly_limit_reached" || data.error === "upgrade_required" || data.error === "plan_expired")) {
        setUpgradeRequired(true)
        setError(data.message || "You've reached your monthly comment generation limit.")
        return
      }

      if (!res.ok) {
        setError(data.message || data.error || "Failed to generate comments. Please try again.")
        return
      }

      if (!data.comments || data.comments.length === 0) {
        setError("No comments returned. Please try again.")
        return
      }

      setComments(data.comments)
    } catch {
      setError("Network error. Please check your connection and try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      const ta = document.createElement("textarea")
      ta.value = text
      ta.style.position = "fixed"
      ta.style.opacity = "0"
      document.body.appendChild(ta)
      ta.select()
      document.execCommand("copy")
      document.body.removeChild(ta)
    }
    setCopied(index)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="mx-auto max-w-[760px] px-4 py-8 lg:px-6">
      {/* Header */}
      <div className="mb-8 flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal">
          <CommentIcon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-zinc-400">Engagement</p>
          <h1 className="mt-1 text-2xl font-bold text-zinc-900">Comment Generator</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Paste a post you want to comment on, pick your professional angle, and get 3 tailored comment styles ready to post.
          </p>
        </div>
      </div>

      <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-100 p-6">
          <label className="mb-2 block text-sm font-semibold text-zinc-800">Post you want to comment on</label>
          <textarea
            value={postText}
            onChange={(e) => setPostText(e.target.value.slice(0, MAX_POST_LENGTH))}
            placeholder="Paste the LinkedIn post text here..."
            rows={6}
            className="w-full resize-y rounded-xl border border-zinc-200 px-4 py-3 text-sm text-zinc-800 placeholder-zinc-400 transition-all focus:border-teal/50 focus:outline-none focus:ring-2 focus:ring-teal/30"
            disabled={loading}
          />
          <div className="mt-1 flex justify-end">
            <span className="text-xs text-zinc-400">{postText.length}/{MAX_POST_LENGTH}</span>
          </div>

          <label className="mb-2 mt-4 block text-sm font-semibold text-zinc-800">Your profile</label>
          <select
            value={profile}
            onChange={(e) => setProfile(e.target.value as (typeof PROFILES)[number])}
            disabled={loading}
            className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-800 transition-all focus:border-teal/50 focus:outline-none focus:ring-2 focus:ring-teal/30"
          >
            {PROFILES.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleGenerate}
            disabled={postText.trim().length < 10 || loading}
            className={`mt-4 w-full rounded-xl px-6 py-3 text-sm font-semibold transition-all ${
              postText.trim().length >= 10 && !loading
                ? "bg-teal text-white shadow-sm hover:bg-teal-600"
                : "cursor-not-allowed bg-zinc-200 text-zinc-400"
            }`}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Generating...
              </span>
            ) : "Generate 3 Comments"}
          </motion.button>
        </div>

        {error && (
          <div className="border-b border-red-100 bg-red-50 px-6 py-4">
            <p className="text-sm text-red-700">{error}</p>
            {upgradeRequired && (
              <Link href="/pricing" className="mt-2 inline-block text-sm font-semibold text-teal hover:underline">
                {"Upgrade your plan ->"}
              </Link>
            )}
          </div>
        )}

        {comments.length > 0 && (
          <div className="divide-y divide-zinc-50">
            {comments.map((c, i) => (
              <div key={i} className="px-6 py-5">
                <div className="mb-2 flex items-center justify-between">
                  <span className="rounded-lg bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal">
                    {STYLE_LABELS[c.style] || c.style}
                  </span>
                  <button
                    onClick={() => void handleCopy(c.text, i)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
                      copied === i ? "bg-green-50 text-green-700" : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200"
                    }`}
                  >
                    {copied === i ? "Copied!" : "Copy"}
                  </button>
                </div>
                <p className="text-sm leading-relaxed text-zinc-700">{c.text}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
