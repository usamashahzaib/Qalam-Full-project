"use client"

import { useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { FadeUp } from "@/components/FadeUp"
import { MicroscopeIcon } from "@/components/ui/qalam-icons"

type ViralResult = {
  content_quality_score: number
  breakdown: Record<string, number>
  verdict: string
  specific_feedback: string
  improved_version: string | Record<string, string>
}

function extractImprovedVersion(v: string | Record<string, string> | undefined): string {
  if (!v) return ""
  if (typeof v === "string") return v
  return Object.values(v)[0] ?? ""
}

export function ViralCheckerTool() {
  const [post, setPost] = useState("")
  const [result, setResult] = useState<ViralResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const analyze = async () => {
    if (!post.trim()) return
    setLoading(true)
    setError("")
    setResult(null)
    try {
      const res = await fetch("/api/free-tools/viral-checker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: post }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Analysis failed")
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
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-50 text-teal"><MicroscopeIcon className="h-6 w-6" /></div>
            <h1 className="mb-4 text-4xl font-extrabold text-zinc-900 sm:text-5xl">LinkedIn Post Quality Checker</h1>
            <p className="max-w-xl text-lg leading-relaxed text-zinc-500">A structured review of clarity, specificity, usefulness, and discussion potential. It does not predict reach.</p>
          </FadeUp>
        </div>
      </section>
      <section className="px-6 py-12">
        <div className="mx-auto max-w-[760px] space-y-6">
          <FadeUp>
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
              <label className="mb-2 block text-sm font-semibold text-zinc-800">Paste your LinkedIn post</label>
              <textarea value={post} onChange={(e) => setPost(e.target.value)} rows={8} className="w-full resize-none rounded-xl border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-teal/50 focus:ring-2 focus:ring-teal/30" />
              <div className="mt-3 flex items-center justify-between">
                <p className="text-xs text-zinc-400">{post.trim().split(/\s+/).filter(Boolean).length} words</p>
                <motion.button whileTap={{ scale: 0.97 }} onClick={analyze} disabled={!post.trim() || loading} className="rounded-xl bg-teal px-5 py-2.5 text-sm font-semibold text-white disabled:bg-zinc-200 disabled:text-zinc-400">
                  {loading ? "Analyzing..." : "Analyze with AI"}
                </motion.button>
              </div>
              {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
            </div>
          </FadeUp>
          {result ? (
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">Content quality score</p>
              <p className="mt-1 text-5xl font-extrabold text-zinc-900">{result.content_quality_score}/100</p>
              <p className="mt-2 text-sm font-semibold text-teal">{result.verdict}</p>
              <div className="mt-5 grid gap-2 sm:grid-cols-5">
                {Object.entries(result.breakdown || {}).map(([key, value]) => (
                  <div key={key} className="rounded-xl bg-zinc-50 p-3">
                    <p className="t-eyebrow text-zinc-400">{key}</p>
                    <p className="mt-1 text-lg font-bold">{value}</p>
                  </div>
                ))}
              </div>
              <p className="mt-5 text-sm leading-6 text-zinc-700">{result.specific_feedback}</p>
              {extractImprovedVersion(result.improved_version) ? <div className="mt-4 rounded-xl bg-teal/5 p-4 text-sm leading-6 text-zinc-800">{extractImprovedVersion(result.improved_version)}</div> : null}
            </div>
          ) : null}
        </div>
      </section>
    </div>
  )
}
