"use client"

import Link from "next/link"
import { usePlanCheckout } from "@/lib/hooks/usePlanCheckout"
import { PLAN_PRICES, formatPrice, type PlanName } from "@/lib/pricing"
import {
  AnalyticsIcon,
  BrainIcon,
  CalendarIcon,
  CheckIcon,
  LibraryIcon,
  MicroscopeIcon,
  VoiceIcon,
} from "@/components/ui/qalam-icons"

type LockedFeature = {
  label: string
  icon: (props: { className?: string }) => React.ReactElement
  plan: PlanName
}

// Mirrors the plan gates on the sidebar nav in components/AppShell.tsx. Kept in the
// same order so a locked icon here matches the locked item the user already sees.
const LOCKED_FEATURES: LockedFeature[] = [
  { label: "Planner", icon: CalendarIcon, plan: "Solo" },
  { label: "Analytics", icon: AnalyticsIcon, plan: "Solo" },
  { label: "Library", icon: LibraryIcon, plan: "Solo" },
  { label: "Voice Training", icon: VoiceIcon, plan: "Pro" },
  { label: "AI Strategist", icon: BrainIcon, plan: "Pro" },
  { label: "Research", icon: MicroscopeIcon, plan: "Pro" },
]

const HEADLINES: Record<"Solo" | "Pro", { title: string; sub: string }> = {
  Solo: {
    title: "Choose Solo and start publishing properly",
    sub: "30 posts, 3 carousels, scheduling, planner, and library.",
  },
  Pro: {
    title: "Choose Pro and configure your voice profile",
    sub: "60 posts, 10 carousels, saved voice context, AI Strategist, competitor research.",
  },
}

/**
 * The in-dashboard upgrade surface. Every button here opens the Lemon Squeezy
 * overlay in place - this never sends the user to the marketing site, which is
 * what every upgrade prompt in the app used to do.
 */
export function UpgradeSpotlight({ currentPlan }: { currentPlan: string }) {
  const { openCheckout, state } = usePlanCheckout()
  const normalized = (currentPlan || "").trim().toLowerCase()

  // Pro and Agency have nothing left to sell here.
  if (normalized !== "free" && normalized !== "solo") return null

  const targetPlan: "Solo" | "Pro" = normalized === "free" ? "Solo" : "Pro"
  const copy = HEADLINES[targetPlan]
  const prices = PLAN_PRICES[targetPlan] ?? { monthly: 0, quarterly: 0 }
  const isBusy = state.phase === "preparing" && state.targetPlan === targetPlan

  return (
    <section className="overflow-hidden rounded-2xl border border-teal/30 bg-gradient-to-br from-teal-50 to-white shadow-sm">
      <div className="flex flex-col gap-6 p-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-teal px-3 py-1 text-xs font-bold text-white">
            <span className="h-1.5 w-1.5 rounded-full bg-white/90" />
            You are on {currentPlan}
          </span>
          <h2 className="mt-3 text-xl font-bold text-zinc-950">{copy.title}</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-zinc-600">{copy.sub}</p>

          {/* Locked feature strip - the same icons the sidebar greys out. */}
          <ul className="mt-5 flex flex-wrap gap-2">
            {LOCKED_FEATURES.map((feature) => {
              const Icon = feature.icon
              const unlockedHere = feature.plan === targetPlan || (targetPlan === "Pro" && feature.plan === "Solo")
              return (
                <li
                  key={feature.label}
                  title={`Included with ${feature.plan}`}
                  className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold ${
                    unlockedHere
                      ? "border-teal/30 bg-white text-teal"
                      : "border-zinc-200 bg-zinc-50 text-zinc-400"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {feature.label}
                  {unlockedHere ? (
                    <CheckIcon className="h-3 w-3" />
                  ) : (
                    <span className="t-eyebrow">{feature.plan}</span>
                  )}
                </li>
              )
            })}
          </ul>
        </div>

        <div className="shrink-0 lg:w-56">
          <p className="text-3xl font-extrabold tabular-nums text-zinc-950">
            {formatPrice(prices.monthly)}
            <span className="ml-1 text-sm font-normal text-zinc-500">/mo</span>
          </p>
          <button
            onClick={() => openCheckout(targetPlan, "quarterly")}
            disabled={isBusy}
            className="mt-3 w-full cursor-pointer rounded-xl bg-teal px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-teal-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isBusy ? "Opening checkout..." : `Choose ${targetPlan} now`}
          </button>
          <p className="mt-2 text-center text-xs font-semibold text-emerald-700">
            {formatPrice(prices.quarterly)} quarterly - 1 month free
          </p>
          <Link
            href={`/upgrade?plan=${targetPlan}`}
            className="mt-3 block text-center text-xs font-semibold text-zinc-500 hover:text-zinc-700 hover:underline"
          >
            Compare plans
          </Link>
          <p className="mt-2 text-center t-eyebrow leading-relaxed text-zinc-400">
            Card checkout. Access starts in seconds.
          </p>
        </div>
      </div>
    </section>
  )
}
