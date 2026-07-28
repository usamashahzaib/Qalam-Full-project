"use client"

import { useSearchParams } from "next/navigation"
import { useBilling } from "@/lib/hooks/useBilling"
import { usePlanCheckout } from "@/lib/hooks/usePlanCheckout"
import { PLAN_FEATURES, PLAN_PRICES, formatPkr, type BillingCycle, type PlanName } from "@/lib/pricing"
import { PLAN_HIERARCHY, type PlanTier } from "@/lib/entitlements"
import { UPGRADES_EMAIL, MANUAL_UPGRADE_METHODS, upgradesMailUrl } from "@/lib/contact"
import { CheckIcon } from "@/components/ui/qalam-icons"

const SELF_SERVE_PLANS: PlanName[] = ["Solo", "Pro"]

const isValidPlan = (value: string | null): value is PlanName =>
  value === "Solo" || value === "Pro"

export default function UpgradePage() {
  const searchParams = useSearchParams()
  const { billing } = useBilling()
  const { openCheckout, isSelfServe, state } = usePlanCheckout()

  const requestedPlan = isValidPlan(searchParams.get("plan")) ? (searchParams.get("plan") as PlanName) : null
  const cycle: BillingCycle = "quarterly"

  const currentRank = PLAN_HIERARCHY[billing.plan as PlanTier] ?? 0
  const preparingPlan = state.phase === "preparing" ? state.targetPlan : null

  return (
    <div className="mx-auto max-w-3xl px-5 py-10 sm:px-6">
      <header>
        <h1 className="text-2xl font-bold text-zinc-950">Upgrade your plan</h1>
        <p className="mt-2 text-sm leading-relaxed text-zinc-600">
          Pay by card and your plan unlocks straight away. You stay on this page the whole time.
        </p>
        <p className="mt-2 text-xs text-zinc-500">
          Current plan:{" "}
          <span className="rounded-full border border-zinc-200 bg-zinc-100 px-2.5 py-0.5 font-semibold text-zinc-700">
            {billing.plan}
          </span>
        </p>
      </header>

      <div className="mt-7 inline-flex rounded-lg bg-teal px-4 py-2 text-sm font-semibold text-white">Quarterly billing</div>

      {/* Plans */}
      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        {SELF_SERVE_PLANS.map((plan) => {
          const prices = PLAN_PRICES[plan] ?? { monthly: 0, quarterly: 0, annual: 0 }
          const rank = PLAN_HIERARCHY[plan as PlanTier] ?? 0
          const isCurrent = billing.plan === plan
          const isDowngrade = rank < currentRank
          const isBusy = preparingPlan === plan
          const checkoutReady = isSelfServe(plan)
          const highlighted = requestedPlan === plan || (!requestedPlan && plan === "Pro")

          return (
            <section
              key={plan}
              className={`flex flex-col rounded-2xl border bg-white p-6 shadow-sm ${
                highlighted ? "border-teal ring-1 ring-teal/30" : "border-zinc-200"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-base font-bold text-zinc-950">{plan}</h2>
                {isCurrent && (
                  <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
                    Current
                  </span>
                )}
              </div>

              <p className="mt-3 text-3xl font-extrabold tabular-nums text-zinc-950">
                {formatPkr(prices.monthly)}
                <span className="ml-1 text-sm font-normal text-zinc-500">/month</span>
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                {formatPkr(prices.quarterly)} billed quarterly. 1 month free.
              </p>

              <ul className="mt-4 flex flex-1 flex-col gap-2">
                {(PLAN_FEATURES[plan] || []).slice(0, 6).map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm text-zinc-700">
                    <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-teal" />
                    {feature}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => openCheckout(plan, cycle)}
                disabled={isCurrent || isDowngrade || isBusy || !checkoutReady}
                className="mt-5 cursor-pointer rounded-xl bg-teal px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-teal-600 disabled:cursor-not-allowed disabled:bg-zinc-200 disabled:text-zinc-500"
              >
                {isCurrent
                  ? "Your current plan"
                  : isDowngrade
                    ? "Included in your plan"
                    : !checkoutReady
                      ? "Pay via JazzCash, Easypaisa, or bank transfer"
                    : isBusy
                      ? "Opening checkout..."
                      : `Pay and unlock ${plan}`}
              </button>
              <p className="mt-2 text-center text-[11px] text-zinc-400">
                {checkoutReady ? "Secure card checkout via Lemon Squeezy." : "Quarterly card checkout activates after the new variants are configured."}
              </p>
            </section>
          )
        })}
      </div>

      <section className="mt-6 rounded-2xl border border-teal/20 bg-teal/5 p-5">
        <span className="rounded-full bg-teal px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white">For teams</span>
        <h2 className="mt-3 text-lg font-bold text-zinc-900">Agency - PKR 3,999/month</h2>
        <p className="mt-1 text-sm leading-relaxed text-zinc-600">
          PKR 7,998 billed quarterly. Includes 5 client workspaces, 5 seats, trained voices, approvals, publishing, and team analytics.
        </p>
        <a href="/managed/apply?plan=Agency&type=company" className="mt-4 inline-flex rounded-xl bg-teal px-5 py-2.5 text-sm font-bold text-white hover:bg-teal-600">Apply for Agency</a>
      </section>

      {/* Manual fallback. Secondary by design - card checkout is the primary path. */}
      <p className="mt-8 text-center text-xs leading-relaxed text-zinc-500">
        Card declined or no international card? Send payment via {MANUAL_UPGRADE_METHODS.join(", ")} and email the
        screenshot to{" "}
        <a href={upgradesMailUrl(requestedPlan || "Solo", "")} className="font-semibold text-zinc-700 underline">
          {UPGRADES_EMAIL}
        </a>
        . We activate manually, normally within 24 hours.
      </p>
    </div>
  )
}
