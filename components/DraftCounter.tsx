"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useWorkspace } from "@/components/providers/WorkspaceProvider"
import { UpgradeModal } from "@/components/UpgradeModal"

export { getDraftUsageKey, readDraftUsage, incrementDraftUsage } from "@/lib/usage-tracking"

type DraftStatus = {
  remaining: number | null
  current: number
  limit: number | null
}

export function DraftCounter({ className = "", compact = false }: { className?: string; compact?: boolean }) {
  const { billing } = useWorkspace()
  const [status, setStatus] = useState<DraftStatus | null>(null)
  const [showUpgrade, setShowUpgrade] = useState(false)

  useEffect(() => {
    fetch("/api/generate")
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then((data) => {
        setStatus({
          remaining: data.remaining ?? null,
          current: data.current ?? 0,
          limit: data.limit ?? null,
        })
        if (typeof data.remaining === "number" && data.remaining === 0) setShowUpgrade(true)
      })
      .catch(() => { /* silent — skeleton stays */ })
  }, [])

  if (status === null) {
    return (
      <div className={`h-5 w-32 animate-pulse rounded bg-zinc-200 ${className}`} />
    )
  }

  const { remaining, current, limit } = status
  const pct = typeof limit === "number" && limit > 0 ? Math.min(100, Math.round((current / limit) * 100)) : 0
  const remainingPct = typeof limit === "number" && limit > 0 && remaining !== null ? Math.round((remaining / limit) * 100) : 100
  const tone = remainingPct < 20 ? "bg-red-500" : remainingPct <= 50 ? "bg-amber-400" : "bg-teal"

  if (limit === null) return null

  if (compact) {
    return (
      <>
        <div className={`flex items-center justify-end gap-2 text-right text-[11px] font-semibold ${remaining === 0 ? "text-red-600" : "text-zinc-500"} ${className}`}>
          <span>
            {remaining === 0 ? (
              <>
                0 drafts left. <Link href="/pricing" className="font-bold underline underline-offset-2">Upgrade to Solo for more.</Link>
              </>
            ) : (
              <>
                {`${current} / ${limit} drafts used`}
                {remaining !== null && remaining < 3 ? <Link href="/pricing" className="ml-1 font-bold underline underline-offset-2">Upgrade for more.</Link> : null}
              </>
            )}
          </span>
          <span className="h-1.5 w-16 overflow-hidden rounded-full bg-zinc-100">
            <span className={`block h-full rounded-full transition-all ${tone}`} style={{ width: `${pct}%` }} />
          </span>
        </div>

        {showUpgrade ? <UpgradeModal currentPlan={billing.plan} requiredPlan="Solo" usageLabel={`${current}/${limit} drafts used`} reason="draft limit reached" onClose={() => setShowUpgrade(false)} /> : null}
      </>
    )
  }

  return (
    <>
      <div className={`rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm ${className}`}>
        <div className="mb-2 flex items-center justify-between gap-3">
          <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">Draft usage</p>
          <p className="text-xs font-semibold text-zinc-700">{current} / {limit} drafts used</p>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-zinc-100">
          <div className={`h-full rounded-full transition-all ${tone}`} style={{ width: `${pct}%` }} />
        </div>
        {remaining !== null && remaining <= 2 ? (
          <p className={`mt-2 text-xs font-semibold ${remaining === 0 ? "text-red-600" : "text-amber-700"}`}>{remaining} left this month</p>
        ) : null}
      </div>

      {showUpgrade ? <UpgradeModal currentPlan={billing.plan} requiredPlan="Solo" usageLabel={`${current}/${limit} drafts used`} reason="draft limit reached" onClose={() => setShowUpgrade(false)} /> : null}
    </>
  )
}
