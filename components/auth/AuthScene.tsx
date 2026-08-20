"use client"

import { useState, type ReactNode } from "react"
import Link from "next/link"
import { motion, useReducedMotion } from "framer-motion"
import { QalamLogo } from "@/components/QalamLogo"

export function AuthGuardian({ watching }: { watching: boolean }) {
  const reduce = useReducedMotion()

  return (
    <svg viewBox="0 0 200 200" className="h-20 w-20 sm:h-24 sm:w-24 lg:h-28 lg:w-28" role="img" aria-label={watching ? "Looking away while you type your password" : "Qalam guide"}>
      <defs>
        <radialGradient id="guardian-face" cx="38%" cy="32%" r="80%">
          <stop offset="0%" stopColor="#1f5e57" />
          <stop offset="100%" stopColor="#0D4A45" />
        </radialGradient>
      </defs>
      <circle cx="100" cy="100" r="86" fill="#0D4A45" opacity="0.08" />
      <circle cx="100" cy="100" r="70" fill="url(#guardian-face)" />
      <path d="M100 40 l7 14 -7 8 -7 -8 Z" fill="#C9871F" />

      <motion.g animate={{ opacity: watching ? 0 : 1 }} transition={{ duration: reduce ? 0 : 0.12 }}>
        <circle cx="80" cy="98" r="9" fill="#fef6e8" />
        <circle cx="120" cy="98" r="9" fill="#fef6e8" />
        <motion.circle cx="80" cy="101" r="4.2" fill="#0D4A45" animate={{ y: watching ? 0 : [0, 1.5, 0] }} transition={reduce ? { duration: 0 } : { duration: 4, repeat: Infinity, ease: "easeInOut" }} />
        <motion.circle cx="120" cy="101" r="4.2" fill="#0D4A45" animate={{ y: watching ? 0 : [0, 1.5, 0] }} transition={reduce ? { duration: 0 } : { duration: 4, repeat: Infinity, ease: "easeInOut" }} />
      </motion.g>

      <motion.g stroke="#fef6e8" strokeWidth="3.5" strokeLinecap="round" fill="none" animate={{ opacity: watching ? 1 : 0 }} transition={{ duration: reduce ? 0 : 0.12 }}>
        <path d="M71 99 q9 7 18 0" />
        <path d="M111 99 q9 7 18 0" />
      </motion.g>

      <path d="M86 120 q14 12 28 0" stroke="#fef6e8" strokeWidth="3.5" strokeLinecap="round" fill="none" opacity="0.9" />

      <motion.g initial={false} animate={{ y: watching ? -36 : 0 }} transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 320, damping: 24 }}>
        <g transform="translate(80 96)">
          <ellipse cx="0" cy="0" rx="15" ry="12" fill="#C9871F" />
          <ellipse cx="0" cy="-1" rx="11" ry="8.5" fill="#f9d387" />
        </g>
        <g transform="translate(120 96)">
          <ellipse cx="0" cy="0" rx="15" ry="12" fill="#C9871F" />
          <ellipse cx="0" cy="-1" rx="11" ry="8.5" fill="#f9d387" />
        </g>
      </motion.g>
    </svg>
  )
}

const DEFAULT_POINTS = [
  "Draft, score, and schedule LinkedIn content that sounds like you.",
  "Turn your experience into ATS-ready resumes and job matches.",
  "One calm workspace for your whole professional presence.",
]

export function AuthShell({
  children,
  watching,
  eyebrow,
  headline,
  points = DEFAULT_POINTS,
}: {
  children: ReactNode
  watching: boolean
  eyebrow: string
  headline: string
  points?: string[]
}) {
  return (
    <div className="app-shell grid min-h-screen grid-cols-1 lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative hidden overflow-hidden bg-teal text-white lg:flex lg:flex-col lg:justify-between">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-[0.12]" style={{ backgroundImage: "radial-gradient(circle at 20% 20%, #ffffff 0, transparent 45%), radial-gradient(circle at 80% 70%, #C9871F 0, transparent 40%)" }} />
        <div className="relative z-10 p-10">
          <QalamLogo href="/" size={30} textClassName="text-xl font-extrabold text-white" containerClassName="flex items-center gap-2" />
        </div>

        <div className="relative z-10 px-10 pb-6">
          <div className="mb-5"><AuthGuardian watching={watching} /></div>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-gold-200">{eyebrow}</p>
          <h2 className="max-w-md text-3xl font-extrabold leading-tight">{headline}</h2>
          <ul className="mt-6 space-y-3">
            {points.map((point) => (
              <li key={point} className="flex items-start gap-3 text-sm text-teal-100/90">
                <svg className="mt-0.5 h-4 w-4 shrink-0 text-gold-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                {point}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative z-10 p-10 text-xs text-teal-100/70">Built from real evidence. Always under your control.</div>
      </aside>

      <main className="grid-bg relative flex items-center justify-center px-4 pb-16 pt-24 sm:pt-16">
        <Link href="/" className="absolute left-4 top-4 z-10 inline-flex min-h-11 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-zinc-500 transition-colors hover:text-teal sm:left-6 sm:top-6 lg:hidden">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          Back to Qalam
        </Link>

        <div className="app-content w-full max-w-sm animate-[fadeInUp_0.5s_ease-out]">
          <div className="mb-5 flex flex-col items-center gap-2 lg:hidden">
            <AuthGuardian watching={watching} />
            <QalamLogo href="/" size={26} textClassName="text-lg font-extrabold text-zinc-900" containerClassName="flex items-center gap-2" />
          </div>
          {children}
        </div>
      </main>
    </div>
  )
}

export function PasswordField({
  id,
  label,
  value,
  onChange,
  onActiveChange,
  autoComplete = "current-password",
  placeholder = "Password",
  required = true,
  minLength,
  invalid = false,
  rightSlot,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  onActiveChange: (active: boolean) => void
  autoComplete?: string
  placeholder?: string
  required?: boolean
  minLength?: number
  invalid?: boolean
  rightSlot?: ReactNode
}) {
  const [show, setShow] = useState(false)
  const [focused, setFocused] = useState(false)

  const setActive = (nextFocused: boolean, nextValue: string) => {
    setFocused(nextFocused)
    onActiveChange(nextFocused || nextValue.length > 0)
  }

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <label className="text-xs font-semibold text-zinc-600" htmlFor={id}>{label}</label>
        {rightSlot}
      </div>
      <div className="relative">
        <input
          id={id}
          type={show ? "text" : "password"}
          autoComplete={autoComplete}
          required={required}
          minLength={minLength}
          value={value}
          onFocus={() => setActive(true, value)}
          onBlur={() => setActive(false, value)}
          onChange={(event) => {
            onChange(event.target.value)
            setActive(focused, event.target.value)
          }}
          placeholder={placeholder}
          className={`min-h-11 w-full rounded-xl border bg-zinc-50 px-4 py-2.5 pr-12 text-sm text-zinc-900 outline-none transition focus:bg-white focus:ring-2 ${invalid ? "border-red-300 focus:border-red-400 focus:ring-red-100" : "border-zinc-200 focus:border-teal focus:ring-teal/10"}`}
        />
        <button type="button" onClick={() => setShow((current) => !current)} aria-label={show ? "Hide password" : "Show password"} className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:text-teal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal">
          {show ? (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.774 3.162 10.066 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>
          ) : (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          )}
        </button>
      </div>
    </div>
  )
}
