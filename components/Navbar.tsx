"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronRightIcon, ChevronDownIcon } from "@/components/ui/qalam-icons"
import { useSession, signOut } from "next-auth/react"
import { QalamLogo, QalamMark } from "@/components/QalamLogo"
import { resolvePublicHref } from "@/lib/seo"
import { alphabetical } from "@/lib/sort"

const PRODUCT_LINKS = alphabetical([
  { label: "All Features", href: "/features", desc: "See product views, methods, and connected workflows" },
  { label: "Career Visibility", href: "/career-visibility", desc: "Connect LinkedIn, content, resumes, and target roles" },
  { label: "LinkedIn Optimizer", href: "/linkedin-optimization", desc: "Improve positioning, search relevance, and proof" },
  { label: "LinkedIn Extension", href: "/linkedin-extension", desc: "Create thoughtful comment options while you browse LinkedIn" },
  { label: "Content Studio", href: "/product/post-writer", desc: "Draft, score, revise, and plan LinkedIn content" },
  { label: "ATS Resume Builder", href: "/ats-resume-builder", desc: "Build role-specific resumes from verified experience" },
  { label: "Job Description Match", href: "/job-description-match", desc: "Find evidence, relevance, and keyword gaps" },
], (link) => link.label)

const USE_CASE_LINKS = alphabetical([
  { label: "All Industries", href: "/industries", desc: "Find the Qalam workflow for your work" },
  { label: "Job Seekers", href: "/use-cases/job-seekers", desc: "ATS resumes, job matching, and LinkedIn positioning" },
  { label: "Recruiters", href: "/use-cases/recruiters", desc: "Evidence-first review and recruiting authority" },
  { label: "Career Coaches", href: "/use-cases/career-coaches", desc: "Repeatable client diagnostics and career assets" },
  { label: "Universities", href: "/use-cases/universities", desc: "Scalable student career readiness" },
  { label: "Founders", href: "/use-cases/founders", desc: "Consistent thought leadership without a ghostwriter" },
  { label: "Marketing Teams", href: "/use-cases/marketing-teams", desc: "Shared workflow, consistent brand voice" },
  { label: "HR Leaders", href: "/use-cases/hr-leaders", desc: "Employer brand and culture publishing" },
  { label: "Consultants", href: "/use-cases/consultants", desc: "Frameworks and expertise that compounds" },
  { label: "Agencies", href: "/use-cases/agencies", desc: "Multi-client content operations at scale" },
], (link) => link.label)

const STATIC_LINKS = [
  { label: "Free ATS Check", href: "/free-tools/ats-resume-checker" },
  { label: "Pricing", href: "/pricing" },
  { label: "Free Tools", href: "/free-tools" },
  { label: "Blog", href: "/blog" },
]

function UserAvatar({ name, imageUrl }: { name: string; imageUrl: string | null }) {
  if (imageUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={imageUrl} alt={name} className="h-8 w-8 rounded-full object-cover ring-2 ring-white/15" />
  }
  const initials = name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()
  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-teal text-xs font-bold text-white ring-2 ring-white/15">
      {initials}
    </div>
  )
}

function NavDropdown({
  label,
  links,
}: {
  label: string
  links: { label: string; href: string; desc: string }[]
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const panelId = `nav-${label.toLowerCase().replace(/\s+/g, "-")}`

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  return (
    <div ref={ref} className="relative" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)} onKeyDown={(event) => {
      if (event.key === "Escape") setOpen(false)
    }}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="true"
        aria-controls={panelId}
        className="flex min-h-11 items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors qlx-link"
      >
        {label}
        <span className={`inline-flex transition-transform duration-200 ${open ? "rotate-180" : ""}`}>
          <ChevronDownIcon className="h-3.5 w-3.5 text-[var(--nav-fg-mute)]" />
        </span>
      </button>

      {open && (
          <div
            id={panelId}
            className={`qlx-panel qlx-popover-enter absolute left-0 top-full z-50 mt-2 overflow-hidden rounded-2xl ${links.length > 7 ? "w-[34rem]" : "w-64"}`}
          >
            <div className={`p-2 ${links.length > 7 ? "grid grid-cols-2" : ""}`}>
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="group flex flex-col rounded-xl px-3 py-2.5 transition-colors hover:bg-white/8"
                >
                  <span className="text-sm font-semibold text-white/90 group-hover:text-[oklch(0.88_0.04_90)]">{link.label}</span>
                  <span className="mt-0.5 text-xs leading-snug text-white/45">{link.desc}</span>
                </Link>
              ))}
            </div>
          </div>
      )}
    </div>
  )
}

type SessionData = { user?: { id?: string | null; name?: string | null; email?: string | null; image?: string | null } | null }

function UserMenu({ session }: { session: SessionData }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-xl p-1 transition-colors hover:bg-[var(--nav-hover-bg)]"
        aria-label="Account menu"
      >
        {session.user?.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={session.user.image} alt="Profile" className="h-8 w-8 rounded-full object-cover ring-2 ring-white/15" />
        ) : (
          <UserAvatar name={session.user?.name || "U"} imageUrl={null} />
        )}
        <span className={`inline-flex transition-transform duration-200 ${open ? "rotate-180" : ""}`}>
          <ChevronDownIcon className="h-3.5 w-3.5 text-[var(--nav-fg-mute)]" />
        </span>
      </button>

      {open && (
          <div
            className="qlx-panel qlx-popover-enter absolute right-0 top-full z-50 mt-2 w-52 overflow-hidden rounded-2xl"
          >
            <div className="border-b border-white/10 px-4 py-3">
              <p className="truncate text-sm font-semibold text-white/90">{session.user?.name || "Account"}</p>
              <p className="truncate text-xs text-white/60">{session.user?.email}</p>
            </div>
            <div className="p-2">
              <Link href="/settings" onClick={() => setOpen(false)} className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-white/75 transition-colors hover:bg-white/8 hover:text-[oklch(0.88_0.04_90)]">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Settings
              </Link>
              <Link href={resolvePublicHref("/dashboard")} onClick={() => setOpen(false)} className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-white/75 transition-colors hover:bg-white/8 hover:text-[oklch(0.88_0.04_90)]">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                Dashboard
              </Link>
              <button
                onClick={() => { setOpen(false); signOut({ callbackUrl: "/" }) }}
                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-white/60 transition-colors hover:bg-red-500/10 hover:text-red-400"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Log out
              </button>
            </div>
          </div>
      )}
    </div>
  )
}

export function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [mobileSection, setMobileSection] = useState<"product" | "use-cases" | null>(null)
  const [announcementVisible, setAnnouncementVisible] = useState(true)
  const [announcementReady, setAnnouncementReady] = useState(false)
  const { data: session, status } = useSession()
  const pathname = usePathname()
  const navRef = useRef<HTMLElement>(null)
  const mobileToggleRef = useRef<HTMLButtonElement>(null)
  const shellRef = useRef<HTMLDivElement>(null)
  // The navbar reads dark only while a dark section is actually behind it.
  // This replaced a hardcoded allowlist of routes, which silently mismatched
  // every page nobody remembered to register, including the homepage.
  // null means "not measured yet", which is what lets CSS paint the first
  // frame from the page's own data-nav-hero marker.
  const [ground, setGround] = useState<"light" | "dark" | null>(null)

  // Client-side navigation swaps the page under a navbar that never
  // unmounts, so a stale reading would carry across routes. Reset it during
  // render rather than in an effect, so the new page never paints one frame
  // wearing the previous page's ground.
  const [measuredPath, setMeasuredPath] = useState(pathname)
  if (measuredPath !== pathname) {
    setMeasuredPath(pathname)
    setGround(null)
  }
  // Pricing has its own early-access urgency banner - stacking the global
  // announcement on top of it doubles up on urgency messaging.
  // Gated on announcementReady so repeat visitors (who already dismissed it) never
  // see the banner flash in and animate-collapse before the localStorage check runs.
  const showAnnouncement = announcementReady && announcementVisible && pathname !== "/" && pathname !== "/pricing"

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (localStorage.getItem("qalam_announce_dismissed") === "1") {
        setAnnouncementVisible(false)
      }
      setAnnouncementReady(true)
    }, 0)
    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16)
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  // The mobile menu covers the page, so Escape has to dismiss it the way the
  // desktop dropdowns do. Focus returns to the toggle rather than being
  // dropped at the top of the document.
  useEffect(() => {
    if (!mobileOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return
      setMobileOpen(false)
      setMobileSection(null)
      mobileToggleRef.current?.focus()
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [mobileOpen])

  // Publish the header's real height so anchor targets can clear it. A
  // ResizeObserver rather than a one-off measurement because the banner
  // collapses with an animation, and because the row wraps at narrow widths.
  useEffect(() => {
    const shell = shellRef.current
    if (!shell) return
    const observer = new ResizeObserver(() => {
      document.documentElement.style.setProperty("--header-h", `${Math.round(shell.offsetHeight)}px`)
    })
    observer.observe(shell)
    return () => {
      observer.disconnect()
      document.documentElement.style.removeProperty("--header-h")
    }
  }, [])

  // Watch every dark section on the page and flip the navbar whenever one is
  // physically under it. The observation root is narrowed to exactly the nav
  // row, so the announcement bar above it never counts as ground.
  useEffect(() => {
    const nav = navRef.current
    if (!nav) return

    // No dark sections on this page: leave ground unmeasured. It renders
    // light either way, and the CSS pre-hydration rule cannot match here
    // because data-nav-hero only ever appears alongside a dark ground.
    const grounds = Array.from(document.querySelectorAll("[data-nav-ground='dark']"))
    if (grounds.length === 0) return

    const covering = new Set<Element>()
    let observer: IntersectionObserver | null = null

    const build = () => {
      observer?.disconnect()
      covering.clear()
      const rect = nav.getBoundingClientRect()
      // Negative margins crop the viewport down to the nav row itself.
      const top = Math.max(0, rect.top)
      const bottom = Math.max(0, window.innerHeight - rect.bottom)
      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) covering.add(entry.target)
            else covering.delete(entry.target)
          }
          setGround(covering.size > 0 ? "dark" : "light")
        },
        { rootMargin: `-${top}px 0px -${bottom}px 0px`, threshold: 0 },
      )
      for (const ground of grounds) observer.observe(ground)
    }

    build()
    window.addEventListener("resize", build)
    return () => {
      window.removeEventListener("resize", build)
      observer?.disconnect()
    }
    // showAnnouncement matters because dismissing the banner moves the nav row
    // up by its height, which invalidates the cropped root.
  }, [pathname, showAnnouncement])

  return (
    <div ref={shellRef} className="qlx fixed left-0 right-0 top-0 z-50 flex flex-col">
      {showAnnouncement && (
          <div className="overflow-hidden bg-[#1f5e57]">
            <div className="relative flex h-11 items-center justify-center gap-2 px-12 text-sm font-medium text-white sm:gap-3 sm:px-4">
              <span className="hidden h-5 w-5 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/10 sm:inline-flex">
                <QalamMark size={20} className="rounded-full border-0 shadow-none" />
              </span>
              <span className="truncate">
                <strong>Free:</strong> <span className="hidden sm:inline">Check your resume like an ATS and recruiter</span><span className="sm:hidden">ATS resume check</span>
              </span>
              <Link
                href="/free-tools/ats-resume-checker"
                className="inline-flex min-h-11 shrink-0 items-center gap-1 text-gold-100 underline underline-offset-2 transition-colors hover:text-white"
              >
                Check now <ChevronRightIcon className="h-3.5 w-3.5" />
              </Link>
              <button
                onClick={() => {
                  localStorage.setItem("qalam_announce_dismissed", "1")
                  setAnnouncementVisible(false)
                }}
                className="absolute right-0 flex h-11 w-11 items-center justify-center text-lg leading-none text-white/80 transition-colors hover:text-white sm:right-4"
                aria-label="Dismiss"
              >
                <span aria-hidden="true">&times;</span>
              </button>
            </div>
          </div>
      )}

      <nav
        ref={navRef}
        // Left unset until the observer has actually looked at the page, so
        // the CSS pre-hydration rule can own the first paint. Stamping it
        // during render would defeat that and reintroduce the light-bar-on-
        // dark-hero flash.
        data-ground={ground ?? undefined}
        className={`qlx-nav border-b transition-[background-color,border-color,box-shadow] duration-300 ${
          ground === "dark" ? "qlx-glass" : "qlx-glass-light"
        } ${
          scrolled
            ? "border-[var(--nav-border)] shadow-[var(--nav-shadow)]"
            : "border-transparent"
        }`}
      >
        <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-6">
          <QalamLogo
            href="/"
            size={32}
            containerClassName="flex min-h-11 select-none items-center gap-2"
            textClassName="text-xl font-bold tracking-tight text-[var(--nav-fg-strong)]"
          />

          <div className="hidden items-center gap-1 lg:flex">
            <NavDropdown label="Product" links={PRODUCT_LINKS} />
            <NavDropdown label="Use Cases" links={USE_CASE_LINKS} />
            {STATIC_LINKS.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className={`inline-flex min-h-11 items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors qlx-link`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="hidden items-center gap-3 lg:flex">
            {status === "loading" ? (
              <Link href={resolvePublicHref("/login")} className="qlx-link inline-flex min-h-11 items-center rounded-lg px-2 py-2 text-sm font-medium" aria-label="Log in while account status loads">
                Log in
              </Link>
            ) : session?.user?.id ? (
              <UserMenu session={session} />
            ) : (
              <>
                <Link href={resolvePublicHref("/login")} className={`inline-flex min-h-11 items-center rounded-lg px-2 py-2 text-sm font-medium transition-colors qlx-link`}>Log in</Link>
                <Link
                  href={resolvePublicHref("/signup")}
                  className="qlx-champagne-btn press inline-flex min-h-11 items-center rounded-lg px-4 py-2 text-sm font-semibold"
                >
                  Start free
                </Link>
              </>
            )}
          </div>

          <button
            ref={mobileToggleRef}
            className={`flex h-11 w-11 flex-col items-center justify-center gap-1.5 rounded-lg p-2 transition-colors lg:hidden hover:bg-[var(--nav-hover-bg)]`}
            onClick={() => setMobileOpen((o) => !o)}
            aria-label="Toggle menu"
            aria-expanded={mobileOpen}
            aria-controls="mobile-navigation"
          >
            <span className={`block h-0.5 w-5 origin-center rounded-full bg-[var(--nav-fg-strong)] transition-transform duration-200 ${mobileOpen ? "translate-y-2 rotate-45" : ""}`} />
            <span className={`block h-0.5 w-5 rounded-full bg-[var(--nav-fg-strong)] transition-opacity duration-150 ${mobileOpen ? "opacity-0" : ""}`} />
            <span className={`block h-0.5 w-5 origin-center rounded-full bg-[var(--nav-fg-strong)] transition-transform duration-200 ${mobileOpen ? "-translate-y-2 -rotate-45" : ""}`} />
          </button>
        </div>

        {mobileOpen && (
            <div
              id="mobile-navigation"
              className="qlx-mobile-menu-enter overflow-hidden border-t border-white/10 bg-[#242a28] lg:hidden"
            >
              <div className="flex flex-col gap-1 px-6 py-4">
                {/* Product section */}
                <button
                  onClick={() => setMobileSection(mobileSection === "product" ? null : "product")}
                  aria-expanded={mobileSection === "product"}
                  aria-controls="mobile-product-links"
                  className="qlx-link flex min-h-11 items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium"
                >
                  Product
                  <span className={`inline-flex transition-transform duration-200 ${mobileSection === "product" ? "rotate-180" : ""}`}>
                    <ChevronDownIcon className="h-3.5 w-3.5" />
                  </span>
                </button>
                {mobileSection === "product" && (
                    <div id="mobile-product-links" className="qlx-mobile-section-enter overflow-hidden pl-4">
                      {PRODUCT_LINKS.map((link) => (
                        <Link key={link.href} href={link.href} onClick={() => setMobileOpen(false)} className="flex min-h-11 items-center rounded-lg px-3 py-2 text-sm text-white/60 hover:text-[oklch(0.88_0.04_90)]">
                          {link.label}
                        </Link>
                      ))}
                    </div>
                )}

                {/* Use Cases section */}
                <button
                  onClick={() => setMobileSection(mobileSection === "use-cases" ? null : "use-cases")}
                  aria-expanded={mobileSection === "use-cases"}
                  aria-controls="mobile-use-case-links"
                  className="qlx-link flex min-h-11 items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium"
                >
                  Use Cases
                  <span className={`inline-flex transition-transform duration-200 ${mobileSection === "use-cases" ? "rotate-180" : ""}`}>
                    <ChevronDownIcon className="h-3.5 w-3.5" />
                  </span>
                </button>
                {mobileSection === "use-cases" && (
                    <div id="mobile-use-case-links" className="qlx-mobile-section-enter overflow-hidden pl-4">
                      {USE_CASE_LINKS.map((link) => (
                        <Link key={link.href} href={link.href} onClick={() => setMobileOpen(false)} className="flex min-h-11 items-center rounded-lg px-3 py-2 text-sm text-white/60 hover:text-[oklch(0.88_0.04_90)]">
                          {link.label}
                        </Link>
                      ))}
                    </div>
                )}

                {STATIC_LINKS.map((link) => (
                  <Link key={link.label} href={link.href} onClick={() => setMobileOpen(false)} className="qlx-link flex min-h-11 items-center rounded-lg px-3 py-2.5 text-sm font-medium">
                    {link.label}
                  </Link>
                ))}

                <div className="mt-3 flex flex-col gap-1 border-t border-white/10 pt-3">
                  {status === "loading" ? (
                    <Link href={resolvePublicHref("/login")} onClick={() => setMobileOpen(false)} className="qlx-link flex min-h-11 items-center rounded-lg px-3 py-2.5 text-sm font-medium" aria-label="Log in while account status loads">
                      Log in
                    </Link>
                  ) : session?.user?.id ? (
                    <>
                      <div className="mb-1 flex items-center gap-2.5 px-3 py-2">
                        {session.user?.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={session.user.image} alt="Profile" className="h-8 w-8 rounded-full object-cover ring-2 ring-white/15" />
                        ) : (
                          <UserAvatar name={session.user?.name || "U"} imageUrl={null} />
                        )}
                        <div>
                          <p className="text-sm font-semibold text-white/90">{session.user?.name}</p>
                          <p className="text-xs text-white/60">{session.user?.email}</p>
                        </div>
                      </div>
                      <Link href={resolvePublicHref("/settings")} onClick={() => setMobileOpen(false)} className="qlx-link flex min-h-11 items-center rounded-lg px-3 py-2.5 text-sm font-medium">Settings</Link>
                      <Link href={resolvePublicHref("/dashboard")} onClick={() => setMobileOpen(false)} className="qlx-link flex min-h-11 items-center rounded-lg px-3 py-2.5 text-sm font-medium">Dashboard</Link>
                      <button onClick={() => signOut({ callbackUrl: "/" })} className="min-h-11 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-white/60 hover:bg-red-500/10 hover:text-red-400">
                        Log out
                      </button>
                    </>
                  ) : (
                    <>
                      <Link href={resolvePublicHref("/login")} onClick={() => setMobileOpen(false)} className="qlx-link flex min-h-11 items-center rounded-lg px-3 py-2.5 text-sm font-medium">Log in</Link>
                      <Link
                        href={resolvePublicHref("/signup")}
                        onClick={() => setMobileOpen(false)}
                        className="qlx-champagne-btn flex min-h-11 items-center justify-center rounded-lg px-3 py-2.5 text-center text-sm font-semibold"
                      >
                        Start free
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </div>
        )}
      </nav>
    </div>
  )
}
