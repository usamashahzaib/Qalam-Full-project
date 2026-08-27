"use client"

import { useState, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { AGENCY_PLAN_LIVE, MANAGED_PLANS, formatPkr } from "@/lib/pricing"

const APPLICATION_PACKAGES = [
  ...MANAGED_PLANS.map((plan) => ({
    name: plan.name,
    detail: `${formatPkr(plan.monthlyPrice)}/month, ${plan.postsPerMonth} posts`,
  })),
  ...(AGENCY_PLAN_LIVE ? [{ name: "Agency", detail: "5 client workspaces" }] : []),
]

type FormState = "idle" | "loading" | "success" | "error"

const inputClass =
  "w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 placeholder-zinc-400 outline-none transition-all focus:border-teal/50 focus:bg-white focus:ring-2 focus:ring-teal/10"

const labelClass = "mb-1.5 block text-sm font-semibold text-zinc-700"

export function ManagedApplyForm({ defaultPackage, defaultAccountType }: { defaultPackage?: string; defaultAccountType?: "individual" | "company" }) {
  const [state, setState] = useState<FormState>("idle")
  const [error, setError] = useState<string | null>(null)
  const [accountType, setAccountType] = useState<"individual" | "company">(defaultAccountType || "individual")
  const formRef = useRef<HTMLFormElement>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setState("loading")

    const data = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>

    try {
      const res = await fetch("/api/managed/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? "Something went wrong. Please try again.")
        setState("error")
        return
      }
      setState("success")
      formRef.current?.reset()
    } catch {
      setError("Network error. Check your connection and try again.")
      setState("error")
    }
  }

  return (
    <div className="rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm">
      <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-gold-700">Apply for Managed Services</p>
      <h2 className="mb-1 text-2xl font-bold text-zinc-900">Tell us about your account</h2>
      <p className="mb-6 text-sm leading-relaxed text-zinc-500">
        We read every application personally and reply within one business day with next steps and pricing confirmation.
      </p>

      <div className="mb-7 grid grid-cols-2 gap-1 rounded-xl border border-zinc-200 bg-zinc-50 p-1">
        <button
          type="button"
          onClick={() => setAccountType("individual")}
          disabled={state === "loading"}
          className={`rounded-lg py-2.5 text-sm font-semibold transition-all duration-150 ${
            accountType === "individual" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
          }`}
        >
          Individual
        </button>
        <button
          type="button"
          onClick={() => setAccountType("company")}
          disabled={state === "loading"}
          className={`rounded-lg py-2.5 text-sm font-semibold transition-all duration-150 ${
            accountType === "company" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
          }`}
        >
          Company
        </button>
      </div>

      <AnimatePresence mode="wait">
        {state === "success" ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="flex flex-col items-center gap-4 rounded-2xl border border-emerald-100 bg-emerald-50 px-6 py-10 text-center"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
              <svg className="h-6 w-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </span>
            <div>
              <p className="text-base font-bold text-emerald-800">Application received</p>
              <p className="mt-1 text-sm text-emerald-700">We&apos;ll email you within one business day.</p>
            </div>
            <button
              onClick={() => setState("idle")}
              className="mt-1 text-xs font-semibold text-emerald-600 underline underline-offset-2 hover:text-emerald-800"
            >
              Apply for another account
            </button>
          </motion.div>
        ) : (
          <motion.form
            key={`form-${accountType}`}
            ref={formRef}
            onSubmit={handleSubmit}
            noValidate
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col gap-5"
          >
            <input type="hidden" name="accountType" value={accountType} />

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="managed-name" className={labelClass}>{accountType === "company" ? "Contact name" : "Name"}</label>
                <input id="managed-name" name="name" type="text" maxLength={100} required placeholder="Your full name" className={inputClass} disabled={state === "loading"} />
              </div>
              <div>
                <label htmlFor="managed-email" className={labelClass}>Email</label>
                <input id="managed-email" name="email" type="email" maxLength={200} required placeholder="you@company.com" className={inputClass} disabled={state === "loading"} />
              </div>
            </div>

            {accountType === "company" ? (
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label htmlFor="managed-company" className={labelClass}>Company name</label>
                  <input id="managed-company" name="company" type="text" maxLength={150} required placeholder="Your company or brand" className={inputClass} disabled={state === "loading"} />
                </div>
                <div>
                  <label htmlFor="managed-team-size" className={labelClass}>Team size / LinkedIn profiles to manage</label>
                  <input id="managed-team-size" name="teamSize" type="text" maxLength={50} placeholder="e.g. 3 executives" className={inputClass} disabled={state === "loading"} />
                </div>
              </div>
            ) : (
              <div>
                <label htmlFor="managed-linkedin" className={labelClass}>LinkedIn profile URL</label>
                <input id="managed-linkedin" name="linkedinUrl" type="url" maxLength={300} placeholder="https://linkedin.com/in/you" className={inputClass} disabled={state === "loading"} />
              </div>
            )}

            {accountType === "company" ? (
              <div>
                <label htmlFor="managed-linkedin" className={labelClass}>Primary LinkedIn profile URL (optional)</label>
                <input id="managed-linkedin" name="linkedinUrl" type="url" maxLength={300} placeholder="https://linkedin.com/in/your-exec" className={inputClass} disabled={state === "loading"} />
              </div>
            ) : null}

            <div>
              <label htmlFor="managed-package" className={labelClass}>Package</label>
              <select id="managed-package" name="package" defaultValue={defaultPackage || MANAGED_PLANS[0].name} required className={inputClass} disabled={state === "loading"}>
                {APPLICATION_PACKAGES.map((p) => (
                  <option key={p.name} value={p.name}>{p.name} - {p.detail}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="managed-message" className={labelClass}>What do you need? (optional)</label>
              <textarea id="managed-message" name="message" maxLength={2000} rows={4} placeholder="Your niche, goals, posting cadence, anything that helps us scope this." className={`${inputClass} resize-y`} disabled={state === "loading"} />
            </div>

            <AnimatePresence>
              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>

            <motion.button
              type="submit"
              disabled={state === "loading"}
              whileHover={{ scale: state === "loading" ? 1 : 1.01 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center justify-center gap-2 rounded-xl bg-gold px-6 py-3.5 text-sm font-bold text-teal-900 shadow-sm transition-colors hover:bg-gold-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {state === "loading" ? "Sending..." : "Submit application"}
            </motion.button>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  )
}
