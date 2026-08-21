"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { useBilling } from "@/lib/hooks/useBilling"
import { canAccessPlan } from "@/lib/entitlements"
import { getPlanByName } from "@/lib/pricing"
import { LockedFeature } from "@/components/LockedFeature"

type HookStructure = { pattern: string; length: string; type: string }
type ContentPattern = { framework: string; structure: string; estimatedReadTime: string }
type Analysis = {
  hookStructure: HookStructure
  engagementFactors: string[]
  contentPattern: ContentPattern
  improvements: string[]
}
type HistoryItem = {
  id: string
  post_text: string
  post_url: string | null
  hook_structure: HookStructure
  engagement_factors: string[]
  content_pattern: ContentPattern
  improvements: string[]
  created_at: string
}
type StatusMsg = { text: string; type: "info" | "error" | "success" }

const formatDate = (iso: string) => {
  try { return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" }) } catch { return "" }
}

export default function CompetitorsPage() {
  const router = useRouter()
  const { billing } = useBilling()
  const canUse = canAccessPlan(billing.plan, "Pro")

  const [postText, setPostText] = useState("")
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [runsUsed, setRunsUsed] = useState(0)
  const limit = getPlanByName(billing.plan).researchPerMonth
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [historyLoaded, setHistoryLoaded] = useState(false)
  const [status, setStatus] = useState<StatusMsg | null>(null)
  const statusTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const showStatus = useCallback((text: string, type: StatusMsg["type"]) => {
    clearTimeout(statusTimer.current)
    setStatus({ text, type })
    if (type !== "error") statusTimer.current = setTimeout(() => setStatus(null), 4000)
  }, [])

  useEffect(() => {
    if (!canUse) return
    fetch("/api/competitors/history")
      .then((r) => r.json())
      .then((data: { history?: HistoryItem[]; runsUsed?: number }) => {
        setHistory(data.history || [])
        setRunsUsed(data.runsUsed || 0)
      })
      .catch(() => null)
      .finally(() => setHistoryLoaded(true))
  }, [canUse])

  const onAnalyze = async () => {
    if (postText.trim().length < 50) {
      showStatus("Paste at least 50 characters of the competitor post.", "error")
      return
    }
    setIsAnalyzing(true)
    setAnalysis(null)
    setStatus(null)
    try {
      const res = await fetch("/api/competitors/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postText: postText.trim() }),
      })
      const data = await res.json() as { analysis?: Analysis; runsUsed?: number; limit?: number; error?: string }
      if (!res.ok) throw new Error(data.error || "Analysis failed")
      setAnalysis(data.analysis!)
      setRunsUsed(data.runsUsed ?? runsUsed + 1)
      showStatus("Analysis complete.", "success")
      // Refresh history
      fetch("/api/competitors/history")
        .then((r) => r.json())
        .then((d: { history?: HistoryItem[] }) => setHistory(d.history || []))
        .catch(() => null)
    } catch (e) {
      showStatus((e as Error).message, "error")
    } finally {
      setIsAnalyzing(false)
    }
  }

  const onApplyToPost = () => {
    if (!analysis) return
    const insights = {
      hookPattern: analysis.hookStructure.pattern,
      hookType: analysis.hookStructure.type,
      engagementFactors: analysis.engagementFactors,
      framework: analysis.contentPattern.framework,
      improvements: analysis.improvements,
    }
    if (typeof window !== "undefined") {
      sessionStorage.setItem("competitorInsights", JSON.stringify(insights))
    }
    router.push("/writer")
  }

  const loadFromHistory = (item: HistoryItem) => {
    setAnalysis({
      hookStructure: item.hook_structure,
      engagementFactors: item.engagement_factors,
      contentPattern: item.content_pattern,
      improvements: item.improvements,
    })
    setPostText(item.post_text)
  }

  const blurredAnalysis: Analysis = {
    hookStructure: { pattern: "Bold claim opener", length: "short", type: "Authority" },
    engagementFactors: ["Personal story with vulnerability", "Concrete numbers", "Relatable struggle", "Clear takeaway"],
    contentPattern: { framework: "Problem-Agitate-Solve", structure: "Hook → Story → 3 lessons → CTA", estimatedReadTime: "50 seconds" },
    improvements: ["Open with a stronger personal detail", "Add one specific metric", "End with a question CTA"],
  }

  return (
    <div className="mx-auto max-w-[1100px] px-4 py-8 lg:px-6">

      {/* Header */}
      <div className="mb-8">
        <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-zinc-400">Competitor Research</p>
        <h1 className="mt-1 text-2xl font-bold text-zinc-900">Post Analyzer</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Paste a competitor&rsquo;s LinkedIn post to decode what makes it work - then apply those patterns to your own.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">

        {/* Main column */}
        <div className="space-y-5">

          {/* Input section */}
          <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
            <div className="border-b border-zinc-100 bg-zinc-50/60 px-5 py-3.5">
              <h2 className="text-sm font-bold text-zinc-900">Paste competitor post</h2>
              <p className="mt-0.5 text-xs text-zinc-500">Text only - remove images, likes, and metadata before pasting.</p>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-widest text-zinc-400">
                  Post text <span className="font-normal normal-case text-zinc-400">(required)</span>
                </label>
                <textarea
                  value={postText}
                  onChange={(e) => setPostText(e.target.value)}
                  rows={8}
                  placeholder="Paste the full text of the LinkedIn post you want to analyze..."
                  className="w-full resize-none rounded-xl border border-zinc-200 bg-zinc-50/50 px-4 py-3 text-sm leading-relaxed text-zinc-900 outline-none transition-all focus:border-teal focus:bg-white focus:ring-4 focus:ring-teal/10"
                />
                <p className="mt-1 text-xs text-zinc-400">{postText.length} characters</p>
              </div>
              {canUse && (
                <p className="text-xs text-zinc-400">
                  {runsUsed} of {limit} runs used this month
                </p>
              )}

              <LockedFeature requiredPlan="Pro" feature="Competitor research">
                <button
                  onClick={() => void onAnalyze()}
                  disabled={isAnalyzing || postText.trim().length < 50}
                  className="cursor-pointer rounded-xl bg-teal px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-teal-600 disabled:opacity-50"
                >
                  {isAnalyzing ? "Analyzing..." : "Analyze post"}
                </button>
              </LockedFeature>

              {status && (
                <p className={`text-xs font-medium ${status.type === "error" ? "text-red-600" : status.type === "success" ? "text-emerald-600" : "text-zinc-500"}`}>
                  {status.text}
                </p>
              )}
            </div>
          </section>

          {/* Results panel */}
          <LockedFeature requiredPlan="Pro" feature="Competitor research">
            <AnalysisPanel
              analysis={analysis ?? (canUse ? null : blurredAnalysis)}
              onApply={onApplyToPost}
            />
          </LockedFeature>
        </div>

        {/* History sidebar */}
        <aside className="space-y-4">
          <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
            <div className="border-b border-zinc-100 bg-zinc-50/60 px-4 py-3.5">
              <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-500">Recent Analyses</h2>
              {canUse && (
                <p className="mt-0.5 text-[11px] text-zinc-400">Last 5 analyses</p>
              )}
            </div>

            {!canUse ? (
              <div className="p-4">
                <p className="text-xs text-zinc-400">Upgrade to Pro to see analysis history.</p>
              </div>
            ) : !historyLoaded ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3].map((i) => <div key={i} className="h-12 animate-pulse rounded-xl bg-zinc-100" />)}
              </div>
            ) : history.length === 0 ? (
              <div className="p-4">
                <p className="text-xs text-zinc-400">No analyses yet. Paste a post to get started.</p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-100">
                {history.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => loadFromHistory(item)}
                    className="w-full cursor-pointer px-4 py-3 text-left transition-colors hover:bg-zinc-50"
                  >
                    <p className="line-clamp-2 text-xs font-medium text-zinc-800">
                      {item.post_text.slice(0, 80)}...
                    </p>
                    <div className="mt-1.5 flex items-center gap-2">
                      <span className="text-[11px] font-semibold text-teal">{item.hook_structure?.pattern || "Analyzed"}</span>
                      <span className="text-[11px] text-zinc-400">{formatDate(item.created_at)}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {canUse && (
            <div className="rounded-2xl border border-zinc-200 bg-white p-4">
              <p className="text-[11px] font-bold uppercase tracking-wide text-zinc-400">Monthly usage</p>
              <div className="mt-2 h-2 rounded-full bg-zinc-100">
                <div
                  className="h-full rounded-full bg-teal transition-all"
                  style={{ width: `${Math.min(100, (runsUsed / limit) * 100)}%` }}
                />
              </div>
              <p className="mt-1.5 text-xs text-zinc-500">
                {runsUsed} of {limit} runs used
              </p>
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}

function AnalysisPanel({ analysis, onApply }: { analysis: Analysis | null; onApply: () => void }) {
  if (!analysis) {
    return (
      <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-100 bg-zinc-50/60 px-5 py-3.5">
          <h2 className="text-sm font-bold text-zinc-900">Analysis Results</h2>
        </div>
        <div className="p-5 space-y-4">
          {["Hook structure", "Engagement factors", "Content pattern", "Improvement suggestions"].map((label) => (
            <div key={label}>
              <p className="text-[11px] font-bold uppercase tracking-wide text-zinc-300">{label}</p>
              <div className="mt-1.5 space-y-1.5">
                <div className="h-3 w-3/4 rounded-full bg-zinc-100" />
                <div className="h-3 w-1/2 rounded-full bg-zinc-100" />
              </div>
            </div>
          ))}
          <p className="text-xs text-zinc-400">Paste a post and click Analyze to see results.</p>
        </div>
      </section>
    )
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-zinc-100 bg-zinc-50/60 px-5 py-3.5">
        <h2 className="text-sm font-bold text-zinc-900">Analysis Results</h2>
        <button
          onClick={onApply}
          className="cursor-pointer rounded-lg border border-teal/25 bg-teal/8 px-3 py-1.5 text-xs font-bold text-teal transition-colors hover:bg-teal/15"
        >
          Apply to my post
        </button>
      </div>

      <div className="divide-y divide-zinc-100">

        {/* Hook structure */}
        <div className="px-5 py-4">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-zinc-400">Hook structure</p>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-semibold text-zinc-700">
              Pattern: {analysis.hookStructure.pattern}
            </span>
            <span className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-semibold text-zinc-700 capitalize">
              Length: {analysis.hookStructure.length}
            </span>
            <span className="rounded-full border border-teal/20 bg-teal/5 px-3 py-1 text-xs font-semibold text-teal">
              Type: {analysis.hookStructure.type}
            </span>
          </div>
        </div>

        {/* Engagement factors */}
        <div className="px-5 py-4">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-zinc-400">Engagement factors</p>
          <ul className="space-y-2">
            {analysis.engagementFactors.map((factor, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-zinc-700">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-teal" />
                {factor}
              </li>
            ))}
          </ul>
        </div>

        {/* Content pattern */}
        <div className="px-5 py-4">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-zinc-400">Content pattern</p>
          <dl className="space-y-2">
            <div>
              <dt className="text-xs font-semibold text-zinc-500">Framework</dt>
              <dd className="text-sm text-zinc-800">{analysis.contentPattern.framework}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-zinc-500">Structure</dt>
              <dd className="text-sm text-zinc-800">{analysis.contentPattern.structure}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-zinc-500">Read time</dt>
              <dd className="text-sm text-zinc-800">{analysis.contentPattern.estimatedReadTime}</dd>
            </div>
          </dl>
        </div>

        {/* Improvements */}
        <div className="px-5 py-4">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-zinc-400">Improvement suggestions</p>
          <ol className="space-y-2">
            {analysis.improvements.map((tip, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-zinc-700">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-[11px] font-bold text-white">
                  {i + 1}
                </span>
                {tip}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  )
}
