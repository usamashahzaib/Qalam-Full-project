"use client"

import { signIn } from "next-auth/react"
import { useSearchParams, useRouter } from "next/navigation"
import { useState } from "react"
import Link from "next/link"
import { QalamLogo } from "@/components/QalamLogo"
import { ReferralBanner } from "@/components/ReferralBanner"

const ERROR_MESSAGES: Record<string, string> = {
  Configuration: "Server configuration error. Please try again shortly or contact support.",
  AccessDenied: "Access was denied. Please try again.",
  Verification: "Verification failed. The link may have expired.",
  CredentialsSignin: "Incorrect email or password.",
  invalid_token: "Invalid or expired verification link. Please request a new one.",
  Default: "Something went wrong. Please try again.",
}

function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.32 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.79M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
    </svg>
  )
}

export default function LoginPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const rawCallback = searchParams.get("callbackUrl") || "/dashboard"
  const callbackUrl = rawCallback.startsWith("/") ? rawCallback : "/dashboard"
  const errorParam = searchParams.get("error")
  const verified = searchParams.get("verified") === "1"

  const errorMessage = errorParam ? (ERROR_MESSAGES[errorParam] ?? ERROR_MESSAGES.Default) : null

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [socialLoading, setSocialLoading] = useState<"linkedin" | null>(null)

  const handleCredentials = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password) return
    setSubmitting(true)
    setFormError(null)

    try {
      const result = await Promise.race([
        signIn("credentials", {
          email: email.trim().toLowerCase(),
          password,
          redirect: false,
        }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error("signin_timeout")), 5000)),
      ])

      if (result?.error || result?.ok === false) {
        const checkRes = await fetch(`/api/auth/check-provider?email=${encodeURIComponent(email.trim().toLowerCase())}`)
          .then(r => r.ok ? r.json() : null).catch(() => null)
        if (checkRes?.provider === "linkedin") {
          setSocialLoading("linkedin")
          await signIn("linkedin", { callbackUrl })
          return
        }
        setFormError("Incorrect email or password.")
        setSubmitting(false)
      } else {
        const safeUrl = callbackUrl?.startsWith("/") ? callbackUrl : "/dashboard"
        router.push(safeUrl)
      }
    } catch {
      setFormError("Incorrect email or password.")
      setSubmitting(false)
    }
  }

  const handleSocial = async (provider: "linkedin") => {
    setSocialLoading(provider)
    try {
      await signIn(provider, { callbackUrl })
    } catch {
      setSocialLoading(null)
    }
  }

  return (
    <div className="app-shell grid-bg relative flex min-h-screen items-center justify-center px-4 pt-28 pb-16 sm:pt-16">
      <Link
        href="/"
        className="absolute left-4 top-4 z-10 inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-zinc-500 transition-colors hover:text-teal sm:left-6 sm:top-6"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
        </svg>
        Back to byqalam.com
      </Link>

      <div className="app-content w-full max-w-sm animate-[fadeInUp_0.5s_ease-out]">
        {/* Logo */}
        <div className="mb-8 flex justify-center">
          <QalamLogo href="/" size={28} textClassName="text-xl font-extrabold text-zinc-900" containerClassName="flex items-center gap-2" />
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
          <h1 className="mb-1 text-2xl font-bold text-zinc-900">Welcome back</h1>
          <p className="mb-6 text-sm text-zinc-500">Sign in to your Qalam workspace.</p>

          <ReferralBanner />

          {/* Verified banner */}
          {verified && (
            <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
              Email verified. You can now sign in.
            </div>
          )}

          {/* Error from URL param */}
          {errorMessage && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMessage}
            </div>
          )}

          {/* Form error */}
          {formError && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {formError}
              <p className="mt-1 text-xs text-red-500">Did you sign up with LinkedIn? Use the button below instead.</p>
            </div>
          )}

          {/* Email / password form */}
          <form onSubmit={handleCredentials} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-zinc-600" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-teal focus:bg-white focus:ring-2 focus:ring-teal/10"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-xs font-semibold text-zinc-600" htmlFor="password">
                  Password
                </label>
                <Link href="/forgot-password" className="text-xs font-semibold text-teal hover:text-teal-700">
                  Forgot password?
                </Link>
              </div>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-teal focus:bg-white focus:ring-2 focus:ring-teal/10"
                placeholder="Password"
              />
            </div>
            <p className="text-center text-xs text-zinc-400">
              By signing in you agree to our{" "}
              <Link href="/legal/terms" className="underline hover:text-zinc-600">Terms</Link>
              {" "}and{" "}
              <Link href="/legal/privacy" className="underline hover:text-zinc-600">Privacy Policy</Link>.
            </p>
            <button
              type="submit"
              disabled={submitting}
              className="press w-full rounded-xl bg-teal px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-teal-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Signing in..." : "Sign in"}
            </button>
          </form>

          {/* Divider */}
          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-zinc-200" />
            <span className="text-xs text-zinc-400">or</span>
            <div className="h-px flex-1 bg-zinc-200" />
          </div>

          {/* Social login */}
          <div>
            <button
              onClick={() => handleSocial("linkedin")}
              disabled={socialLoading !== null}
              className="press flex w-full items-center justify-center gap-3 rounded-xl border border-[#0A66C2]/30 bg-[#0A66C2]/5 px-4 py-3 text-sm font-semibold text-[#0A66C2] transition-colors hover:bg-[#0A66C2]/10 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <LinkedInIcon className="h-4 w-4 text-[#0A66C2]" />
              {socialLoading === "linkedin" ? "Redirecting to LinkedIn..." : "Continue with LinkedIn"}
            </button>
            <p className="mt-2 text-center text-[11px] text-zinc-400 sm:hidden">Opens LinkedIn app if installed</p>
          </div>

          {/* Sign up link */}
          <p className="mt-6 text-center text-sm text-zinc-500">
            No account?{" "}
            <Link href="/signup" className="font-semibold text-teal hover:text-teal-700">
              Create one free
            </Link>
          </p>
        </div>

      </div>
    </div>
  )
}
