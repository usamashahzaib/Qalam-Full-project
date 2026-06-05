"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"

const APP_ORIGIN = (process.env.NEXT_PUBLIC_APP_URL || "https://app.byqalam.com").replace(/\/$/, "")

const NAV_LINKS = [
  { label: "Features", href: "/#features" },
  { label: "Pricing", href: "/pricing" },
  { label: "Free Tools", href: "/free-tools" },
  { label: "Use Cases", href: "/#use-cases" },
  { label: "Blog", href: "/blog" },
]

function QalamLogo() {
  return (
    <Link href="/" className="flex items-center gap-2 select-none">
      <div className="w-8 h-8 rounded-lg bg-teal flex items-center justify-center">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path
            d="M3 13 C3 13 5 11 8 7 C11 3 13 2 13 2"
            stroke="#C9871F"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <circle cx="13" cy="2" r="1.5" fill="#C9871F" />
          <path
            d="M3 13 L2 14.5"
            stroke="#C9871F"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </div>
        <span className="text-xl font-bold text-teal tracking-tight">ByQalam</span>
    </Link>
  )
}

export function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [announcementVisible, setAnnouncementVisible] = useState(true)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16)
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex flex-col">
      {/* Announcement bar */}
      <AnimatePresence>
        {announcementVisible && (
          <motion.div
            initial={{ height: 40, opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden bg-[#2d6a4f]"
          >
            <div className="flex items-center justify-center gap-3 px-4 h-10 text-sm text-white font-medium">
              <span>✨</span>
              <span>
                <strong>NEW —</strong> AI Voice Fingerprint is live
              </span>
              <Link
                href="/free-tools"
                className="underline underline-offset-2 text-gold-100 hover:text-white transition-colors"
              >
                Try it free →
              </Link>
              <button
                onClick={() => setAnnouncementVisible(false)}
                className="absolute right-4 text-white/60 hover:text-white transition-colors text-lg leading-none"
                aria-label="Dismiss"
              >
                ×
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main nav */}
      <motion.nav
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className={`glass border-b transition-all duration-300 ${
          scrolled
            ? "border-zinc-200/90 shadow-[0_2px_24px_rgba(13,74,69,0.08)]"
            : "border-transparent"
        }`}
      >
        <div className="max-w-[1200px] mx-auto px-6 flex items-center justify-between h-16">
          <QalamLogo />

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="px-3 py-2 text-sm font-medium text-zinc-600 hover:text-teal rounded-lg hover:bg-teal/10 transition-all duration-150"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Desktop CTAs */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              href={`${APP_ORIGIN}/auth`}
              className="px-4 py-2 text-sm font-semibold text-teal hover:bg-teal/10 rounded-lg transition-colors"
            >
              Log In
            </Link>
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Link
                href={`${APP_ORIGIN}/auth/sign-up`}
                className="px-4 py-2 text-sm font-semibold text-white bg-teal hover:bg-teal-600 rounded-lg transition-colors shadow-sm"
              >
                Get Started Free
              </Link>
            </motion.div>
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden flex flex-col gap-1.5 p-2 rounded-lg hover:bg-zinc-100 transition-colors"
            onClick={() => setMobileOpen((o) => !o)}
            aria-label="Toggle menu"
          >
            <motion.span
              animate={mobileOpen ? { rotate: 45, y: 8 } : { rotate: 0, y: 0 }}
              transition={{ duration: 0.2 }}
              className="block w-5 h-0.5 bg-zinc-700 rounded-full origin-center"
            />
            <motion.span
              animate={mobileOpen ? { opacity: 0 } : { opacity: 1 }}
              transition={{ duration: 0.15 }}
              className="block w-5 h-0.5 bg-zinc-700 rounded-full"
            />
            <motion.span
              animate={mobileOpen ? { rotate: -45, y: -8 } : { rotate: 0, y: 0 }}
              transition={{ duration: 0.2 }}
              className="block w-5 h-0.5 bg-zinc-700 rounded-full origin-center"
            />
          </button>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="overflow-hidden md:hidden border-t border-zinc-200"
            >
              <div className="px-6 py-4 flex flex-col gap-1">
                {NAV_LINKS.map((link) => (
                  <Link
                    key={link.label}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className="px-3 py-2.5 text-sm font-medium text-zinc-600 hover:text-teal hover:bg-teal/10 rounded-lg transition-all"
                  >
                    {link.label}
                  </Link>
                ))}
                <div className="mt-3 pt-3 border-t border-zinc-200 flex flex-col gap-2">
                  <Link
                    href={`${APP_ORIGIN}/auth`}
                    onClick={() => setMobileOpen(false)}
                    className="px-3 py-2.5 text-sm font-semibold text-teal hover:bg-teal/10 rounded-lg transition-colors text-center"
                  >
                    Log In
                  </Link>
                  <Link
                    href={`${APP_ORIGIN}/auth/sign-up`}
                    onClick={() => setMobileOpen(false)}
                    className="px-3 py-2.5 text-sm font-semibold text-white bg-teal hover:bg-teal-600 rounded-lg transition-colors text-center"
                  >
                    Get Started Free
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>
    </div>
  )
}
