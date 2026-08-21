"use client"

import { useRouter } from "next/navigation"
import { usePlanCheckout } from "@/lib/hooks/usePlanCheckout"
import { getPlanSummary } from "@/lib/entitlements"
import { CheckIcon } from "@/components/ui/qalam-icons"
import { UPGRADES_EMAIL } from "@/lib/contact"

/**
 * Renders the post-payment states of a Lemon Squeezy overlay checkout. The
 * overlay itself is drawn by lemon.js; this covers everything after
 * Checkout.Success, where the plan is not live until the webhook lands.
 */
export function CheckoutStatusOverlay() {
  const { state, dismiss } = usePlanCheckout()
  const router = useRouter()

  if (state.phase === "idle" || state.phase === "open" || state.phase === "preparing") return null

  const plan = state.targetPlan

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Checkout status"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-zinc-950/55 px-4"
    >
      <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-6 text-center shadow-xl">
        {state.phase === "activating" && (
          <>
            <span
              aria-hidden="true"
              className="mx-auto block h-9 w-9 animate-spin rounded-full border-2 border-zinc-200 border-t-teal"
            />
            <h2 className="mt-4 text-lg font-bold text-zinc-900">Payment received</h2>
            <p className="mt-2 text-sm leading-relaxed text-zinc-600">
              Unlocking {plan}. This takes a few seconds - do not close this tab.
            </p>
          </>
        )}

        {state.phase === "activated" && (
          <>
            <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <CheckIcon className="h-6 w-6" />
            </span>
            <h2 className="mt-4 text-lg font-bold text-zinc-900">{plan} is live</h2>
            <div className="mt-4 rounded-2xl border border-zinc-100 bg-zinc-50 p-4 text-left">
              <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Now unlocked</p>
              <ul className="mt-2 space-y-1.5">
                {getPlanSummary(plan || "Solo").map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm text-zinc-700">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-teal" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <button
              onClick={() => {
                dismiss()
                router.push("/dashboard")
              }}
              className="mt-5 w-full cursor-pointer rounded-xl bg-teal px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-teal-600"
            >
              Go to dashboard
            </button>
          </>
        )}

        {state.phase === "slow" && (
          <>
            <h2 className="text-lg font-bold text-zinc-900">Payment received</h2>
            <p className="mt-2 text-sm leading-relaxed text-zinc-600">{state.message}</p>
            <div className="mt-5 flex flex-col gap-2">
              <button
                onClick={() => window.location.reload()}
                className="w-full cursor-pointer rounded-xl bg-teal px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-teal-600"
              >
                Reload now
              </button>
              <button
                onClick={dismiss}
                className="w-full cursor-pointer rounded-xl border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
              >
                Close
              </button>
            </div>
            <p className="mt-3 text-xs text-zinc-400">
              Still not active after a few minutes? Email{" "}
              <a href={`mailto:${UPGRADES_EMAIL}`} className="font-semibold underline">
                {UPGRADES_EMAIL}
              </a>
            </p>
          </>
        )}

        {state.phase === "error" && (
          <>
            <h2 className="text-lg font-bold text-zinc-900">Checkout could not start</h2>
            <p className="mt-2 text-sm leading-relaxed text-zinc-600">{state.message}</p>
            <button
              onClick={dismiss}
              className="mt-5 w-full cursor-pointer rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
            >
              Close
            </button>
          </>
        )}
      </div>
    </div>
  )
}
