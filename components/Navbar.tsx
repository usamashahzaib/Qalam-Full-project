"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { AnimatePresence, motion } from "framer-motion"
import { ChevronRightIcon, ChevronDownIcon } from "@/components/ui/qalam-icons"
import { useSession, signOut } from "next-auth/react"
import { QalamLogo, QalamMark } from "@/components/QalamLogo"
import { APP_URL } from "@/lib/seo"

const PRODUCT_LINKS = [
  { label: "Post Writer", href: "/product/post-writer", desc: "Draft and revise in one structured workflow" },
  { label: "Voice Profile", href: "/product/voice-profile", desc: "Train Qalam on your real writing tone" },
  { label: "Hook Generator", href: "/product/hook-generator", desc: "Build stronger openings, archive the best" },
  { label: "Comment Generator", href: "/product/comment-generator", desc: "Stay visible with on-voice replies" },
  { label: "Post Scheduler", href: "/product/post-scheduler", desc: "Plan publishing without losing draft context" },
  { label: "Agency Workspaces", href: "/product/agency-workspaces", desc: "Coming soon: separate client voice memory" },
]

const USE_CASE_LINKS = [
  { label: "Founders", href: "/use-cases/founders", desc: "Consistent thought leadership without a ghostwriter" },
  { label: "Marketing Teams", href: "/use-cases/marketing-teams", desc: "Shared workflow, consistent brand voice" },
  { label: "HR Leaders", href: "/use-cases/hr-leaders", desc: "Employer brand and culture publishing" },
  { label: "Consultants", href: "/use-cases/consultants", desc: "Frameworks and expertise that compounds" },
  { label: "Agencies", href: "/use-cases/agencies", desc: "Multi-client content operations at scale" },
]

const STATIC_LINKS = [
  { label: "Pricing", href: "/pricing" },
  { label: "Demo", href: "/demo" },
  { label: "Free Tools", href: "/free-tools" },
  { label: "Blog", href: "/blog" },
]

function UserAvatar({ name, imageUrl }: { name: string; imageUrl: string | null }) {
  if (imageUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={imageUrl} alt={name} className="h-8 w-8 rounded-full object-cover ring-2 ring-teal/20" />
  }
  const initials = name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()
  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-teal text-xs font-bold text-white ring-2 ring-teal/20">
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

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  return (
    <div ref={ref} className="relative" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="nav-underline flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 transition-all duration-150 hover:bg-teal/10 hover:text-teal"
      >
        {label}
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.18 }}
          className="inline-flex"
        >
          <ChevronDownIcon className="h-3.5 w-3.5 text-zinc-400" />
        </motion.span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.97 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute left-0 top-full z-50 mt-1 w-64 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl"
          >
            <div className="p-2">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="group flex flex-col rounded-xl px-3 py-2.5 transition-colors hover:bg-teal/5"
                >
                  <span className="text-sm font-semibold text-zinc-900 group-hover:text-teal">{link.label}</span>
                  <span className="mt-0.5 text-xs leading-snug text-zinc-500">{link.desc}</span>
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
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
        className="flex items-center gap-2 rounded-xl p-1 transition-colors hover:bg-zinc-100"
        aria-label="Account menu"
      >
        {session.user?.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={session.user.image} alt="Profile" className="h-8 w-8 rounded-full object-cover ring-2 ring-teal/20" />
        ) : (
          <UserAvatar name={session.user?.name || "U"} imageUrl={null} />
        )}
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.18 }}
          className="inline-flex"
        >
          <ChevronDownIcon className="h-3.5 w-3.5 text-zinc-400" />
        </motion.span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.97 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute right-0 top-full z-50 mt-2 w-52 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl"
          >
            <div className="border-b border-zinc-100 px-4 py-3">
              <p className="truncate text-sm font-semibold text-zinc-900">{session.user?.name || "Account"}</p>
              <p className="truncate text-xs text-zinc-400">{session.user?.email}</p>
            </div>
            <div className="p-2">
              <Link href="/settings" onClick={() => setOpen(false)} className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-teal/5 hover:text-teal">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Settings
              </Link>
              <Link href={`${APP_URL}/dashboard`} onClick={() => setOpen(false)} className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-teal/5 hover:text-teal">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                Dashboard
              </Link>
              <button
                onClick={() => { setOpen(false); signOut({ callbackUrl: "/" }) }}
                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-zinc-600 transition-colors hover:bg-red-50 hover:text-red-600"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Log out
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
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
  // Pricing has its own early-access urgency banner - stacking the global
  // announcement on top of it doubles up on urgency messaging.
  // Gated on announcementReady so repeat visitors (who already dismissed it) never
  // see the banner flash in and animate-collapse before the localStorage check runs.
  const showAnnouncement = announcementReady && announcementVisible && pathname !== "/pricing"

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

  return (
    <div className="fixed left-0 right-0 top-0 z-50 flex flex-col">
      <AnimatePresence>
        {showAnnouncement && (
          <motion.div
            initial={{ height: 40, opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden bg-[#1f5e57]"
          >
            <div className="relative flex h-10 items-center justify-center gap-2 px-10 text-sm font-medium text-white sm:gap-3 sm:px-4">
              <span className="hidden h-5 w-5 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/10 sm:inline-flex">
                <QalamMark size={20} className="rounded-full border-0 shadow-none" />
              </span>
              <span className="truncate">
                <strong>Coming soon:</strong> <span className="hidden sm:inline">agency workspaces with separate client voice memory</span><span className="sm:hidden">agency workspaces</span>
              </span>
              <Link
                href="/pricing#agency"
                className="inline-flex shrink-0 items-center gap-1 text-gold-100 underline underline-offset-2 transition-colors hover:text-white"
              >
                <span className="hidden sm:inline">View plans</span><span className="sm:hidden">Plans</span> <ChevronRightIcon className="h-3.5 w-3.5" />
              </Link>
              <button
                onClick={() => {
                  localStorage.setItem("qalam_announce_dismissed", "1")
                  setAnnouncementVisible(false)
                }}
                className="absolute right-4 text-lg leading-none text-white/60 transition-colors hover:text-white"
                aria-label="Dismiss"
              >
                <span aria-hidden="true">&times;</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.nav
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className={`glass border-b transition-all duration-300 ${
          scrolled ? "border-zinc-200/90 shadow-[0_2px_24px_rgba(13,74,69,0.08)]" : "border-transparent"
        }`}
      >
        <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-6">
          <QalamLogo href="/" size={32} />

          <div className="hidden items-center gap-1 md:flex">
            <NavDropdown label="Product" links={PRODUCT_LINKS} />
            <NavDropdown label="Use Cases" links={USE_CASE_LINKS} />
            {STATIC_LINKS.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="nav-underline rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 transition-all duration-150 hover:bg-teal/10 hover:text-teal"
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="hidden items-center gap-3 md:flex">
            {status === "loading" ? (
              <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse" />
            ) : session?.user?.id ? (
              <UserMenu session={session} />
            ) : (
              <>
                <Link href={`${APP_URL}/login`} className="nav-underline px-2 py-2 text-sm font-medium text-zinc-600 hover:text-teal">Log in</Link>
                <Link
                  href={`${APP_URL}/signup`}
                  className="press rounded-lg bg-teal px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-teal-600 hover:shadow-md"
                >
                  Start free
                </Link>
              </>
            )}
          </div>

          <button
            className="flex flex-col gap-1.5 rounded-lg p-2 transition-colors hover:bg-zinc-100 md:hidden"
            onClick={() => setMobileOpen((o) => !o)}
            aria-label="Toggle menu"
          >
            <motion.span animate={mobileOpen ? { rotate: 45, y: 8 } : { rotate: 0, y: 0 }} transition={{ duration: 0.2 }} className="block h-0.5 w-5 origin-center rounded-full bg-zinc-700" />
            <motion.span animate={mobileOpen ? { opacity: 0 } : { opacity: 1 }} transition={{ duration: 0.15 }} className="block h-0.5 w-5 rounded-full bg-zinc-700" />
            <motion.span animate={mobileOpen ? { rotate: -45, y: -8 } : { rotate: 0, y: 0 }} transition={{ duration: 0.2 }} className="block h-0.5 w-5 origin-center rounded-full bg-zinc-700" />
          </button>
        </div>

        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="overflow-hidden border-t border-zinc-200 md:hidden"
            >
              <div className="flex flex-col gap-1 px-6 py-4">
                {/* Product section */}
                <button
                  onClick={() => setMobileSection(mobileSection === "product" ? null : "product")}
                  className="flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium text-zinc-600 transition-all hover:bg-teal/10 hover:text-teal"
                >
                  Product
                  <motion.span animate={{ rotate: mobileSection === "product" ? 180 : 0 }} transition={{ duration: 0.18 }} className="inline-flex">
                    <ChevronDownIcon className="h-3.5 w-3.5" />
                  </motion.span>
                </button>
                <AnimatePresence>
                  {mobileSection === "product" && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden pl-4">
                      {PRODUCT_LINKS.map((link) => (
                        <Link key={link.href} href={link.href} onClick={() => setMobileOpen(false)} className="block rounded-lg px-3 py-2 text-sm text-zinc-600 hover:text-teal">
                          {link.label}
                        </Link>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Use Cases section */}
                <button
                  onClick={() => setMobileSection(mobileSection === "use-cases" ? null : "use-cases")}
                  className="flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium text-zinc-600 transition-all hover:bg-teal/10 hover:text-teal"
                >
                  Use Cases
                  <motion.span animate={{ rotate: mobileSection === "use-cases" ? 180 : 0 }} transition={{ duration: 0.18 }} className="inline-flex">
                    <ChevronDownIcon className="h-3.5 w-3.5" />
                  </motion.span>
                </button>
                <AnimatePresence>
                  {mobileSection === "use-cases" && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden pl-4">
                      {USE_CASE_LINKS.map((link) => (
                        <Link key={link.href} href={link.href} onClick={() => setMobileOpen(false)} className="block rounded-lg px-3 py-2 text-sm text-zinc-600 hover:text-teal">
                          {link.label}
                        </Link>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>

                {STATIC_LINKS.map((link) => (
                  <Link key={link.label} href={link.href} onClick={() => setMobileOpen(false)} className="rounded-lg px-3 py-2.5 text-sm font-medium text-zinc-600 transition-all hover:bg-teal/10 hover:text-teal">
                    {link.label}
                  </Link>
                ))}

                <div className="mt-3 flex flex-col gap-1 border-t border-zinc-200 pt-3">
                  {status === "loading" ? (
                    <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse" />
                  ) : session?.user?.id ? (
                    <>
                      <div className="mb-1 flex items-center gap-2.5 px-3 py-2">
                        {session.user?.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={session.user.image} alt="Profile" className="h-8 w-8 rounded-full object-cover ring-2 ring-teal/20" />
                        ) : (
                          <UserAvatar name={session.user?.name || "U"} imageUrl={null} />
                        )}
                        <div>
                          <p className="text-sm font-semibold text-zinc-900">{session.user?.name}</p>
                          <p className="text-xs text-zinc-400">{session.user?.email}</p>
                        </div>
                      </div>
                      <Link href={`${APP_URL}/settings`} onClick={() => setMobileOpen(false)} className="rounded-lg px-3 py-2.5 text-sm font-medium text-zinc-600 hover:bg-teal/10 hover:text-teal">Settings</Link>
                      <Link href={`${APP_URL}/dashboard`} onClick={() => setMobileOpen(false)} className="rounded-lg px-3 py-2.5 text-sm font-medium text-zinc-600 hover:bg-teal/10 hover:text-teal">Dashboard</Link>
                      <button onClick={() => signOut({ callbackUrl: "/" })} className="rounded-lg px-3 py-2.5 text-left text-sm font-medium text-zinc-600 hover:bg-red-50 hover:text-red-600">
                        Log out
                      </button>
                    </>
                  ) : (
                    <>
                      <Link href={`${APP_URL}/login`} onClick={() => setMobileOpen(false)} className="rounded-lg px-3 py-2.5 text-sm font-medium text-zinc-700 hover:bg-teal/10 hover:text-teal">Log in</Link>
                      <Link
                        href={`${APP_URL}/signup`}
                        onClick={() => setMobileOpen(false)}
                        className="rounded-lg bg-teal px-3 py-2.5 text-center text-sm font-semibold text-white shadow-sm transition-colors hover:bg-teal-600"
                      >
                        Start free
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>
    </div>
  )
}

