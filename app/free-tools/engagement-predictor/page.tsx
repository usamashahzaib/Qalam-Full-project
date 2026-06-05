"use client"

import { useState } from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { FadeUp } from "@/components/FadeUp"

function scorePost(text: string) {
  const words = text.trim().split(/\s+/).filter(Boolean)
  const firstLine = text.split("\n")[0]?.trim() || ""
  const score =
    (words.length >= 80 && words.length <= 260 ? 30 : 15) +
    (/\d|\?/.test(firstLine) ? 20 : 10) +
    ((text.match(/\n\n/g) || []).length >= 2 ? 20 : 10) +
    (/I |we |my |our /i.test(text) ? 15 : 5) +
    (/comment|reply|share|follow|save/i.test(text) ? 15 : 5)

  return Math.min(score, 100)
}

export default function EngagementPredictorPage() {
  const [text, setText] = useState("")
  const [score, setScore] = useState<number | null>(null)

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
              A pre-publish heuristic score based on structure and clarity. It is directional, not a
              claim about actual reach.
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
                  onClick={() => text.trim() && setScore(scorePost(text))}
                  disabled={!text.trim()}
                  className={`px-5 py-3 rounded-xl text-sm font-semibold transition-all ${text.trim() ? "bg-teal text-white hover:bg-teal-600" : "bg-zinc-200 text-zinc-400 cursor-not-allowed"}`}
                >
                  Score Draft
                </motion.button>
              </div>
            </div>
          </FadeUp>

          <AnimatePresence>
            {score !== null && (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-6">
                <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-2">Heuristic score</p>
                <p className="text-5xl font-extrabold text-zinc-900 mb-3">{score}/100</p>
                <p className="text-sm text-zinc-500 leading-relaxed">
                  This score rewards a clear first line, readable spacing, personal framing, reasonable
                  length, and an explicit CTA. It does not know your audience, timing, or network quality.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>
    </div>
  )
}
