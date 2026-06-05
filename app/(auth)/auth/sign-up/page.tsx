"use client"

import { useMemo } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { useAuth } from "@/components/providers/AuthProvider"
import { AnalyticsIcon, ArchiveIcon, LinkedInIcon, VoiceIcon } from "@/components/ui/qalam-icons"
import { QalamLogo } from "@/components/QalamLogo"

const SOCIAL_PROOF = ["No credit card required", "LinkedIn-first sign-in", "LinkedIn publishing path included"]

export default function SignupPage() {
  const { beginLinkedInAuth } = useAuth()
  const nextPath = useMemo(() => {
    if (typeof window === "undefined") return "/dashboard"
    const next = new URLSearchParams(window.location.search).get("next")
    return next && next.startsWith("/") ? next : "/dashboard"
  }, [])

  return (
    <div className="flex min-h-screen font-jakarta">
      <div className="relative order-2 hidden w-1/2 flex-col justify-between overflow-hidden bg-teal-800 p-12 lg:flex">
        <div
          className="absolute right-[-10%] top-[-20%] h-[500px] w-[500px] rounded-full opacity-20 mesh-blob"
          style={{ background: "radial-gradient(circle, rgba(201,135,31,0.4) 0%, transparent 70%)", ["--dur" as string]: "20s" }}
        />
        <div
          className="absolute bottom-[-20%] left-[-10%] h-[400px] w-[400px] rounded-full opacity-25 mesh-blob"
          style={{ background: "radial-gradient(circle, rgba(255,255,255,0.15) 0%, transparent 70%)", ["--dur" as string]: "16s" }}
        />

        <QalamLogo
          href="/"
          size={40}
          priority
          textClassName="text-xl font-bold text-white"
          containerClassName="relative z-10 flex items-center gap-2"
        />

        <div className="relative z-10 space-y-8">
          <div>
            <h2 className="mb-3 text-4xl font-extrabold leading-tight text-white">
              Start building your
              <br />
              <span className="text-gold">content system</span>
              <br />
              today.
            </h2>
            <p className="font-cormorant text-xl italic leading-relaxed text-white/60">
              Connect LinkedIn and your writing system is live: voice profile, post archive, and direct publishing in one place.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {[
              { icon: VoiceIcon, label: "Voice Profile", value: "Trains from your real posts, not generic prompts" },
              { icon: ArchiveIcon, label: "Post archive", value: "Every draft, hook, and outcome stays in one place" },
              { icon: AnalyticsIcon, label: "LinkedIn publishing", value: "Schedule and publish directly from Qalam" },
            ].map((stat) => {
              const Icon = stat.icon
              return (
                <div key={stat.label} className="flex items-center gap-4 rounded-xl border border-white/10 bg-white/5 p-4">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-gold">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-xs text-white/60">{stat.label}</p>
                    <p className="text-xl font-bold text-white">{stat.value}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="order-1 flex flex-1 items-center justify-center bg-white px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-[420px]"
        >
          <QalamLogo href="/" size={32} containerClassName="mb-10 flex items-center gap-2 lg:hidden" />

          <h1 className="mb-1 text-3xl font-extrabold text-zinc-900">Create your account</h1>
          <p className="mb-6 text-zinc-500">
            Already have an account?{" "}
            <Link href="/auth" className="font-semibold text-teal hover:underline">
              Sign in
            </Link>
          </p>

          <div className="mb-8 flex flex-wrap gap-2">
            {SOCIAL_PROOF.map((proof) => (
              <span key={proof} className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs text-zinc-600">
                {proof}
              </span>
            ))}
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => beginLinkedInAuth(nextPath)}
            className="flex w-full items-center justify-center gap-3 rounded-xl bg-[#0A66C2] py-3.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#085fa8]"
          >
            <LinkedInIcon className="h-4 w-4" />
            Start with LinkedIn
          </motion.button>

          <p className="mt-8 text-center text-xs text-zinc-400">
            By creating an account, you agree to our{" "}
            <Link href="/terms" className="underline hover:text-zinc-600">Terms of Service</Link>{" "}
            and{" "}
            <Link href="/privacy" className="underline hover:text-zinc-600">Privacy Policy</Link>.
          </p>
        </motion.div>
      </div>
    </div>
  )
}
