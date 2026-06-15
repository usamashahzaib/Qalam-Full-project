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
}: {
  children: React.ReactNode
  serverBilling: Partial<WorkspaceBilling> | null
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

  return <BillingContext.Provider value={{ billing, saveBilling }}>{children}</BillingContext.Provider>
}

export function useBilling(): BillingContextValue {
  const ctx = useContext(BillingContext)
  if (!ctx) throw new Error("useBilling must be used within BillingProvider")
  return ctx
}
