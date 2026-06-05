"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useAuth } from "@/components/providers/AuthProvider"
import { QalamLogo } from "@/components/QalamLogo"
import { CheckIcon, LinkedInIcon } from "@/components/ui/qalam-icons"

type AuthStatus = "loading" | "success" | "error"

export default function LinkedInCallbackPage() {
  const { completeLinkedInAuth } = useAuth()
  const [status, setStatus] = useState<AuthStatus>("loading")
  const [message, setMessage] = useState("Connecting with LinkedIn...")

  useEffect(() => {
    const next =
      typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("next")
    
    const runAuth = async () => {
      try {
        setMessage("Verifying credentials...")
        const user = await completeLinkedInAuth()
        
        setStatus("success")
        setMessage(`Welcome back, ${user.firstName}!`)
        
        setTimeout(() => {
          window.location.replace(next && next.startsWith("/") ? next : "/dashboard")
        }, 1200)
      } catch (err) {
        console.error("LinkedIn OAuth failure:", err)
        setStatus("error")
        setMessage("Authentication failed.")
        
        setTimeout(() => {
          window.location.replace("/auth?linkedin=failed")
        }, 2000)
      }
    }

    runAuth()
  }, [completeLinkedInAuth])

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-teal font-jakarta p-6">
      {/* Background Orbs */}
      <div className="absolute right-[-10%] top-[-10%] h-[600px] w-[600px] rounded-full opacity-20 mesh-blob" style={{ background: "radial-gradient(circle, rgba(255,255,255,0.2) 0%, transparent 70%)", ["--dur" as string]: "20s" }} />
      <div className="absolute bottom-[-10%] left-[-10%] h-[500px] w-[500px] rounded-full opacity-15 mesh-blob" style={{ background: "radial-gradient(circle, rgba(201,135,31,0.3) 0%, transparent 70%)", ["--dur" as string]: "24s", animationDelay: "4s" }} />

      <div className="relative z-10 flex flex-col items-center text-center">
        <QalamLogo href="" size={48} textClassName="text-2xl font-bold text-white" containerClassName="mb-12 flex items-center gap-2" />

        <div className="relative flex h-32 w-32 items-center justify-center rounded-full bg-white/5 border border-white/10 shadow-[0_0_50px_rgba(255,255,255,0.05)] mb-8">
          <AnimatePresence mode="wait">
            {status === "loading" && (
              <motion.div
                key="loading"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.3 }}
                className="relative flex h-full w-full items-center justify-center"
              >
                {/* Rotating Outer Glow */}
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                  className="absolute inset-0 rounded-full border-t-2 border-r-2 border-gold border-b-transparent border-l-transparent"
                />
                <LinkedInIcon className="h-10 w-10 text-white" />
              </motion.div>
            )}

            {status === "success" && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                transition={{ type: "spring", damping: 15, stiffness: 200 }}
                className="flex h-16 w-16 items-center justify-center rounded-full bg-gold text-white"
              >
                <CheckIcon className="h-8 w-8 text-white stroke-[3px]" />
              </motion.div>
            )}

            {status === "error" && (
              <motion.div
                key="error"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                transition={{ type: "spring", damping: 15, stiffness: 200 }}
                className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500 text-white"
              >
                <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <motion.h2
          animate={{ opacity: [0.7, 1, 0.7] }}
          transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
          className="text-xl font-bold text-white mb-2"
        >
          {message}
        </motion.h2>
        
        <p className="text-sm text-white/50 max-w-[280px]">
          {status === "loading" && "Securing workspace session..."}
          {status === "success" && "Redirecting to your workspace..."}
          {status === "error" && "Unable to authorize via LinkedIn. Returning to login page..."}
        </p>
      </div>
    </div>
  )
}

