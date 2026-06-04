"use client"

import Link from "next/link"
import { useWorkspace } from "@/components/providers/WorkspaceProvider"
import { LockIcon } from "@/components/PlanGate"
import { canAccessPlan, type PlanTier } from "@/lib/entitlements"

type LockedFeatureProps = {
  feature: string
  requiredPlan: PlanTier
  children: React.ReactNode
  className?: string
}

export function LockedFeature({ feature, requiredPlan, children, className = "" }: LockedFeatureProps) {
  const { billing } = useWorkspace()
  if (canAccessPlan(billing.plan, requiredPlan)) return <>{children}</>

  return (
    <div className={`relative overflow-hidden rounded-xl ${className}`}>
      <div className="pointer-events-none select-none opacity-45 blur-[2px]">{children}</div>
      <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/75 px-3 text-center backdrop-blur-[1px]">
        <div className="rounded-xl border border-zinc-200 bg-white px-4 py-3 shadow-sm">
          <div className="mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-zinc-100">
            <LockIcon className="h-4 w-4 text-zinc-500" />
          </div>
          <p className="text-xs font-bold text-zinc-900">Unlock {feature} in {requiredPlan}</p>
          <Link href="/settings" className="mt-2 inline-flex rounded-lg bg-teal px-3 py-1.5 text-xs font-bold text-white hover:bg-teal-600">
            Upgrade
          </Link>
        </div>
      </div>
    </div>
  )
}
