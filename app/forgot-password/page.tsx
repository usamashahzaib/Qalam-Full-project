"use client"

import { useState } from "react"
import Link from "next/link"
import { QalamLogo } from "@/components/QalamLogo"

type PageState = "form" | "sent"

export default function ForgotPasswordPage() {
  const [pageState, setPageState] = useState<PageState>("form")
  const [email, setEmail] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Something went wrong. Please try again.")
      } else {
        setPageState("sent")
      }
    } catch {
      setError("Could not connect to the server. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <QalamLogo href="/" size={28} textClassName="text-xl font-extrabold text-zinc-900" containerClassName="flex items-center gap-2" />
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
          {pageState === "sent" ? (
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-teal/20 bg-teal/5">
                <svg className="h-7 w-7 text-teal" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 className="mb-2 text-xl font-bold text-zinc-900">Check your email</h2>
              <p className="mb-6 text-sm leading-relaxed text-zinc-500">
                If <span className="font-semibold text-zinc-700">{email}</span> is registered,
                you&apos;ll receive a password reset link shortly. It expires in 1 hour.
              </p>
              <Link
                href="/login"
                className="block w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-center text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
              >
                Back to sign in
              </Link>
            </div>
          ) : (
            <>
              <h1 className="mb-1 text-2xl font-bold text-zinc-900">Forgot password?</h1>
              <p className="mb-6 text-sm text-zinc-500">
                Enter your email and we&apos;ll send a reset link if the account exists.
              </p>

              {error && (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-zinc-600" htmlFor="email">
                    Email address
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
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-xl bg-teal px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-teal-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? "Sending…" : "Send reset link"}
                </button>
              </form>

              <p className="mt-6 text-center text-sm text-zinc-500">
                Remember it?{" "}
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
