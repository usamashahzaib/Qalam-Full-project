"use client"

import Link from "next/link"
import { PLAN_FEATURES, PLAN_PRICES, formatPkr } from "@/lib/pricing"
import type { PlanTier } from "@/lib/entitlements"

type UpgradeModalProps = {
  currentPlan: string
  requiredPlan: PlanTier
  reason: string
  usageLabel?: string
  onClose: () => void
}

const unlocksFor = (plan: PlanTier) => {
  if (plan === "Solo") return ["25 drafts", "scheduling", "1 voice profile", "analytics"]
  const key = plan.startsWith("Agency") ? "Agency" : plan
  return (PLAN_FEATURES[key] || []).slice(0, 4)
}

export function UpgradeModal({ currentPlan, requiredPlan, reason, usageLabel, onClose }: UpgradeModalProps) {
  const priceKey = requiredPlan.startsWith("Agency") ? "Agency" : requiredPlan
  const price = PLAN_PRICES[priceKey]?.monthly ?? 0
  const planParam = encodeURIComponent(requiredPlan)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/45 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-6 text-center shadow-xl">
        <h2 className="text-lg font-bold text-zinc-900">
          You&apos;re on {currentPlan} ({usageLabel || reason})
        </h2>
        <p className="mt-2 text-sm font-semibold text-zinc-700">Upgrade to {requiredPlan} for {formatPkr(price)}/mo</p>
        <div className="mt-4 rounded-2xl border border-zinc-100 bg-zinc-50 p-4 text-left">
          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Unlocks</p>
          <ul className="mt-2 space-y-1.5">
            {unlocksFor(requiredPlan).map((item) => (
              <li key={item} className="flex items-center gap-2 text-sm text-zinc-700">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-teal" />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div className="mt-5 flex justify-center gap-2">
          <button onClick={onClose} className="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50">Close</button>
          <Link href={`/pricing?plan=${planParam}`} className="rounded-xl bg-teal px-4 py-2 text-sm font-bold text-white hover:bg-teal-600">Continue to pricing</Link>
        </div>
      </div>
    </div>
  )
}
