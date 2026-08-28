"use client"

import { useState } from "react"
import { motion } from "framer-motion"

const MIN_LENGTH = 10
const MAX_LENGTH = 5000

type FilterResult = { attracts: string[]; repels: string[] }

export function PrePostFilter() {
  const [draft, setDraft] = useState("")
  const [result, setResult] = useState<FilterResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCheck = async () => {
    const trimmed = draft.trim()
    if (trimmed.length < MIN_LENGTH) {
      setError(`Paste at least ${MIN_LENGTH} characters of your draft.`)
      return
    }
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch("/api/silent-growth/filter-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draft: trimmed }),
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
        <label className="mb-2 block text-sm font-semibold text-zinc-800">Paste your draft post</label>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value.slice(0, MAX_LENGTH))}
          placeholder="Paste the draft you're about to post..."
          rows={8}
          className="w-full resize-y rounded-xl border border-zinc-200 px-4 py-3 text-sm text-zinc-800 placeholder-zinc-400 transition-all focus:border-teal/50 focus:outline-none focus:ring-2 focus:ring-teal/30"
          disabled={loading}
        />
        <div className="mt-1 flex justify-end">
          <span className="text-xs text-zinc-400">{draft.length}/{MAX_LENGTH}</span>
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => void handleCheck()}
          disabled={draft.trim().length < MIN_LENGTH || loading}
          className={`mt-4 w-full rounded-xl px-6 py-3 text-sm font-semibold transition-all ${
            draft.trim().length >= MIN_LENGTH && !loading
              ? "bg-teal text-white shadow-sm hover:bg-teal-600"
              : "cursor-not-allowed bg-zinc-200 text-zinc-400"
          }`}
        >
          {loading ? "Checking..." : "Run Pre-Post Filter"}
        </motion.button>
      </div>

      {error && (
        <div className="border-b border-red-100 bg-red-50 px-6 py-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {result && (
        <div className="grid grid-cols-1 divide-y divide-zinc-50 sm:grid-cols-2 sm:divide-x sm:divide-y-0">
          <div className="px-6 py-5">
            <p className="mb-3 flex items-center gap-1.5 t-eyebrow text-emerald-600">
              Attracts
            </p>
            <ul className="space-y-2">
              {result.attracts.map((a, i) => (
                <li key={i} className="rounded-xl border border-emerald-100 bg-emerald-50/50 px-3 py-2 text-sm text-emerald-800">
                  {a}
                </li>
              ))}
            </ul>
          </div>
          <div className="px-6 py-5">
            <p className="mb-3 flex items-center gap-1.5 t-eyebrow text-red-500">
              Repels
            </p>
            <ul className="space-y-2">
              {result.repels.map((r, i) => (
                <li key={i} className="rounded-xl border border-red-100 bg-red-50/50 px-3 py-2 text-sm text-red-800">
                  {r}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </section>
  )
}
