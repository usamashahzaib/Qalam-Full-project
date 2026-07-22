"use client"

import { createContext, useCallback, useContext, useEffect, useState } from "react"
import type { PlanLimits } from "@/lib/entitlements"
import type { PlanName } from "@/lib/pricing"

export type WorkspaceBilling = {
  plan: PlanName
  billingCycle: "monthly" | "annual"
  checkoutReady: boolean
  overrideActive?: boolean
  complimentaryTrialBanner?: boolean
  overridePlan?: string | null
  planExpired?: boolean
  limits?: PlanLimits
  featureFlags?: Record<string, boolean>
}

type BillingContextValue = {
  billing: WorkspaceBilling
  saveBilling: (input: Partial<WorkspaceBilling>) => void
  /**
   * Re-reads the plan from the server. Called after a Lemon Squeezy checkout
   * completes so the unlocked plan shows up without a hard reload.
   */
  refresh: () => Promise<void>
}

const BillingContext = createContext<BillingContextValue | null>(null)

const defaultBilling: WorkspaceBilling = {
  plan: "Free",
  billingCycle: "monthly",
  checkoutReady: false,
}

export function BillingProvider({
  children,
  serverBilling,
  onRefresh,
}: {
  children: React.ReactNode
  serverBilling: Partial<WorkspaceBilling> | null
  onRefresh?: () => Promise<void>
}) {
  const [billing, setBilling] = useState<WorkspaceBilling>(() => ({
    ...defaultBilling,
    ...(serverBilling ?? {}),
  }))

  useEffect(() => {
    if (!serverBilling?.plan) return
    setBilling((prev) => ({ ...prev, ...serverBilling }))
  }, [serverBilling])

  const saveBilling = useCallback((input: Partial<WorkspaceBilling>) => {
    setBilling((prev) => ({ ...prev, ...input }))
  }, [])

  const refresh = useCallback(async () => {
    if (!onRefresh) return
    await onRefresh()
  }, [onRefresh])

  return <BillingContext.Provider value={{ billing, saveBilling, refresh }}>{children}</BillingContext.Provider>
}

export function useBilling(): BillingContextValue {
  const ctx = useContext(BillingContext)
  if (!ctx) throw new Error("useBilling must be used within BillingProvider")
  return ctx
}
