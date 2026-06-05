"use client"

import { useMemo } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { useAuth } from "@/components/providers/AuthProvider"
import { ArchiveIcon, CheckIcon, LinkedInIcon, VoiceIcon } from "@/components/ui/qalam-icons"
import { QalamLogo } from "@/components/QalamLogo"

export default function LoginPage() {
  const { beginLinkedInAuth } = useAuth()
  const authQuery = useMemo(() => {
    if (typeof window === "undefined") return { nextPath: "/dashboard", linkedInFailed: false }
    const params = new URLSearchParams(window.location.search)
    const next = params.get("next")
    return {
      nextPath: next && next.startsWith("/") ? next : "/dashboard",
      linkedInFailed: params.get("linkedin") === "failed",
    }
  }, [])

  return (
    <div className="flex min-h-screen font-jakarta">
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-teal p-12 lg:flex">
        <div className="absolute right-[-10%] top-[-20%] h-[500px] w-[500px] rounded-full opacity-25 mesh-blob" style={{ background: "radial-gradient(circle, rgba(255,255,255,0.2) 0%, transparent 70%)", ["--dur" as string]: "18s" }} />
        <div className="absolute bottom-[-20%] left-[-10%] h-[400px] w-[400px] rounded-full opacity-20 mesh-blob" style={{ background: "radial-gradient(circle, rgba(201,135,31,0.4) 0%, transparent 70%)", ["--dur" as string]: "22s", animationDelay: "5s" }} />

        <QalamLogo href="/" size={40} priority textClassName="text-xl font-bold text-white" containerClassName="relative z-10 flex items-center gap-2" />

        <div className="relative z-10">
          <p className="mb-6 font-cormorant text-3xl italic leading-relaxed text-white/90">
            Write in your own voice. Keep every draft, edit, and performance signal in one place.
          </p>
          <div className="space-y-4">
            {[
              { icon: VoiceIcon, text: "Connect LinkedIn to publish directly from Qalam" },
              { icon: ArchiveIcon, text: "Your voice profile trains on every post you write and approve" },
              { icon: CheckIcon, text: "Archive, hooks, and outcomes stay attached to your account" },
            ].map((item) => {
              const Icon = item.icon
              return (
                <div key={item.text} className="flex items-start gap-3 text-sm text-white/72">
                  <Icon className="mt-0.5 h-4 w-4 text-gold" />
                  <span>{item.text}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center bg-white px-6 py-12">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }} className="w-full max-w-[420px]">
          <QalamLogo href="/" size={32} containerClassName="mb-10 flex items-center gap-2 lg:hidden" />

          <h1 className="mb-2 text-3xl font-extrabold text-zinc-900">Welcome back</h1>
          <p className="mb-8 text-zinc-500">
            Don&apos;t have an account?{" "}
            <Link href="/auth/sign-up" className="font-semibold text-teal hover:underline">
              Sign up free
            </Link>
          </p>

          {authQuery.linkedInFailed && (
            <p className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs leading-relaxed text-red-700">
              LinkedIn authentication did not complete. Please try again.
            </p>
          )}

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => beginLinkedInAuth(authQuery.nextPath)}
            className="flex w-full items-center justify-center gap-3 rounded-xl bg-[#0A66C2] py-3.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#085fa8]"
          >
            <LinkedInIcon className="h-4 w-4" />
            Continue with LinkedIn
          </motion.button>

          <p className="mt-8 text-center text-xs text-zinc-400">
            By signing in, you agree to our{" "}
            <Link href="/terms" className="underline hover:text-zinc-600">Terms</Link>{" "}
            and{" "}
            <Link href="/privacy" className="underline hover:text-zinc-600">Privacy Policy</Link>.
          </p>
        </motion.div>
      </div>
    </div>
  )
}
