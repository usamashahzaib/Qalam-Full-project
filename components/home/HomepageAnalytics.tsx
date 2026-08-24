"use client"

import { useEffect } from "react"
import Link from "next/link"
import { trackMarketingEvent, type MarketingEventName } from "@/lib/marketing-events"

export function HomepageAnalytics() {
  useEffect(() => {
    trackMarketingEvent("homepage_view")
  }, [])

  return null
}

export function TrackedHomepageLink({
  href,
  event,
  parameters,
  className,
  children,
}: {
  href: string
  event: MarketingEventName
  parameters: Record<string, unknown>
  className: string
  children: React.ReactNode
}) {
  return (
    <Link href={href} onClick={() => trackMarketingEvent(event, parameters)} className={className}>
      {children}
    </Link>
  )
}
