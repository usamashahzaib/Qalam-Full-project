"use client"

import Link from "next/link"
import { PLAN_FEATURES, PLAN_PRICES, annualFraming, formatPkr, type PlanName } from "@/lib/pricing"
import { usePlanCheckout } from "@/lib/hooks/usePlanCheckout"
import type { PlanTier } from "@/lib/entitlements"

type UpgradeModalProps = {
  currentPlan: string
  requiredPlan: PlanTier
  reason: string
  usageLabel?: string
  onClose: () => void
}

const unlocksFor = (plan: PlanTier) => {
  if (plan === "Solo") return ["25 drafts", "scheduling", "1 voice profile", "analytics"]
  const key = plan.startsWith("Agency") ? "Agency" : plan
  return (PLAN_FEATURES[key] || []).slice(0, 4)
}

export function UpgradeModal({ currentPlan, requiredPlan, reason, usageLabel, onClose }: UpgradeModalProps) {
  const { openCheckout, state } = usePlanCheckout()
  const isAgency = requiredPlan === "Agency" || requiredPlan.startsWith("Agency")

  if (isAgency) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/45 px-4">
        <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-6 text-center shadow-xl">
          <span className="inline-flex rounded-full bg-teal/10 px-3 py-1 text-xs font-bold text-teal-800">
            For agencies
          </span>
          <h2 className="mt-3 text-lg font-bold text-zinc-900">Get Agency</h2>
          <p className="mt-2 text-sm leading-relaxed text-zinc-600">
            5 client workspaces, team seats, and approval workflows for PKR 7,490/month. Agency is onboarded manually - tell us about your team and we&apos;ll set it up.
          </p>
          <Link
            href="/contact"
            onClick={onClose}
            className="mt-5 block rounded-xl bg-teal px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-teal-600"
          >
            Get Agency
          </Link>
          <button
            onClick={onClose}
            className="mt-3 text-sm text-zinc-400 transition-colors hover:text-zinc-600"
          >
            Close
          </button>
        </div>
      </div>
    )
  }

  const priceKey = requiredPlan.startsWith("Agency") ? "Agency" : requiredPlan
  const price = PLAN_PRICES[priceKey]?.monthly ?? 0
  const isBusy = state.phase === "preparing" && state.targetPlan === requiredPlan

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/45 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-6 text-center shadow-xl">
        <h2 className="text-lg font-bold text-zinc-900">
          You&apos;re on {currentPlan} ({usageLabel || reason})
        </h2>
        <p className="mt-2 text-sm font-semibold text-zinc-700">Upgrade to {requiredPlan} for {formatPkr(price)}/mo</p>
        <div className="mt-4 rounded-2xl border border-zinc-100 bg-zinc-50 p-4 text-left">
          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Unlocks</p>
          <ul className="mt-2 space-y-1.5">
            {unlocksFor(requiredPlan).map((item) => (
              <li key={item} className="flex items-center gap-2 text-sm text-zinc-700">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-teal" />
                {item}
              </li>
            ))}
          </ul>
        </div>
        {/* Pays right here in an overlay - the modal never hands the user off to
            the marketing site, which is where every upgrade prompt used to dead-end. */}
        <button
          onClick={() => {
            onClose()
            openCheckout(requiredPlan as PlanName, "monthly")
          }}
          disabled={isBusy}
          className="mt-5 w-full cursor-pointer rounded-xl bg-teal px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-teal-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isBusy ? "Opening checkout..." : `Unlock ${requiredPlan} - ${formatPkr(price)}/mo`}
        </button>
        <button
          onClick={() => {
            onClose()
            openCheckout(requiredPlan as PlanName, "annual")
          }}
          className="mt-2 w-full cursor-pointer text-xs font-semibold text-teal hover:underline"
        >
          Pay annually and get {annualFraming}
        </button>
        <div className="mt-4 flex items-center justify-center gap-3 text-xs">
          <button onClick={onClose} className="cursor-pointer font-semibold text-zinc-500 hover:text-zinc-700">Not now</button>
          <span className="text-zinc-200">|</span>
          <Link href="/upgrade" onClick={onClose} className="font-semibold text-zinc-500 hover:text-zinc-700 hover:underline">Compare plans</Link>
        </div>
      </div>
    </div>
  )
}
