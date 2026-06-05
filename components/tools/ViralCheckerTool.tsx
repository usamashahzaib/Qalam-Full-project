"use client"

import { useState } from "react"
import Link from "next/link"
import { AnimatePresence, motion } from "framer-motion"
import { FadeUp } from "@/components/FadeUp"
import { MicroscopeIcon } from "@/components/ui/qalam-icons"

type FormulaSignal = { label: string; present: boolean; weight: number; note: string }

function analyzePost(text: string) {
  const sentences = text.split(/[.!?]+/).filter(Boolean)
  const firstSentence = sentences[0] || ""
  const wordCount = text.trim().split(/\s+/).length
  const hasNumber = /\d+/.test(firstSentence)
  const isContrarian = /hot take|nobody|most people|wrong|myth|stop|counterintuitive|unpopular/i.test(firstSentence)
  const isStory = /i (was|am|spent|learned|realized|discovered|tried|failed|quit|started)/i.test(firstSentence)
  const isQuestion = firstSentence.trim().endsWith("?")
  const hasListStructure = /\n\d+[.)]/m.test(text) || (text.match(/^\d+\./gm) || []).length >= 3
  const hasBreaks = (text.match(/\n\n/g) || []).length >= 2
  const hasCTA = /repost|comment|share|follow|save this|tag someone|let me know/i.test(text)
  const hasPersonalStory = /i (was|am|used to|remember|once)/i.test(text)
  const isGoodLength = wordCount >= 80 && wordCount <= 350

  const hookType = isContrarian ? "Contrarian" : isStory ? "Personal story" : isQuestion ? "Question" : hasNumber ? "Data/number" : "Statement"

  const signals: FormulaSignal[] = [
    {
      label: "Strong opening hook",
      present: isContrarian || isStory || isQuestion || hasNumber,
      weight: 3,
      note: `${hookType} hook detected in first line`,
    },
    {
      label: "Short line breaks for scannability",
      present: hasBreaks,
      weight: 2,
      note: hasBreaks ? "Good use of white space - easy to read on mobile" : "Dense paragraphs lose readers - add more line breaks",
    },
    {
      label: "List or structured body",
      present: hasListStructure,
      weight: 1,
      note: hasListStructure ? "Numbered or bulleted structure improves retention" : "Consider a list format for key points",
    },
    {
      label: "Personal experience or perspective",
      present: hasPersonalStory,
      weight: 2,
      note: hasPersonalStory ? "Personal framing builds connection and credibility" : "Adding a personal angle increases engagement",
    },
    {
      label: "Optimal length (80-350 words)",
      present: isGoodLength,
      weight: 2,
      note: isGoodLength ? `${wordCount} words - good for LinkedIn engagement` : wordCount < 80 ? `${wordCount} words - too short for depth` : `${wordCount} words - consider trimming for mobile readers`,
    },
    {
      label: "Call to action",
      present: hasCTA,
      weight: 1,
      note: hasCTA ? "Good - you invite engagement" : "Adding a CTA can lift reach",
    },
  ]

  const totalWeight = signals.reduce((sum, s) => sum + s.weight, 0)
  const earnedWeight = signals.filter((s) => s.present).reduce((sum, s) => sum + s.weight, 0)
  const ratio = earnedWeight / totalWeight
  const verdict = ratio >= 0.8 ? "Strong formula - this post is built to reach." : ratio >= 0.6 ? "Solid foundation - a few tweaks would push this further." : ratio >= 0.4 ? "Partial formula - good elements, but missing key drivers." : "Weak signal - this post needs structural work to perform."

  return { signals, hookType, verdict }
}

export function ViralCheckerTool() {
  const [post, setPost] = useState("")
  const [result, setResult] = useState<ReturnType<typeof analyzePost> | null>(null)

  return (
    <div className="min-h-screen bg-zinc-50 pt-24">
      <section className="relative overflow-hidden border-b border-zinc-100 bg-white px-6 py-16">
        <div
          className="pointer-events-none absolute right-0 top-0 h-[400px] w-[400px] rounded-full opacity-15"
          style={{ background: "radial-gradient(circle, rgba(13,74,69,0.2) 0%, transparent 70%)" }}
        />
        <div className="relative z-10 mx-auto max-w-[760px]">
          <FadeUp>
            <Link href="/free-tools" className="mb-6 inline-flex items-center gap-1.5 text-sm text-zinc-400 transition-colors hover:text-teal">
              {"<- All Free Tools"}
            </Link>
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-50 text-teal">
                <MicroscopeIcon className="h-6 w-6" />
              </div>
            </div>
            <h1 className="mb-4 text-4xl font-extrabold leading-tight text-zinc-900 sm:text-5xl">Viral Formula Checker</h1>
            <p className="max-w-xl text-lg leading-relaxed text-zinc-500">
              Paste any LinkedIn post and get a structural breakdown - which engagement signals are present and which are missing. Pattern analysis, no AI guessing.
            </p>
          </FadeUp>
        </div>
      </section>

      <section className="px-6 py-12">
        <div className="mx-auto max-w-[760px] space-y-6">
          <FadeUp>
            <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
              <div className="border-b border-zinc-100 p-6">
                <label className="mb-2 block text-sm font-semibold text-zinc-800">Paste your LinkedIn post</label>
                <textarea
                  value={post}
                  onChange={(e) => setPost(e.target.value)}
                  placeholder="Paste the full text of the post you want to analyze..."
                  rows={7}
                  className="w-full resize-none rounded-xl border border-zinc-200 px-4 py-3 text-sm text-zinc-800 placeholder-zinc-400 transition-all focus:border-teal/50 focus:outline-none focus:ring-2 focus:ring-teal/30"
                />
                <div className="mt-3 flex items-center justify-between">
                  <p className="text-xs text-zinc-400">{post.trim().split(/\s+/).filter(Boolean).length} words</p>
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => post.trim() && setResult(analyzePost(post))}
                    disabled={!post.trim()}
                    className={`rounded-xl px-5 py-2.5 text-sm font-semibold transition-all ${post.trim() ? "bg-teal text-white shadow-sm hover:bg-teal-600" : "cursor-not-allowed bg-zinc-200 text-zinc-400"}`}
                  >
                    Analyze Formula
                  </motion.button>
                </div>
              </div>

              <AnimatePresence>
                {result && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="space-y-5 p-6">
                    <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-4">
                      <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-zinc-400">Verdict</p>
                      <p className="text-sm font-semibold text-zinc-800">{result.verdict}</p>
                    </div>

                    <div className="space-y-3">
                      {result.signals.map((signal) => (
                        <div key={signal.label} className="flex items-start gap-3">
                          <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${signal.present ? "bg-green-100 text-green-700" : "bg-zinc-100 text-zinc-400"}`}>
                            {signal.present ? "Yes" : "No"}
                          </span>
                          <div>
                            <p className="text-sm font-medium text-zinc-800">{signal.label}</p>
                            <p className="mt-0.5 text-xs text-zinc-500">{signal.note}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </FadeUp>

          <FadeUp>
            <div className="rounded-2xl bg-teal p-8 text-center">
              <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-teal-200">Write posts with these patterns built in</p>
              <h2 className="mb-2 text-2xl font-bold text-white">Qalam generates posts that check the right boxes in your voice.</h2>
              <p className="mx-auto mb-6 max-w-md text-sm text-white/60">
                Drafting, voice settings, hook variation, and archive continuity in one workspace.
              </p>
              <Link href="/auth/sign-up" className="inline-flex items-center gap-2 rounded-xl bg-gold px-7 py-3.5 font-bold text-white shadow-lg transition-colors hover:bg-gold-600">
                {"Start with LinkedIn ->"}
              </Link>
            </div>
          </FadeUp>
        </div>
      </section>
    </div>
  )
}
