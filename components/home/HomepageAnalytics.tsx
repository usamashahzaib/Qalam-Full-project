"use client"

import { useEffect } from "react"
import Link from "next/link"
import { trackMarketingEvent, type MarketingEventMap } from "@/lib/marketing-events"

export function HomepageAnalytics() {
  useEffect(() => {
    trackMarketingEvent("homepage_view", {})
  }, [])

  return null
}

type TrackedHomepageEvent = "homepage_primary_cta_click" | "resume_check_start"

export function TrackedHomepageLink<E extends TrackedHomepageEvent>({
  href,
  event,
  parameters,
  className,
  children,
}: {
  href: string
  event: E
  parameters: MarketingEventMap[E]
  className: string
  children: React.ReactNode
}) {
  return (
    <Link href={href} onClick={() => trackMarketingEvent(event, parameters)} className={className}>
      {children}
    </Link>
  )
}
