"use client"

import { useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { FadeUp } from "@/components/FadeUp"
import { AnalyticsIcon } from "@/components/ui/qalam-icons"

type Result = {
  headline_score: number
  verdict: string
  breakdown: Record<string, number>
  specific_feedback: string[]
  rewritten_headlines: string[]
}

export function HeadlineAnalyzerTool() {
  const [headline, setHeadline] = useState("")
  const [result, setResult] = useState<Result | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const analyze = async () => {
    if (!headline.trim()) return
    setLoading(true)
    setError("")
    setResult(null)
    try {
      const res = await fetch("/api/free-tools/headline-analyzer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ headline }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Headline analysis failed")
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
            <Link href="/free-tools" className="mb-6 inline-flex text-sm text-zinc-400 hover:text-teal">{"<- All Free Tools"}</Link>
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-50 text-teal"><AnalyticsIcon className="h-6 w-6" /></div>
            <h1 className="mb-4 text-4xl font-extrabold text-zinc-900 sm:text-5xl">LinkedIn Headline Analyzer</h1>
            <p className="max-w-xl text-lg leading-relaxed text-zinc-500">AI scores your headline as a profile hook and gives stronger options.</p>
          </FadeUp>
        </div>
      </section>
      <section className="px-6 py-12">
        <div className="mx-auto max-w-[760px] space-y-6">
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <label className="mb-2 block text-sm font-semibold text-zinc-800">Your LinkedIn headline</label>
            <div className="flex gap-3">
              <input value={headline} onChange={(e) => setHeadline(e.target.value)} onKeyDown={(e) => e.key === "Enter" && void analyze()} className="flex-1 rounded-xl border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-teal/50 focus:ring-2 focus:ring-teal/30" />
              <motion.button whileTap={{ scale: 0.97 }} onClick={analyze} disabled={!headline.trim() || loading} className="rounded-xl bg-teal px-5 py-3 text-sm font-semibold text-white disabled:bg-zinc-200 disabled:text-zinc-400">{loading ? "Analyzing..." : "Analyze"}</motion.button>
            </div>
            {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
          </div>
          {result ? (
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">Headline score</p>
              <p className="mt-1 text-5xl font-extrabold text-zinc-900">{result.headline_score}/100</p>
              <p className="mt-2 text-sm font-semibold text-teal">{result.verdict}</p>
              <div className="mt-5 grid gap-2 sm:grid-cols-5">{Object.entries(result.breakdown || {}).map(([k, v]) => <div key={k} className="rounded-xl bg-zinc-50 p-3"><p className="text-[10px] font-bold uppercase text-zinc-400">{k}</p><p className="mt-1 text-lg font-bold">{v}</p></div>)}</div>
              <ul className="mt-5 space-y-2">{(result.specific_feedback || []).map((item) => <li key={item} className="text-sm text-zinc-700">- {item}</li>)}</ul>
              <div className="mt-5 space-y-2">{(result.rewritten_headlines || []).map((item) => <p key={item} className="rounded-xl bg-teal/5 p-3 text-sm text-zinc-800">{item}</p>)}</div>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  )
}
