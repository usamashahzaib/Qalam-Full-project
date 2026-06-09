"use client"

import { Suspense, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { QalamLogo } from "@/components/QalamLogo"

type PageState = "form" | "success"

function ResetPasswordForm() {
  const searchParams = useSearchParams()
  const token = searchParams.get("token") ?? ""

  const [pageState, setPageState] = useState<PageState>("form")
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (!token) {
    return (
      <div className="text-center">
        <p className="mb-4 text-sm text-zinc-600">
          This reset link is invalid or has expired.
        </p>
        <Link href="/forgot-password" className="font-semibold text-teal hover:text-teal-700">
          Request a new link
        </Link>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password !== confirm) {
      setError("Passwords do not match.")
      return
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.")
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
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

  if (pageState === "success") {
    return (
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50">
          <svg className="h-7 w-7 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="mb-2 text-xl font-bold text-zinc-900">Password updated</h2>
        <p className="mb-6 text-sm text-zinc-500">
          Your password has been reset. Sign in with your new password.
        </p>
        <Link
          href="/login"
          className="block w-full rounded-xl bg-teal px-4 py-2.5 text-center text-sm font-bold text-white transition-colors hover:bg-teal-600"
        >
          Sign in
        </Link>
      </div>
    )
  }

  return (
    <>
      <h1 className="mb-1 text-2xl font-bold text-zinc-900">Set new password</h1>
      <p className="mb-6 text-sm text-zinc-500">Choose a password with at least 8 characters.</p>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-zinc-600" htmlFor="new-password">
            New password
          </label>
          <input
            id="new-password"
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
          <label className="mb-1.5 block text-xs font-semibold text-zinc-600" htmlFor="confirm-password">
            Confirm new password
          </label>
          <input
            id="confirm-password"
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
            placeholder="Re-enter new password"
          />
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-xl bg-teal px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-teal-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Updating…" : "Update password"}
        </button>
      </form>
    </>
  )
}

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <QalamLogo href="/" size={28} textClassName="text-xl font-extrabold text-zinc-900" containerClassName="flex items-center gap-2" />
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
          <Suspense fallback={<div className="h-40 animate-pulse rounded-xl bg-zinc-100" />}>
            <ResetPasswordForm />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
