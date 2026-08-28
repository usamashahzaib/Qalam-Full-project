"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { CopyButton } from "./CopyButton"

const MIN_POSTS = 5
const MAX_POSTS = 10
const MAX_POST_LENGTH = 3000

type Dna = { hookPatterns: string[]; lengthProfile: string; tone: string; engagementTriggers: string[] }
type DnaResponse = { dna: Dna; comments: string[]; template: string }

function splitPosts(raw: string): string[] {
  return raw
    .split(/\n{2,}|\n-{3,}\n/)
    .map((p) => p.trim())
    .filter((p) => p.length >= 10)
}

export function DnaAnalyzer() {
  const [raw, setRaw] = useState("")
  const [result, setResult] = useState<DnaResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const posts = splitPosts(raw).slice(0, MAX_POSTS)

  const handleAnalyze = async () => {
    if (posts.length < MIN_POSTS) {
      setError(`Paste at least ${MIN_POSTS} posts, separated by a blank line between each.`)
      return
    }
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch("/api/silent-growth/analyze-dna", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ posts: posts.map((p) => p.slice(0, MAX_POST_LENGTH)) }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.message || data.error || "Failed to analyze. Please try again.")
        return
      }
      setResult(data)
    } catch {
      setError("Network error. Please check your connection and try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
      <div className="border-b border-zinc-100 p-6">
        <label className="mb-2 block text-sm font-semibold text-zinc-800">
          Paste 5-10 posts from a target profile
        </label>
        <p className="mb-2 text-xs text-zinc-500">Separate each post with a blank line.</p>
        <textarea
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          placeholder={"Post 1 text...\n\nPost 2 text...\n\nPost 3 text..."}
          rows={10}
          className="w-full resize-y rounded-xl border border-zinc-200 px-4 py-3 text-sm text-zinc-800 placeholder-zinc-400 transition-all focus:border-teal/50 focus:outline-none focus:ring-2 focus:ring-teal/30"
          disabled={loading}
        />
        <div className="mt-1 flex justify-end">
          <span className="text-xs text-zinc-400">{posts.length}/{MIN_POSTS}-{MAX_POSTS} posts detected</span>
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => void handleAnalyze()}
          disabled={posts.length < MIN_POSTS || loading}
          className={`mt-4 w-full rounded-xl px-6 py-3 text-sm font-semibold transition-all ${
            posts.length >= MIN_POSTS && !loading
              ? "bg-teal text-white shadow-sm hover:bg-teal-600"
              : "cursor-not-allowed bg-zinc-200 text-zinc-400"
          }`}
        >
          {loading ? "Analyzing..." : "Build Target DNA Profile"}
        </motion.button>
      </div>

      {error && (
        <div className="border-b border-red-100 bg-red-50 px-6 py-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {result && (
        <div className="divide-y divide-zinc-50">
          <div className="px-6 py-5">
            <p className="mb-3 t-eyebrow text-zinc-400">Target DNA Profile</p>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="font-semibold text-zinc-800">Hook patterns</dt>
                <dd className="mt-1 text-zinc-600">{result.dna.hookPatterns.join(" - ")}</dd>
              </div>
              <div>
                <dt className="font-semibold text-zinc-800">Length profile</dt>
                <dd className="mt-1 text-zinc-600">{result.dna.lengthProfile}</dd>
              </div>
              <div>
                <dt className="font-semibold text-zinc-800">Tone</dt>
                <dd className="mt-1 text-zinc-600">{result.dna.tone}</dd>
              </div>
              <div>
                <dt className="font-semibold text-zinc-800">Engagement triggers</dt>
                <dd className="mt-1 text-zinc-600">{result.dna.engagementTriggers.join(" - ")}</dd>
              </div>
            </dl>
          </div>

          <div className="px-6 py-5">
            <p className="mb-3 t-eyebrow text-zinc-400">3 Custom Comment Suggestions</p>
            <div className="space-y-3">
              {result.comments.map((c, i) => (
                <div key={i} className="flex items-start justify-between gap-3 rounded-xl border border-zinc-100 bg-zinc-50/50 p-3">
                  <p className="text-sm leading-relaxed text-zinc-700">{c}</p>
                  <CopyButton text={c} />
                </div>
              ))}
            </div>
          </div>

          <div className="px-6 py-5">
            <div className="mb-3 flex items-center justify-between">
              <p className="t-eyebrow text-zinc-400">Post Template</p>
              <CopyButton text={result.template} />
            </div>
            <p className="whitespace-pre-wrap rounded-xl border border-zinc-100 bg-zinc-50/50 p-3 text-sm leading-relaxed text-zinc-700">
              {result.template}
            </p>
          </div>
        </div>
      )}
    </section>
  )
}
