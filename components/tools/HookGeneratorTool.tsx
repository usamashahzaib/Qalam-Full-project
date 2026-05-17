"use client"

import { useState } from "react"
import Link from "next/link"
import { AnimatePresence, motion } from "framer-motion"
import { FadeUp } from "@/components/FadeUp"
import { HookIcon } from "@/components/ui/qalam-icons"

const HOOK_TEMPLATES = [
  (t: string) => `Hot take: ${t} is misunderstood by most people. Here's what's actually going on:`,
  (t: string) => `I spent two years on ${t}. Here's the one insight that changed everything:`,
  (t: string) => `Nobody talks about the uncomfortable truth behind ${t}. But it's the part that matters most:`,
  (t: string) => `The counterintuitive lesson I learned from ${t} - that no article mentions:`,
  (t: string) => `5 things I wish I knew about ${t} before I started:`,
  (t: string) => `I used to think ${t} was complicated. Then I realized the real problem:`,
  (t: string) => `Everyone in my network talks about ${t}. But they're missing the most important part:`,
  (t: string) => `Here's what a year of working on ${t} taught me that no one says out loud:`,
  (t: string) => `The biggest mistake I made with ${t} - and what I do differently now:`,
  (t: string) => `${t} changed how I work. This is what I tell everyone who asks me about it:`,
]

export function HookGeneratorTool() {
  const [topic, setTopic] = useState("")
  const [hooks, setHooks] = useState<string[]>([])
  const [generated, setGenerated] = useState(false)
  const [copied, setCopied] = useState<number | null>(null)

  const handleGenerate = () => {
    if (!topic.trim()) return
    setHooks(HOOK_TEMPLATES.map((fn) => fn(topic.trim())))
    setGenerated(true)
  }

  const handleCopy = async (text: string, index: number) => {
    await navigator.clipboard.writeText(text)
    setCopied(index)
    setTimeout(() => setCopied(null), 2000)
  }

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
                <HookIcon className="h-6 w-6" />
              </div>
              <span className="chip border-gold/40 bg-gold/5 text-xs text-gold">Most Used</span>
            </div>
            <h1 className="mb-4 text-4xl font-extrabold leading-tight text-zinc-900 sm:text-5xl">
              LinkedIn Hook Generator
            </h1>
            <p className="max-w-xl text-lg leading-relaxed text-zinc-500">
              Enter your topic and get 10 opening lines built on proven LinkedIn hook patterns - ready to copy, edit, and post. No sign-in required.
            </p>
          </FadeUp>
        </div>
      </section>

      <section className="px-6 py-12">
        <div className="mx-auto max-w-[760px]">
          <FadeUp>
            <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
              <div className="border-b border-zinc-100 p-6">
                <label className="mb-2 block text-sm font-semibold text-zinc-800">What&apos;s your post about?</label>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
                    placeholder="e.g. building a personal brand, remote work culture, hiring mistakes..."
                    className="flex-1 rounded-xl border border-zinc-200 px-4 py-3 text-sm text-zinc-800 placeholder-zinc-400 transition-all focus:border-teal/50 focus:outline-none focus:ring-2 focus:ring-teal/30"
                  />
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={handleGenerate}
                    disabled={!topic.trim()}
                    className={`shrink-0 rounded-xl px-6 py-3 text-sm font-semibold transition-all ${
                      topic.trim() ? "bg-teal text-white shadow-sm hover:bg-teal-600" : "cursor-not-allowed bg-zinc-200 text-zinc-400"
                    }`}
                  >
                    Generate 10 Hooks
                  </motion.button>
                </div>
                <p className="mt-2 text-xs text-zinc-400">
                  Tip: Be specific - "feedback culture in remote startups" beats "remote work"
                </p>
              </div>

              <AnimatePresence>
                {generated && hooks.length > 0 && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: "easeOut" }}>
                    <div className="flex items-center justify-between border-b border-zinc-100 bg-zinc-50 px-6 py-4">
                      <p className="text-sm font-semibold text-zinc-700">10 hook options for "{topic}"</p>
                      <span className="text-xs text-zinc-400">Click any hook to copy</span>
                    </div>
                    <div className="divide-y divide-zinc-50">
                      {hooks.map((hook, i) => (
                        <motion.button
                          key={i}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.3, delay: i * 0.04 }}
                          onClick={() => void handleCopy(hook, i)}
                          className="group flex w-full items-start gap-4 px-6 py-4 text-left transition-colors hover:bg-zinc-50"
                        >
                          <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-xs font-bold text-zinc-500 transition-colors group-hover:bg-teal-50 group-hover:text-teal">
                            {i + 1}
                          </span>
                          <p className="flex-1 text-left text-sm leading-relaxed text-zinc-700">{hook}</p>
                          <span
                            className={`shrink-0 rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
                              copied === i ? "bg-green-50 text-green-700" : "bg-zinc-100 text-zinc-500 opacity-0 group-hover:opacity-100"
                            }`}
                          >
                            {copied === i ? "Copied" : "Copy"}
                          </span>
                        </motion.button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </FadeUp>

          <FadeUp className="mt-8">
            <div className="rounded-2xl border border-zinc-100 bg-white p-6">
              <h3 className="mb-3 text-sm font-semibold text-zinc-800">How these hooks work</h3>
              <p className="mb-4 text-sm leading-relaxed text-zinc-500">
                These 10 patterns are built on consistently strong LinkedIn hook structures: contrarian framing, numbered lists, personal revelation, experience distillation, and curiosity gaps.
              </p>
              <p className="text-sm leading-relaxed text-zinc-500">
                For a full workspace with drafting, archive continuity, and voice settings, use the Qalam app. Paid onboarding is currently handled manually.
              </p>
            </div>
          </FadeUp>

          <FadeUp className="mt-6">
            <div className="rounded-2xl bg-teal p-8 text-center">
              <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-teal-200">Want hooks in your voice?</p>
              <h2 className="mb-2 text-2xl font-bold text-white">Use the full workflow instead of isolated templates.</h2>
              <p className="mx-auto mb-6 max-w-md text-sm text-white/60">
                Voice settings, archive continuity, and guided production onboarding.
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
