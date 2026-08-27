"use client"

import { useEffect, useRef } from "react"
import { useSearchParams } from "next/navigation"
import { usePlanCheckout } from "@/lib/hooks/usePlanCheckout"
import type { PlanName } from "@/lib/pricing"
import { trackMarketingEvent } from "@/lib/marketing-events"

const isValidPlan = (value: string | null): value is PlanName =>
  value === "Solo" || value === "Pro" || value === "Agency"

/**
 * Landing page for the redirect checkout fallback (used when lemon.js could not
 * load, so the buyer left the app for the hosted Lemon Squeezy page). The overlay
 * path never reaches here. It runs the same activation poll, and
 * CheckoutStatusOverlay renders the result.
 */
export default function BillingSuccessPage() {
  const searchParams = useSearchParams()
  const { awaitActivation, state } = usePlanCheckout()
  const started = useRef(false)
  const conversionTracked = useRef(false)

  // The Lemon Squeezy redirect does not necessarily carry a plan hint. Passing null
  // then means "wait for any paid plan" rather than guessing a specific one and
  // showing the buyer the wrong plan name.
  const planParam = searchParams.get("plan")
  const plan: PlanName | null = isValidPlan(planParam) ? planParam : null

  useEffect(() => {
    if (started.current) return
    started.current = true
    awaitActivation(plan)
  }, [awaitActivation, plan])

  useEffect(() => {
    if (state.phase !== "activated" || conversionTracked.current) return
    const confirmedPlan = state.targetPlan || plan
    if (confirmedPlan !== "Solo" && confirmedPlan !== "Pro" && confirmedPlan !== "Agency") return
    conversionTracked.current = true
    trackMarketingEvent("paid_conversion", { plan: confirmedPlan, confirmation: "server_confirmed" })
  }, [plan, state.phase, state.targetPlan])

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-6 text-center">
      <h1 className="text-xl font-bold text-zinc-950">Confirming your payment</h1>
      <p className="mt-2 text-sm leading-relaxed text-zinc-600">
        Hold on while we activate {plan ? plan : "your plan"} on your account.
      </p>
    </div>
  )
}
