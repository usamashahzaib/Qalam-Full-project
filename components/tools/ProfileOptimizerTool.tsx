"use client"

import { useState } from "react"
import Link from "next/link"
import { AnimatePresence, motion } from "framer-motion"
import { FadeUp } from "@/components/FadeUp"
import { ProfileIcon } from "@/components/ui/qalam-icons"

const QUESTIONS = [
  { id: "photo", label: "Do you have a professional profile photo?", weight: 15 },
  { id: "banner", label: "Do you have a custom LinkedIn banner?", weight: 8 },
  { id: "headline_specific", label: "Does your headline say more than just your job title?", weight: 12 },
  { id: "about_length", label: "Is your About section longer than 200 words?", weight: 10 },
  { id: "about_first_person", label: "Does your About section use first-person voice (I, my)?", weight: 8 },
  { id: "featured", label: "Do you have something in your Featured section?", weight: 8 },
  { id: "posting", label: "Have you posted on LinkedIn in the last 30 days?", weight: 15 },
  { id: "recommendations", label: "Do you have 3 or more recommendations?", weight: 8 },
  { id: "skills", label: "Do you have 10 or more skills listed?", weight: 6 },
  { id: "contact", label: "Is your contact info (email or website) visible on your profile?", weight: 10 },
]

const IMPROVEMENTS: Record<string, string> = {
  photo: "A professional headshot improves profile trust quickly. Use natural light, a clear face, and a clean background.",
  banner: "A custom banner signals intent. Use your specialty, role, or a visual that reinforces your brand.",
  headline_specific: "Your headline is the most-read line on your profile. Add specialty, audience, or a concrete result.",
  about_length: "Short About sections miss the SEO and credibility opportunity. Aim for 200-400 words.",
  about_first_person: "Third-person About sections feel detached. First person is warmer and builds faster trust.",
  featured: "The Featured section is prime real estate. Pin your best post, newsletter, or work sample.",
  posting: "Consistent publishing increases profile visibility. Even one post per week helps.",
  recommendations: "Recommendations remain one of the highest-trust signals on LinkedIn. Ask a few strong collaborators.",
  skills: "Skills drive discoverability in search. Fill them with your real competencies.",
  contact: "If someone can't contact you, they won't. Make it frictionless.",
}

export function ProfileOptimizerTool() {
  const [answers, setAnswers] = useState<Record<string, boolean | null>>({})
  const [submitted, setSubmitted] = useState(false)

  const allAnswered = QUESTIONS.every((q) => answers[q.id] !== undefined && answers[q.id] !== null)
  const score = submitted ? QUESTIONS.filter((q) => answers[q.id] === true).reduce((sum, q) => sum + q.weight, 0) : 0
  const missed = submitted ? QUESTIONS.filter((q) => answers[q.id] === false) : []
  const verdict = score >= 85 ? "Excellent" : score >= 65 ? "Strong" : score >= 45 ? "Good start" : "Needs work"
  const verdictColor = score >= 85 ? "text-green-700" : score >= 65 ? "text-teal" : score >= 45 ? "text-amber-700" : "text-red-700"

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
                <ProfileIcon className="h-6 w-6" />
              </div>
            </div>
            <h1 className="mb-4 text-4xl font-extrabold leading-tight text-zinc-900 sm:text-5xl">LinkedIn Profile Optimizer</h1>
            <p className="max-w-xl text-lg leading-relaxed text-zinc-500">
              Answer 10 questions about your current profile and get a score with specific, actionable improvements. No sign-in needed.
            </p>
          </FadeUp>
        </div>
      </section>

      <section className="px-6 py-12">
        <div className="mx-auto max-w-[760px] space-y-6">
          <FadeUp>
            <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
              <div className="border-b border-zinc-100 px-6 py-4">
                <p className="text-sm font-semibold text-zinc-800">Your LinkedIn profile checklist</p>
                <p className="mt-0.5 text-xs text-zinc-400">Answer honestly based on your profile right now</p>
              </div>

              <div className="divide-y divide-zinc-50">
                {QUESTIONS.map((q, i) => (
                  <motion.div key={q.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3, delay: i * 0.04 }} className="flex items-center justify-between gap-4 px-6 py-4">
                    <p className="flex-1 text-sm text-zinc-700">{q.label}</p>
                    <div className="flex shrink-0 gap-2">
                      <button onClick={() => setAnswers((a) => ({ ...a, [q.id]: true }))} className={`rounded-lg border px-4 py-1.5 text-xs font-semibold transition-all ${answers[q.id] === true ? "border-green-600 bg-green-600 text-white" : "border-zinc-200 text-zinc-600 hover:border-green-400 hover:text-green-700"}`}>
                        Yes
                      </button>
                      <button onClick={() => setAnswers((a) => ({ ...a, [q.id]: false }))} className={`rounded-lg border px-4 py-1.5 text-xs font-semibold transition-all ${answers[q.id] === false ? "border-zinc-700 bg-zinc-700 text-white" : "border-zinc-200 text-zinc-600 hover:border-zinc-400"}`}>
                        No
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>

              <div className="border-t border-zinc-100 p-6">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => allAnswered && setSubmitted(true)}
                  disabled={!allAnswered}
                  className={`w-full rounded-xl py-3.5 text-sm font-bold transition-all ${allAnswered ? "bg-teal text-white shadow-sm hover:bg-teal-600" : "cursor-not-allowed bg-zinc-200 text-zinc-400"}`}
                >
                  {allAnswered ? "Get My Profile Score ->" : `Answer all ${QUESTIONS.length} questions to continue`}
                </motion.button>
              </div>
            </div>
          </FadeUp>

          <AnimatePresence>
            {submitted && (
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="space-y-4">
                <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
                  <div className="mb-6 flex items-center justify-between">
                    <div>
                      <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-zinc-400">Profile score</p>
                      <div className="flex items-baseline gap-2">
                        <span className={`text-5xl font-extrabold ${verdictColor}`}>{score}</span>
                        <span className="text-lg text-zinc-400">/100</span>
                        <span className={`ml-1 text-lg font-semibold ${verdictColor}`}>{verdict}</span>
                      </div>
                    </div>
                    <div className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-zinc-100">
                      <span className="text-3xl font-extrabold text-zinc-800">{score}</span>
                    </div>
                  </div>

                  {missed.length > 0 && (
                    <div>
                      <p className="mb-3 text-sm font-semibold text-zinc-800">Where to focus next</p>
                      <div className="space-y-3">
                        {missed.map((q) => (
                          <div key={q.id} className="flex items-start gap-3 rounded-xl border border-amber-100 bg-amber-50 p-3">
                            <span className="mt-0.5 shrink-0 text-xs font-bold text-amber-500">+{q.weight}pts</span>
                            <div>
                              <p className="text-sm font-medium text-zinc-800">{q.label}</p>
                              <p className="mt-0.5 text-xs text-zinc-500">{IMPROVEMENTS[q.id]}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="rounded-2xl bg-teal p-8 text-center">
                  <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-teal-200">A strong profile deserves consistent content</p>
                  <h2 className="mb-2 text-2xl font-bold text-white">Now build the content engine that matches your profile.</h2>
                  <p className="mx-auto mb-6 max-w-md text-sm text-white/60">
                    Voice settings, post scheduling, and event-backed workspace history.
                  </p>
                  <Link href="/auth/sign-up" className="inline-flex items-center gap-2 rounded-xl bg-gold px-7 py-3.5 font-bold text-white shadow-lg transition-colors hover:bg-gold-600">
                    {"Start with LinkedIn ->"}
                  </Link>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>
    </div>
  )
}
