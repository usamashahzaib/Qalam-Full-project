"use client"

import { useBilling } from "@/lib/hooks/useBilling"
import { canAccessPlan, getEffectivePlanLimits } from "@/lib/entitlements"
import type { PlanTier, PlanLimits } from "@/lib/entitlements"

export type UsePlanReturn = {
  plan: string
  limits: PlanLimits
  isLoading: boolean
  canAccess: (requiredPlan: PlanTier) => boolean
}

export const usePlan = (): UsePlanReturn => {
  const { billing } = useBilling()
  const plan = billing.plan ?? "Free"
  const isLoading = !billing.plan

  return {
    plan,
    limits: getEffectivePlanLimits(plan, billing.limits),
    isLoading,
    canAccess: (requiredPlan: PlanTier) => canAccessPlan(plan, requiredPlan),
  }
}
