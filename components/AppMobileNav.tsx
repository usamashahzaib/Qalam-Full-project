"use client"

import { useState } from "react"
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
  TeamIcon,
  VoiceIcon,
} from "@/components/ui/qalam-icons"
import { withClientParam } from "@/lib/workspace-navigation"

const PRIMARY_LINKS = [
  { href: "/dashboard", label: "Home", icon: GrowthIcon },
  { href: "/writer", label: "Write", icon: ComposeIcon },
  { href: "/calendar", label: "Plan", icon: CalendarIcon },
  { href: "/analytics", label: "Track", icon: AnalyticsIcon },
]

const MORE_LINKS = [
  { href: "/chat", label: "AI Chat", icon: VoiceIcon },
  { href: "/voice", label: "Voice", icon: VoiceIcon },
  { href: "/library", label: "Library", icon: LibraryIcon },
  { href: "/carousels", label: "Carousels", icon: LibraryIcon },
  { href: "/competitors", label: "Research", icon: MicroscopeIcon },
  { href: "/agency", label: "Team", icon: TeamIcon },
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
  const activeClientId = searchParams.get("client")
  const [moreOpen, setMoreOpen] = useState(false)

  const isMoreActive = MORE_LINKS.some(
    ({ href }) => pathname === href || pathname.startsWith(`${href}/`)
  )

  return (
    <>
      {moreOpen && <div className="fixed inset-0 z-30" onClick={() => setMoreOpen(false)} aria-hidden="true" />}

      {moreOpen && (
        <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom,0px))] z-40 mx-4 mb-2 rounded-2xl border border-zinc-200 bg-white/98 p-3 shadow-xl backdrop-blur-md">
          <div className="grid grid-cols-5 gap-1">
            {MORE_LINKS.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || pathname.startsWith(`${href}/`)
              return (
                <Link
                  key={href}
                  href={withClientParam(href, activeClientId)}
                  onClick={() => setMoreOpen(false)}
                  className={`flex flex-col items-center justify-center gap-1 rounded-xl px-1 py-3 text-[11px] font-medium transition-colors ${
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

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-200/80 bg-white/95 backdrop-blur md:hidden" style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
        <div className="mx-auto grid max-w-screen-sm grid-cols-5 px-2 py-2">
          {PRIMARY_LINKS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`)
            return (
              <Link
                key={href}
                href={withClientParam(href, activeClientId)}
                onClick={() => setMoreOpen(false)}
                className={`flex flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 text-[11px] font-medium transition-colors ${
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
    </>
  )
}
