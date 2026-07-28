"use client"

import Link from "next/link"
import { useState } from "react"
import { useBilling } from "@/lib/hooks/useBilling"
import { canAccessPlan, getPlanSummary, getUpgradeTarget, hasFeatureAccess, type PlanTier } from "@/lib/entitlements"
import { UpgradeModal } from "@/components/UpgradeModal"

interface PlanGateProps {
  requiredPlan: PlanTier
  feature: string
  description?: string
  children: React.ReactNode
}

function LockedState({ requiredPlan, feature, description, currentPlan }: { requiredPlan: PlanTier; feature: string; description?: string; currentPlan: string }) {
  const upgradeTarget = getUpgradeTarget(currentPlan, requiredPlan)
  const planFeatures = upgradeTarget ? getPlanSummary(upgradeTarget) : []
  const [showUpgrade, setShowUpgrade] = useState(false)

  if (!upgradeTarget) return null

  return (
    <>
      <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-6 py-16 text-center">
        <h2 className="text-xl font-bold text-zinc-900">{feature}</h2>
        <p className="mt-2 text-sm text-zinc-500">
          {description || "Move to the next plan to unlock more Qalam features."}
        </p>

        <div className="mt-6 w-full rounded-2xl border border-zinc-100 bg-white p-5 text-left shadow-sm">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
            Included with {upgradeTarget}
          </p>
          <ul className="space-y-2">
            {planFeatures.map((item) => (
              <li key={item} className="flex items-center gap-2 text-sm text-zinc-700">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-teal" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-4 flex items-center gap-2 text-xs text-zinc-400">
          <span>Current plan:</span>
          <span className="rounded-full border border-zinc-200 bg-zinc-100 px-2.5 py-0.5 font-semibold text-zinc-600">
            {currentPlan}
          </span>
        </div>

        <div className="mt-6 flex flex-col items-center gap-3">
          <button onClick={() => setShowUpgrade(true)} className="rounded-xl bg-teal px-6 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-teal-600">
            Upgrade to {upgradeTarget}
          </button>
          <Link href={`/upgrade?plan=${encodeURIComponent(upgradeTarget)}`} className="text-xs font-semibold text-zinc-500 hover:text-zinc-700 hover:underline">
            Compare all plans
          </Link>
        </div>
      </div>
      {showUpgrade ? <UpgradeModal currentPlan={currentPlan} requiredPlan={upgradeTarget} reason={`${feature.toLowerCase()} locked`} onClose={() => setShowUpgrade(false)} /> : null}
    </>
  )
}

export function PlanGate({ requiredPlan, feature, description, children }: PlanGateProps) {
  const { billing } = useBilling()
  if (hasFeatureAccess(billing.plan, requiredPlan, feature, billing.featureFlags)) return <>{children}</>
  return (
    <LockedState
      requiredPlan={requiredPlan}
      feature={feature}
      description={description}
      currentPlan={billing.plan}
    />
  )
}

export function usePlanAccess(requiredPlan: PlanTier) {
  const { billing } = useBilling()
  return canAccessPlan(billing.plan, requiredPlan)
}
