"use client"

import { useState } from "react"
import Link from "next/link"
import { signIn } from "next-auth/react"
import { QalamLogo } from "@/components/QalamLogo"

const ROLES = [
  "HR Professional",
  "Marketing Professional",
  "Founder / Entrepreneur",
  "Consultant",
  "Content Creator",
  "Other",
]

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

function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.32 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.79M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
    </svg>
  )
}

type PageState = "form" | "success"

export default function SignupPage() {
  const [pageState, setPageState] = useState<PageState>("form")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [role, setRole] = useState("")
  const [agreed, setAgreed] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [socialLoading, setSocialLoading] = useState<"linkedin" | "google" | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password !== confirm) {
      setError("Passwords do not match.")
      return
    }
    if (!agreed) {
      setError("You must agree to the Terms of Service to continue.")
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, role }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Something went wrong. Please try again.")
      } else {
        setPageState("success")
      }
    } catch {
      setError("Could not connect to the server. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  const handleSocial = async (provider: "linkedin" | "google") => {
    setSocialLoading(provider)
    try {
      await signIn(provider, { callbackUrl: "/dashboard" })
    } catch {
      setSocialLoading(null)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <QalamLogo href="/" size={28} textClassName="text-xl font-extrabold text-zinc-900" containerClassName="flex items-center gap-2" />
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
          {pageState === "success" ? (
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50">
                <svg className="h-7 w-7 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="mb-2 text-xl font-bold text-zinc-900">Check your email</h2>
              <p className="mb-6 text-sm leading-relaxed text-zinc-500">
                We sent a verification link to{" "}
                <span className="font-semibold text-zinc-700">{email}</span>.
                Click it to activate your account, then sign in.
              </p>
              <Link
                href="/login"
                className="block w-full rounded-xl bg-teal px-4 py-2.5 text-center text-sm font-bold text-white transition-colors hover:bg-teal-600"
              >
                Go to sign in
              </Link>
            </div>
          ) : (
            <>
              <h1 className="mb-1 text-2xl font-bold text-zinc-900">Create your account</h1>
              <p className="mb-6 text-sm text-zinc-500">Free forever. No card required.</p>

              {error && (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-zinc-600" htmlFor="name">
                    Full name
                  </label>
                  <input
                    id="name"
                    type="text"
                    autoComplete="name"
                    required
                    minLength={2}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-teal focus:bg-white focus:ring-2 focus:ring-teal/10"
                    placeholder="Ayesha Khan"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-zinc-600" htmlFor="signup-email">
                    Work email
                  </label>
                  <input
                    id="signup-email"
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
                  <label className="mb-1.5 block text-xs font-semibold text-zinc-600" htmlFor="signup-password">
                    Password
                  </label>
                  <input
                    id="signup-password"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-teal focus:bg-white focus:ring-2 focus:ring-teal/10"
                    placeholder="Min. 8 characters"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-zinc-600" htmlFor="confirm">
                    Confirm password
                  </label>
                  <input
                    id="confirm"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    className={`w-full rounded-xl border bg-zinc-50 px-4 py-2.5 text-sm text-zinc-900 outline-none transition focus:bg-white focus:ring-2 ${
                      confirm && confirm !== password
                        ? "border-red-300 focus:border-red-400 focus:ring-red-100"
                        : "border-zinc-200 focus:border-teal focus:ring-teal/10"
                    }`}
                    placeholder="Re-enter password"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-zinc-600" htmlFor="role">
                    Your role
                  </label>
                  <select
                    id="role"
                    required
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-teal focus:bg-white focus:ring-2 focus:ring-teal/10"
                  >
                    <option value="" disabled>Select your role…</option>
                    {ROLES.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>

                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-zinc-300 accent-teal"
                  />
                  <span className="text-xs leading-relaxed text-zinc-500">
                    I agree to Qalam&apos;s{" "}
                    <Link href="/legal/terms" className="font-semibold text-zinc-700 underline hover:text-teal">
                      Terms of Service
                    </Link>
                    {" "}and{" "}
                    <Link href="/legal/privacy" className="font-semibold text-zinc-700 underline hover:text-teal">
                      Privacy Policy
                    </Link>.
                  </span>
                </label>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-xl bg-teal px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-teal-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? "Creating account…" : "Create free account"}
                </button>
              </form>

              <div className="my-5 flex items-center gap-3">
                <div className="h-px flex-1 bg-zinc-200" />
                <span className="text-xs text-zinc-400">or sign up with</span>
                <div className="h-px flex-1 bg-zinc-200" />
              </div>

              <div className="space-y-2.5">
                <button
                  onClick={() => handleSocial("linkedin")}
                  disabled={socialLoading !== null}
                  className="flex w-full items-center justify-center gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-800 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <LinkedInIcon className="h-4 w-4 text-[#0A66C2]" />
                  {socialLoading === "linkedin" ? "Redirecting…" : "LinkedIn"}
                </button>
                <button
                  onClick={() => handleSocial("google")}
                  disabled={socialLoading !== null}
                  className="flex w-full items-center justify-center gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-800 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <GoogleIcon className="h-4 w-4" />
                  {socialLoading === "google" ? "Redirecting…" : "Google"}
                </button>
              </div>

              <p className="mt-6 text-center text-sm text-zinc-500">
                Already have an account?{" "}
                <Link href="/login" className="font-semibold text-teal hover:text-teal-700">
                  Sign in
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
