"use client"

import { useState } from "react"
import { useWorkspace } from "@/components/providers/WorkspaceProvider"
import { hasFeatureAccess, type PlanTier } from "@/lib/entitlements"
import { UpgradeModal } from "@/components/UpgradeModal"

type LockedFeatureProps = {
  feature: string
  requiredPlan: PlanTier
  children: React.ReactNode
  className?: string
  buttonClassName?: string
  tooltip?: string
}

export function LockedFeature({ feature, requiredPlan, children, className = "", buttonClassName = "", tooltip }: LockedFeatureProps) {
  const { billing } = useWorkspace()
  const [showUpgrade, setShowUpgrade] = useState(false)
  if (hasFeatureAccess(billing.plan, requiredPlan, feature, billing.featureFlags)) return <>{children}</>

  return (
    <>
      <div className={`relative overflow-hidden rounded-xl ${className}`} title={tooltip}>
        <div className="pointer-events-none select-none opacity-45 blur-[2px]">{children}</div>
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/75 px-3 text-center backdrop-blur-[1px]">
          <button
            onClick={() => setShowUpgrade(true)}
            className={`rounded-lg bg-teal px-3 py-1.5 text-xs font-bold text-white shadow-sm transition-colors hover:bg-teal-600 ${buttonClassName}`}
            title={tooltip}
          >
            Unlock in {requiredPlan}
          </button>
        </div>
      </div>
      {showUpgrade ? (
        <UpgradeModal currentPlan={billing.plan} requiredPlan={requiredPlan} reason={`${feature.toLowerCase()} locked`} onClose={() => setShowUpgrade(false)} />
      ) : null}
    </>
  )
}
