"use client"

import { useState } from "react"
import Link from "next/link"
import { signIn } from "next-auth/react"
import { AuthShell, PasswordField } from "@/components/auth/AuthScene"
import { LinkedInIcon } from "@/components/ui/qalam-icons"
import { QalamSignupNotice } from "@/components/QalamSignupNotice"
import { ReferralBanner, readPendingReferralCode, clearPendingReferralCode } from "@/components/ReferralBanner"
import { SUPPORT_EMAIL } from "@/lib/contact"
import { SITE_URL } from "@/lib/seo"
import { trackMarketingEvent } from "@/lib/marketing-events"

const ROLES = [
  "Consultant",
  "Content Creator",
  "Founder / Entrepreneur",
  "HR Professional",
  "Marketing Professional",
  "Other",
]

type PageState = "form" | "success" | "email_failed"

export default function SignupPage() {
  const [pageState, setPageState] = useState<PageState>("form")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [passwordActive, setPasswordActive] = useState(false)
  const [confirmActive, setConfirmActive] = useState(false)
  const [role, setRole] = useState("")
  const [agreed, setAgreed] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [socialLoading, setSocialLoading] = useState<"linkedin" | null>(null)
  const [referralCode, setReferralCode] = useState<string>(() => readPendingReferralCode())

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
        body: JSON.stringify({ name, email, password, role, referralCode: referralCode || undefined }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Something went wrong. Please try again.")
      } else {
        clearPendingReferralCode()
        trackMarketingEvent("signup_complete", { method: "credentials", verification_email_sent: !data.emailFailed })
        setPageState(data.emailFailed ? "email_failed" : "success")
      }
    } catch {
      setError("Could not connect to the server. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  const handleSocial = async (provider: "linkedin") => {
    setSocialLoading(provider)
    try {
      await signIn(provider, { callbackUrl: "/dashboard" })
    } catch {
      setSocialLoading(null)
    }
  }

  return (
    <AuthShell
      watching={passwordActive || confirmActive}
      eyebrow="Start with proof"
      headline="Build one credible professional story from the work you have already done."
      points={[
        "Start free with no payment card.",
        "Keep every draft and career asset under your control.",
        "Qalam never invents experience or posts automatically.",
      ]}
    >
        <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
          {pageState === "email_failed" ? (
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-200 bg-amber-50">
                <svg className="h-7 w-7 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
              </div>
              <h2 className="mb-2 text-xl font-bold text-zinc-900">Account created - verification email did not send</h2>
              <p className="mb-6 text-sm leading-relaxed text-zinc-500">
                Your account for{" "}
                <span className="font-semibold text-zinc-700">{email}</span>{" "}
                was created, but we could not send the verification email. Contact{" "}
                <a href={`mailto:${SUPPORT_EMAIL}`} className="font-semibold text-teal hover:underline">
                  {SUPPORT_EMAIL}
                </a>{" "}
                to verify your address and activate your account.
              </p>
              <Link
                href="/login"
                className="block w-full rounded-xl border border-zinc-300 px-4 py-2.5 text-center text-sm font-bold text-zinc-800 transition-colors hover:bg-zinc-50"
              >
                Go to sign in
              </Link>
            </div>
          ) : pageState === "success" ? (
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
              <p className="mb-4 text-sm text-zinc-500">Free forever. No card required.</p>

              <ReferralBanner onCode={setReferralCode} />
              <QalamSignupNotice className="mb-5" />

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

                <PasswordField
                  id="signup-password"
                  label="Password"
                  value={password}
                  onChange={setPassword}
                  onActiveChange={setPasswordActive}
                  autoComplete="new-password"
                  minLength={8}
                  placeholder="Min. 8 characters"
                />

                <PasswordField
                  id="confirm"
                  label="Confirm password"
                  value={confirm}
                  onChange={setConfirm}
                  onActiveChange={setConfirmActive}
                  autoComplete="new-password"
                  invalid={Boolean(confirm && confirm !== password)}
                  placeholder="Re-enter password"
                />

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
                    <Link href={`${SITE_URL}/legal/terms`} className="font-semibold text-zinc-700 underline hover:text-teal">
                      Terms of Service
                    </Link>
                    {" "}and{" "}
                    <Link href={`${SITE_URL}/legal/privacy`} className="font-semibold text-zinc-700 underline hover:text-teal">
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
                  className="flex w-full items-center justify-center gap-3 rounded-xl border border-[#0A66C2]/30 bg-[#0A66C2]/5 px-4 py-3 text-sm font-semibold text-[#0A66C2] transition-colors hover:bg-[#0A66C2]/10 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <LinkedInIcon className="h-4 w-4 text-[#0A66C2]" />
                  {socialLoading === "linkedin" ? "Redirecting to LinkedIn..." : "Continue with LinkedIn"}
                </button>
                <p className="text-center text-xs text-zinc-400 sm:hidden">Opens LinkedIn app if installed</p>
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
    </AuthShell>
  )
}
