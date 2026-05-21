"use client"

import Link from "next/link"
import { useWorkspace } from "@/components/providers/WorkspaceProvider"
import { canAccessPlan, getPlanSummary, type PlanTier } from "@/lib/entitlements"

interface PlanGateProps {
  requiredPlan: PlanTier
  feature: string
  description?: string
  children: React.ReactNode
}

function LockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
    </svg>
  )
}

function LockedState({ requiredPlan, feature, description, currentPlan }: { requiredPlan: PlanTier; feature: string; description?: string; currentPlan: string }) {
  const planFeatures = getPlanSummary(requiredPlan)

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <LockIcon className="h-7 w-7 text-zinc-400" />
      </div>

      <h2 className="text-xl font-bold text-zinc-900">{feature}</h2>
      <p className="mt-2 text-sm text-zinc-500">
        {description || `This feature requires the `}
        <span className="font-semibold text-teal">{requiredPlan}</span> plan or higher.
      </p>

      <div className="mt-6 w-full rounded-2xl border border-zinc-100 bg-white p-5 text-left shadow-sm">
        <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
          Included with {requiredPlan}
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
        <Link
          href="/settings"
          className="inline-flex items-center gap-2 rounded-xl bg-teal px-6 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-teal-600"
        >
          Upgrade to {requiredPlan}
        </Link>
        <Link href="/pricing" className="text-xs font-semibold text-zinc-500 hover:text-zinc-700 hover:underline">
          Compare all plans
        </Link>
      </div>
    </div>
  )
}

export function PlanGate({ requiredPlan, feature, description, children }: PlanGateProps) {
  const { billing } = useWorkspace()
  if (canAccessPlan(billing.plan, requiredPlan)) return <>{children}</>
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
  const { billing } = useWorkspace()
  return canAccessPlan(billing.plan, requiredPlan)
}

export { LockIcon }
