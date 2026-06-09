"use client"

import { signIn } from "next-auth/react"
import { useSearchParams, useRouter } from "next/navigation"
import { useState } from "react"
import Link from "next/link"
import { QalamLogo } from "@/components/QalamLogo"

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

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  )
}

export default function LoginPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard"
  const errorParam = searchParams.get("error")
  const verified = searchParams.get("verified") === "1"

  const errorMessage = errorParam ? (ERROR_MESSAGES[errorParam] ?? ERROR_MESSAGES.Default) : null

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [socialLoading, setSocialLoading] = useState<"linkedin" | "google" | null>(null)

  const handleCredentials = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password) return
    setSubmitting(true)
    setFormError(null)

    const result = await signIn("credentials", {
      email: email.trim().toLowerCase(),
      password,
      redirect: false,
    })

    if (result?.error) {
      setFormError("Incorrect email or password.")
      setSubmitting(false)
    } else {
      router.push(callbackUrl)
    }
  }

  const handleSocial = async (provider: "linkedin" | "google") => {
    setSocialLoading(provider)
    try {
      await signIn(provider, { callbackUrl })
    } catch {
      setSocialLoading(null)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 py-16">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 flex justify-center">
          <QalamLogo href="/" size={28} textClassName="text-xl font-extrabold text-zinc-900" containerClassName="flex items-center gap-2" />
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
          <h1 className="mb-1 text-2xl font-bold text-zinc-900">Welcome back</h1>
          <p className="mb-6 text-sm text-zinc-500">Sign in to your Qalam workspace.</p>

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
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-teal px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-teal-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Signing in…" : "Sign in"}
            </button>
          </form>

          {/* Divider */}
          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-zinc-200" />
            <span className="text-xs text-zinc-400">or</span>
            <div className="h-px flex-1 bg-zinc-200" />
          </div>

          {/* Social login */}
          <div className="space-y-2.5">
            <button
              onClick={() => handleSocial("linkedin")}
              disabled={socialLoading !== null}
              className="flex w-full items-center justify-center gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-800 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <LinkedInIcon className="h-4 w-4 text-[#0A66C2]" />
              {socialLoading === "linkedin" ? "Redirecting…" : "Continue with LinkedIn"}
            </button>
            <button
              onClick={() => handleSocial("google")}
              disabled={socialLoading !== null}
              className="flex w-full items-center justify-center gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-800 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <GoogleIcon className="h-4 w-4" />
              {socialLoading === "google" ? "Redirecting…" : "Continue with Google"}
            </button>
          </div>

          {/* Sign up link */}
          <p className="mt-6 text-center text-sm text-zinc-500">
            No account?{" "}
            <Link href="/signup" className="font-semibold text-teal hover:text-teal-700">
              Create one free
            </Link>
          </p>
        </div>

        <p className="mt-4 text-center text-xs text-zinc-400">
          By signing in you agree to our{" "}
          <Link href="/legal/terms" className="underline hover:text-zinc-600">Terms</Link>
          {" "}and{" "}
          <Link href="/legal/privacy" className="underline hover:text-zinc-600">Privacy Policy</Link>.
        </p>
      </div>
    </div>
  )
}
