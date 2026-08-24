"use client"

import { scoreBarColor, scoreTextColor } from "@/lib/hooks/useWriterLogic"
import { SCORE_LABELS } from "@/components/writer/writer-config"

type Scores = {
  overall: number
  tips: Record<string, string>
} & Record<string, unknown>

interface WriterScorePanelProps {
  scores: Scores | null
  isScoring: boolean
  step3Visible: boolean
  canUseProTools: boolean
  isImproving: boolean
  isGeneratingAlts: boolean
  isGeneratingCtaAlts: boolean
  draftContent: string
  draftLimitHit: boolean
  hookAltOpen: boolean
  ctaAltOpen: boolean
  ctaAlts: string[]
  onPushTo90: () => void | Promise<void>
  onImproveHook: () => void | Promise<void>
  onRewriteCta: () => void | Promise<void>
  applyCtaAlt: (alt: string) => void
  setCtaAltOpen: (open: boolean) => void
  setUpgradeProModal: (open: boolean) => void
}

export function WriterScorePanel({
  scores, isScoring, step3Visible, canUseProTools,
  isImproving, isGeneratingAlts, isGeneratingCtaAlts,
  draftContent, draftLimitHit,
  hookAltOpen, ctaAltOpen, ctaAlts,
  onPushTo90, onImproveHook, onRewriteCta, applyCtaAlt,
  setCtaAltOpen, setUpgradeProModal,
}: WriterScorePanelProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
      <div className="border-b border-zinc-100 bg-zinc-50/60 px-4 py-3.5">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-500">Content Score</h2>
          {isScoring && <span className="animate-pulse text-[11px] font-semibold text-teal">Scoring...</span>}
        </div>
        {scores ? (
          <div className="mt-2 flex items-baseline gap-1">
            <span className={`text-4xl font-bold tabular-nums ${scoreTextColor(scores.overall)}`}>{scores.overall}</span>
            <span className="text-sm text-zinc-400">/100</span>
            {scores.overall >= 85 && <span className="ml-1 text-[11px] font-bold text-emerald-600">Copy-ready</span>}
          </div>
        ) : (
          <p className="mt-1 text-xs text-zinc-400">{step3Visible ? "Scoring..." : "Generate a draft to see scores"}</p>
        )}
      </div>

      {scores ? (
        <div className="divide-y divide-zinc-100">
          {SCORE_LABELS.map(({ key, label }) => {
            const v = scores[key] as number
            const tip = scores.tips[key] || ""
            return (
              <div key={key} className="px-4 py-3">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wide text-zinc-500">{label}</span>
                  <span className={`text-sm font-bold tabular-nums ${scoreTextColor(v)}`}>{v}</span>
                </div>
                <div className="h-1.5 rounded-full bg-zinc-100">
                  <div className={`h-full rounded-full transition-all duration-500 ${scoreBarColor(v)}`} style={{ width: `${v}%` }} />
                </div>
                {tip && <p className="mt-1 text-[11px] leading-snug text-zinc-400">{tip}</p>}
              </div>
            )
          })}
        </div>
      ) : (
        <div className="space-y-2 p-4">
          {SCORE_LABELS.map(({ label }) => (
            <div key={label} className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wide text-zinc-300">{label}</span>
              <div className="h-1.5 flex-1 rounded-full bg-zinc-100" />
              <span className="text-sm font-bold text-zinc-200">--</span>
            </div>
          ))}
        </div>
      )}

      {scores && (
        <div className="border-t border-zinc-100 p-4 space-y-2">
          {scores.overall >= 90 ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-center">
              <p className="text-sm font-bold text-emerald-700">90+ Score Achieved</p>
              <p className="mt-0.5 text-xs text-emerald-600">This post is ready to publish. Top 5% of LinkedIn content.</p>
            </div>
          ) : canUseProTools ? (
            <button
              onClick={() => void onPushTo90()}
              disabled={isImproving || !draftContent.trim() || draftLimitHit}
              className="w-full cursor-pointer rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs font-bold text-amber-800 transition-colors hover:bg-amber-100 disabled:opacity-45"
            >
              {isImproving ? "Improving..." : draftLimitHit ? "Upgrade for more drafts" : `Push to 90+ · currently ${scores.overall} (uses 1 draft)`}
            </button>
          ) : (
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3">
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Push to 90+ · Pro only</span>
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-bold text-amber-700">locked</span>
              </div>
              <p className="text-xs text-zinc-500 mb-2">Qalam rewrites your draft to fix the lowest-scoring dimension and targets a 90+ overall score - hook sharpness, authority, specificity, and CTA all lifted in one pass.</p>
              <div className="rounded-lg border border-zinc-100 bg-white px-3 py-2 mb-2">
                <p className="text-[11px] font-bold uppercase tracking-wide text-zinc-400 mb-1">What changes at 90+</p>
                <ul className="space-y-0.5 text-[11px] text-zinc-600">
                  <li className="flex items-start gap-1.5"><span className="mt-0.5 h-1 w-1 shrink-0 rounded-full bg-amber-400" />Hook rewritten to stop the scroll in the first 2 words</li>
                  <li className="flex items-start gap-1.5"><span className="mt-0.5 h-1 w-1 shrink-0 rounded-full bg-amber-400" />Specific numbers and outcomes added where generic now</li>
                  <li className="flex items-start gap-1.5"><span className="mt-0.5 h-1 w-1 shrink-0 rounded-full bg-amber-400" />CTA tightened to a single clear action</li>
                </ul>
              </div>
              <button
                onClick={() => setUpgradeProModal(true)}
                className="w-full cursor-pointer rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-amber-700"
              >
                Choose Pro to push your {scores.overall} to 90+
              </button>
            </div>
          )}
          <button
            onClick={() => void onImproveHook()}
            disabled={!draftContent.trim() || isGeneratingAlts}
            className="w-full cursor-pointer rounded-xl border border-teal/25 bg-teal/8 px-4 py-2.5 text-xs font-bold text-teal transition-colors hover:bg-teal/15 disabled:opacity-45"
          >
            {isGeneratingAlts ? "..." : hookAltOpen ? "Close hook panel" : "Improve hook"}
          </button>
          <button
            onClick={() => void onRewriteCta()}
            disabled={!draftContent.trim() || isGeneratingCtaAlts || draftLimitHit}
            className="w-full cursor-pointer rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-xs font-bold text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-45"
          >
            {isGeneratingCtaAlts ? "..." : ctaAltOpen ? "Close CTA panel" : "Rewrite CTA (1 draft)"}
          </button>
          <div className={`overflow-hidden transition-all duration-200 ${ctaAltOpen ? "max-h-[320px] opacity-100" : "max-h-0 opacity-0"}`}>
            <div className="rounded-xl border border-zinc-200 bg-zinc-50/60">
              <div className="flex items-center justify-between border-b border-zinc-100 px-3 py-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">3 CTA options</span>
                <button
                  onClick={() => setCtaAltOpen(false)}
                  className="cursor-pointer text-[11px] font-bold text-zinc-400 transition-colors hover:text-zinc-600"
                >
                  Close
                </button>
              </div>
              {isGeneratingCtaAlts ? (
                <div className="p-3 text-xs text-zinc-500">Generating alternatives...</div>
              ) : ctaAlts.length ? (
                ctaAlts.map((alt, i) => (
                  <div key={i} className="flex items-start gap-2 border-b border-zinc-100 px-3 py-2.5 last:border-b-0">
                    <p className="flex-1 text-xs leading-relaxed text-zinc-700">{alt}</p>
                    <button
                      onClick={() => applyCtaAlt(alt)}
                      className="shrink-0 cursor-pointer rounded-lg bg-teal px-2.5 py-1 text-[11px] font-bold text-white transition-colors hover:bg-teal-600"
                    >
                      Use
                    </button>
                  </div>
                ))
              ) : (
                <p className="p-3 text-xs text-zinc-400">No alternatives yet.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
