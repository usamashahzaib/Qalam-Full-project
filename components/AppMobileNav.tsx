"use client"

import { useState, type MouseEvent } from "react"
import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import {
  AnalyticsIcon,
  CalendarIcon,
  ComposeIcon,
  GrowthIcon,
  LibraryIcon,
  MicroscopeIcon,
  ProfileIcon,
  StealthIcon,
  TeamIcon,
  VoiceIcon,
} from "@/components/ui/qalam-icons"
import { withClientParam } from "@/lib/workspace-navigation"
import { getUpgradeTarget, hasFeatureAccess, type PlanTier } from "@/lib/entitlements"
import { useBilling } from "@/lib/hooks/useBilling"
import { UpgradeModal } from "@/components/UpgradeModal"
import { CheckIcon } from "@/components/ui/qalam-icons"
import { AGENCY_PLAN_LIVE } from "@/lib/pricing"
import { SILENT_GROWTH_LIVE } from "@/lib/constants"

type MobileLink = {
  href: string
  label: string
  icon: (props: { className?: string }) => React.ReactElement
  requiredPlan?: PlanTier
}

export const MOBILE_PRIMARY_LINKS: MobileLink[] = [
  { href: "/dashboard", label: "Home", icon: GrowthIcon },
  { href: "/writer", label: "Write", icon: ComposeIcon },
  { href: "/calendar", label: "Plan", icon: CalendarIcon, requiredPlan: "Solo" },
  { href: "/analytics", label: "Track", icon: AnalyticsIcon, requiredPlan: "Solo" },
]

export const MOBILE_MORE_LINKS: MobileLink[] = [
  { href: "/chat", label: "AI Chat", icon: VoiceIcon, requiredPlan: "Pro" },
  { href: "/voice", label: "Voice", icon: VoiceIcon },
  { href: "/career", label: "Career Hub", icon: ProfileIcon },
  { href: "/career/applications", label: "Applications", icon: GrowthIcon },
  { href: "/career/evidence", label: "Evidence", icon: CheckIcon },
  { href: "/library", label: "Library", icon: LibraryIcon, requiredPlan: "Solo" },
  { href: "/carousels", label: "Carousels", icon: LibraryIcon },
  { href: "/approvals", label: "Approvals", icon: CheckIcon, requiredPlan: "Pro" },
  { href: "/competitors", label: "Research", icon: MicroscopeIcon, requiredPlan: "Pro" },
  ...(SILENT_GROWTH_LIVE ? [{ href: "/silent-growth", label: "Silent Growth", icon: StealthIcon }] : []),
  ...(AGENCY_PLAN_LIVE
    ? [{ href: "/agency", label: "Team", icon: TeamIcon, requiredPlan: "Agency" as PlanTier }]
    : []),
  { href: "/settings", label: "Settings", icon: ProfileIcon },
]

function MoreIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className={className}>
      <circle cx="5" cy="12" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="19" cy="12" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function AppMobileNav() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { billing } = useBilling()
  const activeClientId = searchParams.get("client")
  const [moreOpen, setMoreOpen] = useState(false)
  const [upgradePrompt, setUpgradePrompt] = useState<{ plan: PlanTier; reason: string } | null>(null)

  const isMoreActive = MOBILE_MORE_LINKS.some(
    ({ href }) => pathname === href || pathname.startsWith(`${href}/`)
  )

  const handleNavigation = (event: MouseEvent<HTMLAnchorElement>, link: MobileLink) => {
    setMoreOpen(false)
    if (!link.requiredPlan) return
    if (hasFeatureAccess(billing.plan, link.requiredPlan, link.label, billing.featureFlags)) return
    const target = getUpgradeTarget(billing.plan, link.requiredPlan)
    if (!target) return
    event.preventDefault()
    setUpgradePrompt({ plan: target, reason: `${link.label.toLowerCase()} locked` })
  }

  return (
    <>
      {moreOpen && <div className="fixed inset-0 z-30" onClick={() => setMoreOpen(false)} aria-hidden="true" />}

      {moreOpen && (
        <div className="qalam-mobile-more-panel fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom,0px))] z-40 mx-4 mb-2 max-h-[62dvh] overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-3 shadow-xl">
          <div className="grid grid-cols-3 gap-1 sm:grid-cols-5">
            {MOBILE_MORE_LINKS.map((link) => {
              const { href, label, icon: Icon } = link
              const active = pathname === href || pathname.startsWith(`${href}/`)
              return (
                <Link
                  key={href}
                  href={withClientParam(href, activeClientId)}
                  onClick={(event) => handleNavigation(event, link)}
                  className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl px-1 py-3 text-[11px] font-medium transition-colors ${
                    active ? "bg-teal/8 text-teal" : "text-zinc-500"
                  }`}
                >
                  <Icon className={`h-5 w-5 ${active ? "text-gold" : "text-zinc-400"}`} />
                  <span>{label}</span>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      <nav className="qalam-mobile-nav fixed inset-x-0 bottom-0 z-40 border-t border-zinc-200/80 bg-white/95 backdrop-blur md:hidden" style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
        <div className="mx-auto grid max-w-screen-sm grid-cols-5 px-2 py-2">
          {MOBILE_PRIMARY_LINKS.map((link) => {
            const { href, label, icon: Icon } = link
            const active = pathname === href || pathname.startsWith(`${href}/`)
            return (
              <Link
                key={href}
                href={withClientParam(href, activeClientId)}
                onClick={(event) => handleNavigation(event, link)}
                className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 text-[11px] font-medium transition-colors ${
                  active ? "bg-teal/8 text-teal" : "text-zinc-500"
                }`}
              >
                <Icon className={`h-4 w-4 ${active ? "text-gold" : "text-zinc-400"}`} />
                <span>{label}</span>
              </Link>
            )
          })}

          <button
            type="button"
            onClick={() => setMoreOpen((v) => !v)}
            aria-expanded={moreOpen}
            aria-label="More navigation options"
            className={`flex flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 text-[11px] font-medium transition-colors ${
              isMoreActive || moreOpen ? "bg-teal/8 text-teal" : "text-zinc-500"
            }`}
          >
            <MoreIcon className={`h-4 w-4 ${isMoreActive || moreOpen ? "text-gold" : "text-zinc-400"}`} />
            <span>More</span>
          </button>
        </div>
      </nav>
      {upgradePrompt ? (
        <UpgradeModal
          currentPlan={billing.plan}
          requiredPlan={upgradePrompt.plan}
          reason={upgradePrompt.reason}
          onClose={() => setUpgradePrompt(null)}
        />
      ) : null}
    </>
  )
}
