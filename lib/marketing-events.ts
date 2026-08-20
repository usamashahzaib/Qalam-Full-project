"use client"

export type MarketingEventName =
  | "homepage_view"
  | "homepage_primary_cta_click"
  | "resume_check_start"
  | "signup_complete"
  | "paid_conversion"

type GtagWindow = Window & {
  gtag?: (command: "event", eventName: string, parameters?: Record<string, unknown>) => void
}

export function trackMarketingEvent(eventName: MarketingEventName, parameters: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return
  ;(window as GtagWindow).gtag?.("event", eventName, parameters)
}
