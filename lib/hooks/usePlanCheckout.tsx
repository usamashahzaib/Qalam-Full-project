"use client"

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { useBilling } from "@/lib/hooks/useBilling"
import { getLemonSqueezyCheckoutUrl, LEMONSQUEEZY_CHECKOUT_URLS, type BillingCycle, type PlanName } from "@/lib/pricing"

const LEMON_JS_SRC = "https://app.lemonsqueezy.com/js/lemon.js"

/** How long to wait for the webhook to land before telling the user to check back. */
const ACTIVATION_TIMEOUT_MS = 45_000
const ACTIVATION_POLL_MS = 2_000

type LemonSqueezyEvent = { event?: string }

declare global {
  interface Window {
    createLemonSqueezy?: () => void
    LemonSqueezy?: {
      Setup: (options: { eventHandler: (event: LemonSqueezyEvent) => void }) => void
      Url: { Open: (url: string) => void; Close: () => void }
      Refresh: () => void
    }
  }
}

export type CheckoutPhase =
  | "idle"
  /** Minting a fresh checkout token and resolving the URL. */
  | "preparing"
  /** Overlay is open, waiting on the buyer. */
  | "open"
  /** Payment succeeded, waiting for the webhook to flip the plan. */
  | "activating"
  /** Plan confirmed live on the server. */
  | "activated"
  /** Payment succeeded but the plan had not flipped before the timeout. */
  | "slow"
  | "error"

export type CheckoutState = {
  phase: CheckoutPhase
  targetPlan: PlanName | null
  message: string | null
}

type PlanCheckoutContextValue = {
  state: CheckoutState
  /** True when a live Lemon Squeezy link exists for this plan. */
  isSelfServe: (plan: string) => boolean
  openCheckout: (plan: PlanName, cycle: BillingCycle) => Promise<void>
  /**
   * Starts the post-payment activation poll directly. Used by the redirect
   * fallback landing page, which arrives after payment with no overlay event.
   */
  awaitActivation: (plan: PlanName | null) => void
  dismiss: () => void
}

const PlanCheckoutContext = createContext<PlanCheckoutContextValue | null>(null)

const IDLE: CheckoutState = { phase: "idle", targetPlan: null, message: null }

export const isSelfServePlan = (plan: string): boolean =>
  Boolean(LEMONSQUEEZY_CHECKOUT_URLS[plan as PlanName])

let lemonJsPromise: Promise<boolean> | null = null

/**
 * Loads lemon.js once per page. Resolves false when the script cannot load
 * (offline, blocked by an extension, CSP), which is the signal to fall back to
 * a full-page redirect checkout rather than silently doing nothing.
 */
function loadLemonJs(): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false)
  if (window.LemonSqueezy) return Promise.resolve(true)
  if (lemonJsPromise) return lemonJsPromise

  lemonJsPromise = new Promise<boolean>((resolve) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${LEMON_JS_SRC}"]`)
    const script = existing ?? document.createElement("script")
    const onLoad = () => {
      try {
        window.createLemonSqueezy?.()
        resolve(Boolean(window.LemonSqueezy))
      } catch {
        resolve(false)
      }
    }
    script.addEventListener("load", onLoad, { once: true })
    script.addEventListener("error", () => resolve(false), { once: true })
    if (!existing) {
      script.src = LEMON_JS_SRC
      script.defer = true
      document.head.appendChild(script)
    }
  })
  // A failed load must not be cached forever - let the next attempt retry.
  lemonJsPromise.then((ok) => {
    if (!ok) lemonJsPromise = null
  })
  return lemonJsPromise
}

const normalize = (plan: string | null | undefined) =>
  (plan || "").trim().toLowerCase()

export function PlanCheckoutProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { refresh } = useBilling()
  const [state, setState] = useState<CheckoutState>(IDLE)
  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const targetPlanRef = useRef<PlanName | null>(null)

  const clearPoll = useCallback(() => {
    if (pollTimer.current) {
      clearTimeout(pollTimer.current)
      pollTimer.current = null
    }
  }, [])

  useEffect(() => () => clearPoll(), [clearPoll])

  /**
   * Polls the account's own plan until it matches what was just paid for. The
   * webhook is the only thing that grants the plan - this never grants anything
   * client-side, it just waits for the server to catch up and then re-reads it.
   */
  const waitForActivation = useCallback(
    (plan: PlanName | null) => {
      clearPoll()
      const deadline = Date.now() + ACTIVATION_TIMEOUT_MS
      // A null target means "we know a payment happened but not for which plan" (the
      // redirect fallback landing without a plan hint). Settling on any non-Free plan
      // is correct there, and avoids confidently naming the wrong plan.
      const isSettled = (live: string) =>
        plan ? normalize(live) === normalize(plan) : normalize(live) !== "free"

      const tick = async () => {
        let livePlan: string | null = null
        try {
          const res = await fetch("/api/auth/me", { cache: "no-store" })
          if (res.ok) {
            const data = await res.json()
            livePlan = data?.user?.plan ?? null
          }
        } catch {
          // Network blip - keep polling until the deadline.
        }

        if (livePlan && isSettled(livePlan)) {
          clearPoll()
          await refresh().catch(() => {})
          router.refresh()
          // Report the plan the server actually granted, not the one we hoped for.
          const granted = (livePlan.charAt(0).toUpperCase() + livePlan.slice(1).toLowerCase()) as PlanName
          setState({ phase: "activated", targetPlan: granted, message: null })
          return
        }

        if (Date.now() >= deadline) {
          clearPoll()
          setState({
            phase: "slow",
            targetPlan: plan,
            message:
              "Your payment went through. Activation is still processing - this usually clears within a minute. Reload this page or check Settings.",
          })
          return
        }

        pollTimer.current = setTimeout(tick, ACTIVATION_POLL_MS)
      }

      setState({ phase: "activating", targetPlan: plan, message: null })
      pollTimer.current = setTimeout(tick, ACTIVATION_POLL_MS)
    },
    [clearPoll, refresh, router]
  )

  const openCheckout = useCallback(
    async (plan: PlanName, cycle: BillingCycle) => {
      if (!isSelfServePlan(plan)) {
        setState({
          phase: "error",
          targetPlan: plan,
          message: "Self-serve checkout is not available for this plan yet.",
        })
        return
      }

      targetPlanRef.current = plan
      setState({ phase: "preparing", targetPlan: plan, message: null })

      // The checkout token expires 30 minutes after minting, so it is minted HERE,
      // at click time, not at page load. A page left open past the TTL would
      // otherwise send an expired token and the webhook could not attribute the
      // payment to this account, orphaning a real charge.
      let token: string | null = null
      let email: string | null = null
      try {
        const [tokenRes, meRes] = await Promise.all([
          fetch("/api/billing/checkout-token", { cache: "no-store" }),
          fetch("/api/auth/me", { cache: "no-store" }),
        ])
        if (tokenRes.ok) token = (await tokenRes.json())?.token ?? null
        if (meRes.ok) email = (await meRes.json())?.user?.email ?? null
      } catch {
        // Handled by the null-token guard below.
      }

      if (!token) {
        setState({
          phase: "error",
          targetPlan: plan,
          message:
            "Could not start a secure checkout session. Reload the page and try again - do not pay until this works, or the payment cannot be matched to your account.",
        })
        return
      }

      const baseUrl = getLemonSqueezyCheckoutUrl(plan, cycle, { email, checkoutToken: token })
      if (!baseUrl) {
        setState({ phase: "error", targetPlan: plan, message: "Checkout link unavailable." })
        return
      }

      const ready = await loadLemonJs()
      if (!ready || !window.LemonSqueezy) {
        // Overlay unavailable (script blocked, offline, CSP) - fall back to the hosted
        // checkout page. The post-purchase redirect is NOT settable as a query param on
        // a hosted buy link, so it comes from the product's own "Redirect to URL after
        // purchase" setting in the Lemon Squeezy dashboard, which must point at
        // /billing/success for the buyer to land back in the app. If it is unset the
        // buyer stops on Lemon Squeezy's thank-you page; the webhook still activates the
        // plan, so this degrades the return trip, never the payment.
        window.location.href = baseUrl
        return
      }

      const overlayUrl = new URL(baseUrl)
      overlayUrl.searchParams.set("embed", "1")
      setState({ phase: "open", targetPlan: plan, message: null })
      window.LemonSqueezy.Url.Open(overlayUrl.toString())
    },
    []
  )

  // A single Setup call owns the event handler for the whole app. Checkout.Success
  // means Lemon Squeezy took the payment; it does NOT mean the plan is live, so it
  // only starts the poll.
  useEffect(() => {
    let cancelled = false
    loadLemonJs().then((ready) => {
      if (cancelled || !ready || !window.LemonSqueezy) return
      window.LemonSqueezy.Setup({
        eventHandler: (event) => {
          if (event?.event === "Checkout.Success") {
            const plan = targetPlanRef.current
            if (plan) waitForActivation(plan)
          }
        },
      })
    })
    return () => {
      cancelled = true
    }
  }, [waitForActivation])

  const dismiss = useCallback(() => {
    clearPoll()
    targetPlanRef.current = null
    setState(IDLE)
  }, [clearPoll])

  return (
    <PlanCheckoutContext.Provider
      value={{ state, isSelfServe: isSelfServePlan, openCheckout, awaitActivation: waitForActivation, dismiss }}
    >
      {children}
    </PlanCheckoutContext.Provider>
  )
}

export function usePlanCheckout(): PlanCheckoutContextValue {
  const ctx = useContext(PlanCheckoutContext)
  if (!ctx) throw new Error("usePlanCheckout must be used within PlanCheckoutProvider")
  return ctx
}
