"use client"

import { useCallback, useState } from "react"
import Link from "next/link"
import { signIn } from "next-auth/react"
import { AnimatePresence, motion } from "framer-motion"
import { useLoginPanel } from "@/components/providers/AuthPanelContext"
import { LinkedInIcon } from "@/components/ui/qalam-icons"
import { QalamLogo } from "@/components/QalamLogo"
import { QalamSignupNotice } from "@/components/QalamSignupNotice"

function XIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M4 4L14 14M14 4L4 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

export function AuthSlidePanel() {
  const { isOpen, view, closePanel, openPanel } = useLoginPanel()
  const [loading, setLoading] = useState(false)

  const isSignUp = view === "sign-up"

  const handleLinkedIn = useCallback(async () => {
    setLoading(true)
    await signIn("linkedin", { callbackUrl: "/dashboard" })
  }, [])

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={closePanel}
            aria-hidden="true"
          />

          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label={isSignUp ? "Create account" : "Sign in"}
            className="fixed right-0 top-0 z-50 flex h-full w-full flex-col overflow-y-auto bg-white shadow-2xl sm:max-w-[440px]"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-zinc-100 px-8 py-5">
              <div onClick={closePanel}>
                <QalamLogo href="/" size={32} />
              </div>
              <button
                onClick={closePanel}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700"
                aria-label="Close panel"
              >
                <XIcon />
              </button>
            </div>

            {/* Body */}
            <div className="flex flex-1 flex-col justify-center px-8 py-10">
              <motion.div
                key={view}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              >
                <h2 className="mb-1 text-2xl font-extrabold text-zinc-900">
                  {isSignUp ? "Start publishing with authority" : "Welcome back"}
                </h2>
                <p className="mb-8 text-sm text-zinc-500">
                  {isSignUp ? (
                    <>
                      Already have an account?{" "}
                      <button
                        onClick={() => openPanel("sign-in")}
                        className="font-semibold text-teal hover:underline"
                      >
                        Log in
                      </button>
                    </>
                  ) : (
                    <>
                      New to Qalam?{" "}
                      <button
                        onClick={() => openPanel("sign-up")}
                        className="font-semibold text-teal hover:underline"
                      >
                        Create a free account
                      </button>
                    </>
                  )}
                </p>

                {isSignUp && <QalamSignupNotice className="mb-6" />}

                <motion.button
                  whileHover={{ scale: 1.015 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleLinkedIn}
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-3 rounded-xl bg-[#0A66C2] py-3.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#085fa8] disabled:opacity-70"
                >
                  <LinkedInIcon className="h-4 w-4" />
                  {isSignUp ? "Start with LinkedIn" : "Continue with LinkedIn"}
                </motion.button>

                <p className="mt-8 text-center text-xs text-zinc-400">
                  By continuing, you agree to our{" "}
                  <Link href="/legal/terms" onClick={closePanel} className="underline hover:text-zinc-600">
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link href="/legal/privacy" onClick={closePanel} className="underline hover:text-zinc-600">
                    Privacy Policy
                  </Link>
                  .
                </p>
              </motion.div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
