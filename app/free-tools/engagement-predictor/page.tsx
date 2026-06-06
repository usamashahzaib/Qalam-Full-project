"use client"

import { useState } from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { FadeUp } from "@/components/FadeUp"

type Result = {
  engagement_score: number
  reach_prediction: string
  confidence: string
  score_breakdown: Record<string, number>
  why_it_will_work: string[]
  risks: string[]
  recommended_edits: string[]
  stronger_opening: string
}

export default function EngagementPredictorPage() {
  const [text, setText] = useState("")
  const [result, setResult] = useState<Result | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const predict = async () => {
    if (!text.trim()) return
    setLoading(true)
    setError("")
    setResult(null)
    try {
      const res = await fetch("/api/free-tools/engagement-predictor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Prediction failed")
      setResult(data)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="pt-24 min-h-screen bg-zinc-50">
      <section className="py-16 px-6 bg-white border-b border-zinc-100">
        <div className="max-w-[760px] mx-auto">
          <FadeUp>
            <Link href="/free-tools" className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-teal transition-colors mb-6">
              ← All Free Tools
            </Link>
            <h1 className="text-4xl sm:text-5xl font-extrabold text-zinc-900 mb-4">Engagement Predictor</h1>
            <p className="text-zinc-500 text-lg leading-relaxed max-w-xl">
              AI prediction based on specificity, hook quality, audience relevance, and discussion value.
            </p>
          </FadeUp>
        </div>
      </section>

      <section className="py-12 px-6">
        <div className="max-w-[760px] mx-auto space-y-6">
          <FadeUp>
            <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-6">
              <label className="block text-sm font-semibold text-zinc-800 mb-2">Paste a draft</label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={8}
                placeholder="Paste the draft you want to score..."
                className="w-full px-4 py-3 rounded-xl border border-zinc-200 text-sm text-zinc-800 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal/50 resize-none transition-all"
              />
              <div className="flex justify-end mt-4">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={predict}
                  disabled={!text.trim() || loading}
                  className={`px-5 py-3 rounded-xl text-sm font-semibold transition-all ${text.trim() ? "bg-teal text-white hover:bg-teal-600" : "bg-zinc-200 text-zinc-400 cursor-not-allowed"}`}
                >
                  {loading ? "Predicting..." : "Predict Engagement"}
                </motion.button>
              </div>
              {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
            </div>
          </FadeUp>

          <AnimatePresence>
            {result && (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-6">
                <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-2">Engagement score</p>
                <p className="text-5xl font-extrabold text-zinc-900 mb-3">{result.engagement_score}/100</p>
                <p className="text-sm font-semibold text-teal">{result.reach_prediction} reach, {result.confidence} confidence</p>
                <div className="mt-5 grid gap-2 sm:grid-cols-5">{Object.entries(result.score_breakdown || {}).map(([k, v]) => <div key={k} className="rounded-xl bg-zinc-50 p-3"><p className="text-[10px] font-bold uppercase text-zinc-400">{k}</p><p className="mt-1 text-lg font-bold">{v}</p></div>)}</div>
                <Section title="Why it can work" items={result.why_it_will_work} />
                <Section title="Risks" items={result.risks} />
                <Section title="Recommended edits" items={result.recommended_edits} />
                {result.stronger_opening ? <p className="mt-5 rounded-xl bg-teal/5 p-4 text-sm text-zinc-800">{result.stronger_opening}</p> : null}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>
    </div>
  )
}

function Section({ title, items = [] }: { title: string; items?: string[] }) {
  return items.length ? <div className="mt-5"><p className="mb-2 text-xs font-bold uppercase text-zinc-400">{title}</p><ul className="space-y-1">{items.map((item) => <li key={item} className="text-sm text-zinc-700">- {item}</li>)}</ul></div> : null
}
