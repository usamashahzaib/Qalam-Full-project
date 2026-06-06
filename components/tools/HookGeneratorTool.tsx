"use client"

import { useState } from "react"
import Link from "next/link"
import { AnimatePresence, motion } from "framer-motion"
import { FadeUp } from "@/components/FadeUp"
import { HookIcon } from "@/components/ui/qalam-icons"

export function HookGeneratorTool() {
  const [topic, setTopic] = useState("")
  const [hooks, setHooks] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [generated, setGenerated] = useState(false)
  const [copied, setCopied] = useState<number | null>(null)

  const handleGenerate = async () => {
    const trimmed = topic.trim()
    if (!trimmed) return
    setLoading(true)
    setError(null)
    setHooks([])
    setGenerated(false)

    try {
      const res = await fetch("/api/free-tools/hook-generator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: trimmed }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Failed to generate hooks. Please try again.")
        return
      }
      if (!data.hooks || data.hooks.length === 0) {
        setError("No hooks returned. Please try a different topic.")
        return
      }
      setHooks(data.hooks)
      setGenerated(true)
    } catch {
      setError("Network error. Please check your connection and try again.")
    } finally {
      setLoading(false)
    }
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
              Enter your topic and get 5 AI-written opening lines built on proven LinkedIn hook patterns - ready to copy, edit, and post. No sign-in required.
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
                    onKeyDown={(e) => e.key === "Enter" && !loading && handleGenerate()}
                    placeholder="e.g. building a personal brand, remote work culture, hiring mistakes..."
                    className="flex-1 rounded-xl border border-zinc-200 px-4 py-3 text-sm text-zinc-800 placeholder-zinc-400 transition-all focus:border-teal/50 focus:outline-none focus:ring-2 focus:ring-teal/30"
                    disabled={loading}
                  />
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={handleGenerate}
                    disabled={!topic.trim() || loading}
                    className={`shrink-0 rounded-xl px-6 py-3 text-sm font-semibold transition-all ${
                      topic.trim() && !loading
                        ? "bg-teal text-white shadow-sm hover:bg-teal-600"
                        : "cursor-not-allowed bg-zinc-200 text-zinc-400"
                    }`}
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Generating...
                      </span>
                    ) : "Generate 5 Hooks"}
                  </motion.button>
                </div>
                <p className="mt-2 text-xs text-zinc-400">
                  Tip: Be specific - &quot;feedback culture in remote startups&quot; beats &quot;remote work&quot;
                </p>
              </div>

              {error && (
                <div className="border-b border-red-100 bg-red-50 px-6 py-4">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <AnimatePresence>
                {generated && hooks.length > 0 && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: "easeOut" }}>
                    <div className="flex items-center justify-between border-b border-zinc-100 bg-zinc-50 px-6 py-4">
                      <p className="text-sm font-semibold text-zinc-700">5 AI hooks for &quot;{topic}&quot;</p>
                      <span className="text-xs text-zinc-400">Click any hook to copy</span>
                    </div>
                    <div className="divide-y divide-zinc-50">
                      {hooks.map((hook, i) => (
                        <motion.button
                          key={i}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.3, delay: i * 0.06 }}
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
                            {copied === i ? "Copied!" : "Copy"}
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
                AI generates hooks using the highest-performing LinkedIn structures: contrarian framing, numbered lists, personal revelation, experience distillation, and curiosity gaps.
              </p>
              <p className="text-sm leading-relaxed text-zinc-500">
                For a full workspace with drafting, archive continuity, and voice settings, use the Qalam app.
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
