"use client"

import { useState } from "react"
import Link from "next/link"
import { AnimatePresence, motion } from "framer-motion"
import { FadeUp } from "@/components/FadeUp"
import { AnalyticsIcon } from "@/components/ui/qalam-icons"

const POWER_WORDS = ["best", "proven", "secret", "ultimate", "top", "essential", "critical", "rare", "honest", "real", "direct", "simple", "clear", "fast", "deep"]
const ACTION_WORDS = ["build", "grow", "lead", "fix", "learn", "ship", "hire", "scale", "drive", "create", "manage", "run", "launch", "close", "win"]

function scoreHeadline(headline: string) {
  const words = headline.trim().split(/\s+/)
  const lower = headline.toLowerCase()
  const wordCount = words.length
  const hasPowerWord = POWER_WORDS.some((w) => lower.includes(w))
  const hasActionWord = ACTION_WORDS.some((w) => lower.includes(w))
  const hasNumber = /\d/.test(headline)
  const hasSpecialty = headline.includes("|") || headline.includes("·") || headline.includes("@") || headline.includes("-")
  const notTooLong = wordCount <= 12
  const notTooShort = wordCount >= 4
  const hasRole = /manager|director|lead|founder|head|vp|ceo|cto|consultant|engineer|designer|analyst/i.test(headline)

  const signals = [
    {
      label: "4-12 words",
      pass: notTooLong && notTooShort,
      note: notTooShort ? (notTooLong ? "Good length for scannability" : "Too long - trim to under 12 words") : "Too short - add more context",
    },
    {
      label: "Contains a power or action word",
      pass: hasPowerWord || hasActionWord,
      note: hasPowerWord || hasActionWord ? "Adds credibility or momentum" : "Add a strong verb or descriptor",
    },
    {
      label: "Includes a number or specific detail",
      pass: hasNumber,
      note: hasNumber ? "Specificity builds trust" : "Consider adding a number or concrete detail",
    },
    {
      label: "Uses a separator to show multiple dimensions",
      pass: hasSpecialty,
      note: hasSpecialty ? "Clear structure helps the eye" : "Try 'Role | Specialty | Who you help'",
    },
    {
      label: "Includes your role or domain",
      pass: hasRole,
      note: hasRole ? "Immediately contextualizes who you are" : "Make your title or domain explicit",
    },
  ]

  return { score: Math.round((signals.filter((s) => s.pass).length / signals.length) * 100), signals }
}

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 80 ? "text-green-700 bg-green-50 border-green-200" : score >= 60 ? "text-amber-700 bg-amber-50 border-amber-200" : "text-red-700 bg-red-50 border-red-200"
  const label = score >= 80 ? "Strong" : score >= 60 ? "Solid" : "Needs work"

  return (
    <div className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold ${color}`}>
      <span className="text-2xl font-extrabold">{score}</span>
      <div>
        <p className="leading-none">{label}</p>
        <p className="text-xs font-normal opacity-70">out of 100</p>
      </div>
    </div>
  )
}

export function HeadlineAnalyzerTool() {
  const [headline, setHeadline] = useState("")
  const [result, setResult] = useState<ReturnType<typeof scoreHeadline> | null>(null)

  return (
    <div className="min-h-screen bg-zinc-50 pt-24">
      <section className="relative overflow-hidden border-b border-zinc-100 bg-white px-6 py-16">
        <div
          className="pointer-events-none absolute right-0 top-0 h-[400px] w-[400px] rounded-full opacity-15"
          style={{ background: "radial-gradient(circle, rgba(201,135,31,0.2) 0%, transparent 70%)" }}
        />
        <div className="relative z-10 mx-auto max-w-[760px]">
          <FadeUp>
            <Link href="/free-tools" className="mb-6 inline-flex items-center gap-1.5 text-sm text-zinc-400 transition-colors hover:text-teal">
              {"<- All Free Tools"}
            </Link>
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-50 text-teal">
                <AnalyticsIcon className="h-6 w-6" />
              </div>
              <span className="chip border-teal/30 bg-teal-50 text-xs text-teal">Popular</span>
            </div>
            <h1 className="mb-4 text-4xl font-extrabold leading-tight text-zinc-900 sm:text-5xl">LinkedIn Headline Analyzer</h1>
            <p className="max-w-xl text-lg leading-relaxed text-zinc-500">
              Paste your current LinkedIn headline and get an instant score across five proven dimensions with specific suggestions to improve it.
            </p>
          </FadeUp>
        </div>
      </section>

      <section className="px-6 py-12">
        <div className="mx-auto max-w-[760px] space-y-6">
          <FadeUp>
            <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
              <div className="border-b border-zinc-100 p-6">
                <label className="mb-2 block text-sm font-semibold text-zinc-800">Your LinkedIn headline</label>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={headline}
                    onChange={(e) => setHeadline(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && headline.trim() && setResult(scoreHeadline(headline))}
                    placeholder="e.g. Helping SaaS founders hire better | Talent Lead at Acme"
                    className="flex-1 rounded-xl border border-zinc-200 px-4 py-3 text-sm text-zinc-800 placeholder-zinc-400 transition-all focus:border-teal/50 focus:outline-none focus:ring-2 focus:ring-teal/30"
                  />
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => headline.trim() && setResult(scoreHeadline(headline))}
                    disabled={!headline.trim()}
                    className={`shrink-0 rounded-xl px-5 py-3 text-sm font-semibold transition-all ${
                      headline.trim() ? "bg-teal text-white shadow-sm hover:bg-teal-600" : "cursor-not-allowed bg-zinc-200 text-zinc-400"
                    }`}
                  >
                    Analyze
                  </motion.button>
                </div>
              </div>

              <AnimatePresence>
                {result && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="space-y-5 p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-zinc-500">Headline score</p>
                        <ScoreBadge score={result.score} />
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-zinc-400">{headline.length} characters</p>
                        <p className="text-xs text-zinc-400">{headline.trim().split(/\s+/).length} words</p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {result.signals.map((signal) => (
                        <div key={signal.label} className="flex items-start gap-3">
                          <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${signal.pass ? "bg-green-100 text-green-700" : "bg-red-50 text-red-600"}`}>
                            {signal.pass ? "Yes" : "No"}
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
              <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-teal-200">Write content that matches your headline</p>
              <h2 className="mb-2 text-2xl font-bold text-white">A strong headline builds the promise. Qalam helps you keep it.</h2>
              <p className="mx-auto mb-6 max-w-md text-sm text-white/60">
                Voice settings, post archive, and event-backed analytics in one workspace.
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
