"use client"

import { useEffect, useState } from "react"

const DAYS_VISIBLE = 14
const seenKey = (featureKey: string) => `qalam_feature_seen_${featureKey}`

export function isNewFeature(launchDate: string): boolean {
  const elapsedDays = (Date.now() - new Date(launchDate).getTime()) / 86400000
  return elapsedDays >= 0 && elapsedDays <= DAYS_VISIBLE
}

/**
 * Small "New" pill for a nav item. Click reveals a one-time tooltip with a short
 * explainer, then the badge is dismissed for good (per feature, per browser).
 */
export function NewFeatureBadge({
  featureKey,
  launchDate,
  tooltip,
}: {
  featureKey: string
  launchDate: string
  tooltip: string
}) {
  const [dismissed, setDismissed] = useState(true)
  const [showTooltip, setShowTooltip] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        setDismissed(localStorage.getItem(seenKey(featureKey)) === "true")
      } catch {
        setDismissed(false)
      }
    }, 0)
    return () => window.clearTimeout(timer)
  }, [featureKey])

  if (dismissed || !isNewFeature(launchDate)) return null

  const dismiss = () => {
    try {
      localStorage.setItem(seenKey(featureKey), "true")
    } catch {
      // ignore blocked localStorage
    }
    setDismissed(true)
    setShowTooltip(false)
  }

  return (
    <span className="relative inline-flex shrink-0">
      <button
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setShowTooltip((v) => !v)
        }}
        className="cursor-pointer rounded-full bg-gold px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide text-zinc-900"
      >
        New
      </button>
      {showTooltip ? (
        <div
          role="tooltip"
          className="absolute left-0 top-full z-50 mt-2 w-56 rounded-xl border border-zinc-200 bg-white p-3 text-left shadow-xl"
        >
          <p className="text-xs leading-relaxed text-zinc-700">{tooltip}</p>
          <button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              dismiss()
            }}
            className="mt-2 cursor-pointer text-[11px] font-bold text-teal hover:underline"
          >
            Dismiss
          </button>
        </div>
      ) : null}
    </span>
  )
}
