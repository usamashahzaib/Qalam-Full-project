"use client"

import { useWorkspace } from "@/components/providers/WorkspaceProvider"
import { canAccessPlan, getEffectivePlanLimits } from "@/lib/entitlements"
import type { PlanTier, PlanLimits } from "@/lib/entitlements"

export type UsePlanReturn = {
  plan: string
  limits: PlanLimits
  isLoading: boolean
  canAccess: (requiredPlan: PlanTier) => boolean
}

export const usePlan = (): UsePlanReturn => {
  const { state } = useWorkspace()
  const plan = state.billing?.plan ?? "Free"
  const isLoading = !state.billing?.plan

  return {
    plan,
    limits: getEffectivePlanLimits(plan, state.billing?.limits),
    isLoading,
    canAccess: (requiredPlan: PlanTier) => canAccessPlan(plan, requiredPlan),
  }
}
