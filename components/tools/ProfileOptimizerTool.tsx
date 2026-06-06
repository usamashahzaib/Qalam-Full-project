"use client"

import { useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { FadeUp } from "@/components/FadeUp"
import { ProfileIcon } from "@/components/ui/qalam-icons"

type Result = {
  profile_score: number
  positioning_diagnosis: string
  optimized_about: string
  headline_suggestion: string
  top_fixes: string[]
  keyword_suggestions: string[]
}

export function ProfileOptimizerTool() {
  const [headline, setHeadline] = useState("")
  const [audience, setAudience] = useState("")
  const [about, setAbout] = useState("")
  const [result, setResult] = useState<Result | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const optimize = async () => {
    if (!about.trim()) return
    setLoading(true)
    setError("")
    setResult(null)
    try {
      const res = await fetch("/api/free-tools/profile-optimizer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ headline, audience, about }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Profile optimization failed")
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
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-50 text-teal"><ProfileIcon className="h-6 w-6" /></div>
            <h1 className="mb-4 text-4xl font-extrabold text-zinc-900 sm:text-5xl">LinkedIn Profile Optimizer</h1>
            <p className="max-w-xl text-lg leading-relaxed text-zinc-500">AI rewrites your About section and sharpens your positioning.</p>
          </FadeUp>
        </div>
      </section>
      <section className="px-6 py-12">
        <div className="mx-auto max-w-[760px] space-y-6">
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block"><span className="mb-1 block text-xs font-semibold text-zinc-500">Current headline</span><input value={headline} onChange={(e) => setHeadline(e.target.value)} className="w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-teal/50 focus:ring-2 focus:ring-teal/30" /></label>
              <label className="block"><span className="mb-1 block text-xs font-semibold text-zinc-500">Target audience</span><input value={audience} onChange={(e) => setAudience(e.target.value)} className="w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-teal/50 focus:ring-2 focus:ring-teal/30" /></label>
            </div>
            <label className="mt-4 block">
              <span className="mb-1 block text-xs font-semibold text-zinc-500">About section</span>
              <textarea value={about} onChange={(e) => setAbout(e.target.value)} rows={9} className="w-full resize-none rounded-xl border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-teal/50 focus:ring-2 focus:ring-teal/30" />
            </label>
            <div className="mt-4 flex justify-end"><motion.button whileTap={{ scale: 0.97 }} onClick={optimize} disabled={!about.trim() || loading} className="rounded-xl bg-teal px-5 py-3 text-sm font-semibold text-white disabled:bg-zinc-200 disabled:text-zinc-400">{loading ? "Optimizing..." : "Optimize with AI"}</motion.button></div>
            {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
          </div>
          {result ? (
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">Profile score</p>
              <p className="mt-1 text-5xl font-extrabold text-zinc-900">{result.profile_score}/100</p>
              <p className="mt-4 text-sm leading-6 text-zinc-700">{result.positioning_diagnosis}</p>
              <div className="mt-5 rounded-xl bg-teal/5 p-4">
                <p className="text-xs font-bold uppercase text-teal">Headline suggestion</p>
                <p className="mt-2 text-sm font-semibold text-zinc-900">{result.headline_suggestion}</p>
              </div>
              <div className="mt-5 rounded-xl border border-zinc-100 p-4">
                <p className="text-xs font-bold uppercase text-zinc-400">Optimized About</p>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-zinc-800">{result.optimized_about}</p>
              </div>
              <ul className="mt-5 space-y-2">{(result.top_fixes || []).map((item) => <li key={item} className="text-sm text-zinc-700">- {item}</li>)}</ul>
              <div className="mt-4 flex flex-wrap gap-2">{(result.keyword_suggestions || []).map((item) => <span key={item} className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-600">{item}</span>)}</div>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  )
}
