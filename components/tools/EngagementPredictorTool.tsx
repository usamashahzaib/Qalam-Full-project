"use client"

import { useState } from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { FadeUp } from "@/components/FadeUp"
import { AnalyticsIcon } from "@/components/ui/qalam-icons"

type Result = {
  content_readiness_score: number
  assessment: string
  score_breakdown: Record<string, number>
  strengths: string[]
  risks: string[]
  recommended_edits: string[]
  stronger_opening: string
}

function Section({ title, items = [] }: { title: string; items?: string[] }) {
  return items.length ? (
    <div className="mt-5">
      <p className="mb-2 text-xs font-bold uppercase text-zinc-400">{title}</p>
      <ul className="space-y-1">
        {items.map((item) => (
          <li key={item} className="text-sm text-zinc-700">- {item}</li>
        ))}
      </ul>
    </div>
  ) : null
}

export function EngagementPredictorTool() {
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
    <div className="min-h-screen bg-zinc-50 pt-24">
      <section className="border-b border-zinc-100 bg-white px-6 py-16">
        <div className="mx-auto max-w-[760px]">
          <FadeUp>
            <Link href="/free-tools" className="mb-6 inline-flex text-sm text-zinc-400 hover:text-teal transition-colors">{"<- All Free Tools"}</Link>
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-50 text-teal"><AnalyticsIcon className="h-6 w-6" /></div>
            <h1 className="mb-4 text-4xl font-extrabold text-zinc-900 sm:text-5xl">Post Readiness Review</h1>
            <p className="max-w-xl text-lg leading-relaxed text-zinc-500">
              A pre-publish quality review based on specificity, hook strength, audience relevance, and discussion value. It does not predict reach.
            </p>
          </FadeUp>
        </div>
      </section>

      <section className="px-6 py-12">
        <div className="mx-auto max-w-[760px] space-y-6">
          <FadeUp>
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
              <label className="mb-2 block text-sm font-semibold text-zinc-800">Paste a draft</label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={8}
                placeholder="Paste the draft you want to score..."
                className="w-full resize-none rounded-xl border border-zinc-200 px-4 py-3 text-sm text-zinc-800 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal/50 transition-all"
              />
              <div className="mt-4 flex justify-end">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={predict}
                  disabled={!text.trim() || loading}
                  className={`rounded-xl px-5 py-3 text-sm font-semibold transition-all ${text.trim() ? "bg-teal text-white hover:bg-teal-600" : "cursor-not-allowed bg-zinc-200 text-zinc-400"}`}
                >
                  {loading ? "Reviewing..." : "Review Draft"}
                </motion.button>
              </div>
              {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
            </div>
          </FadeUp>

          <AnimatePresence>
            {result && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm"
              >
                <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-zinc-400">Content readiness score</p>
                <p className="text-5xl font-extrabold text-zinc-900">{result.content_readiness_score}/100</p>
                <p className="mt-1 text-sm font-semibold capitalize text-teal">{result.assessment}</p>
                <div className="mt-5 grid gap-2 sm:grid-cols-5">
                  {Object.entries(result.score_breakdown || {}).map(([k, v]) => (
                    <div key={k} className="rounded-xl bg-zinc-50 p-3">
                      <p className="t-eyebrow text-zinc-400">{k}</p>
                      <p className="mt-1 text-lg font-bold">{v}</p>
                    </div>
                  ))}
                </div>
                <Section title="Strengths" items={result.strengths} />
                <Section title="Risks" items={result.risks} />
                <Section title="Recommended edits" items={result.recommended_edits} />
                {result.stronger_opening ? (
                  <p className="mt-5 rounded-xl bg-teal/5 p-4 text-sm text-zinc-800">{result.stronger_opening}</p>
                ) : null}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>
    </div>
  )
}
