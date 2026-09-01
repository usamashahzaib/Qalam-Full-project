"use client"

import { useState, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"

// Inbound links can name the reason for writing, so the subject arrives
// filled in. /partners is the main caller: a partner who clicked through
// should not land on a blank field and have to restate why they are here.
const SUBJECT_PRESETS: Record<string, string> = {
  partnership: "Partnership enquiry",
  agency: "Agency workspace enquiry",
  press: "Press enquiry",
}

type FormState = "idle" | "loading" | "success" | "error"
type FieldErrors = { name?: string; email?: string; subject?: string; message?: string }

const inputClass =
  "w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 placeholder-zinc-400 outline-none transition-all focus:border-teal/50 focus:bg-white focus:ring-2 focus:ring-teal/10"

const inputErrorClass =
  "w-full rounded-xl border border-red-300 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 placeholder-zinc-400 outline-none transition-all focus:border-red-400 focus:bg-white focus:ring-2 focus:ring-red-100"

const labelClass = "mb-1.5 block text-sm font-semibold text-zinc-700"

function validateFields(data: Record<string, string>): FieldErrors {
  const errors: FieldErrors = {}
  if (!data.name?.trim() || data.name.trim().length < 2) errors.name = "Enter your full name (at least 2 characters)."
  if (!data.email?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) errors.email = "Enter a valid email address."
  if (!data.subject?.trim() || data.subject.trim().length < 3) errors.subject = "Add a subject line (at least 3 characters)."
  if (!data.message?.trim() || data.message.trim().length < 10) errors.message = "Write a message (at least 10 characters)."
  return errors
}

export function ContactForm({ topic }: { topic?: string }) {
  const presetSubject = SUBJECT_PRESETS[topic ?? ""] ?? ""
  const [state, setState] = useState<FormState>("idle")
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const formRef = useRef<HTMLFormElement>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    const data = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>
    const errors = validateFields(data)
    if (Object.keys(errors).length) {
      setFieldErrors(errors)
      return
    }
    setFieldErrors({})
    setState("loading")

    try {
      const res = await fetch("/api/contact", {
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
      <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-teal">Send a message</p>
      <h2 className="mb-1 text-2xl font-bold text-zinc-900">Get in touch</h2>
      <p className="mb-7 text-sm leading-relaxed text-zinc-500">
        We read every message. Expect a reply within 4 hours on business days.
      </p>

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
              <p className="text-base font-bold text-emerald-800">Message sent</p>
              <p className="mt-1 text-sm text-emerald-700">We&apos;ll get back to you within 4 hours.</p>
            </div>
            <button
              onClick={() => setState("idle")}
              className="mt-1 text-xs font-semibold text-emerald-600 underline underline-offset-2 hover:text-emerald-800"
            >
              Send another message
            </button>
          </motion.div>
        ) : (
          <motion.form
            key="form"
            ref={formRef}
            onSubmit={handleSubmit}
            noValidate
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col gap-5"
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="contact-name" className={labelClass}>Name</label>
                <input
                  id="contact-name"
                  name="name"
                  type="text"
                  maxLength={100}
                  placeholder="Your full name"
                  className={fieldErrors.name ? inputErrorClass : inputClass}
                  aria-invalid={fieldErrors.name ? "true" : undefined}
                  disabled={state === "loading"}
                  onChange={() => fieldErrors.name && setFieldErrors((p) => ({ ...p, name: undefined }))}
                />
                {fieldErrors.name && <p className="mt-1 text-xs text-red-600">{fieldErrors.name}</p>}
              </div>
              <div>
                <label htmlFor="contact-email" className={labelClass}>Email</label>
                <input
                  id="contact-email"
                  name="email"
                  type="email"
                  maxLength={200}
                  placeholder="you@example.com"
                  className={fieldErrors.email ? inputErrorClass : inputClass}
                  aria-invalid={fieldErrors.email ? "true" : undefined}
                  disabled={state === "loading"}
                  onChange={() => fieldErrors.email && setFieldErrors((p) => ({ ...p, email: undefined }))}
                />
                {fieldErrors.email && <p className="mt-1 text-xs text-red-600">{fieldErrors.email}</p>}
              </div>
            </div>

            <div>
              <label htmlFor="contact-subject" className={labelClass}>Subject</label>
              <input
                id="contact-subject"
                name="subject"
                type="text"
                maxLength={200}
                defaultValue={presetSubject}
                placeholder="e.g. Upgrade question, Account help, Bug report"
                className={fieldErrors.subject ? inputErrorClass : inputClass}
                disabled={state === "loading"}
                onChange={() => fieldErrors.subject && setFieldErrors((p) => ({ ...p, subject: undefined }))}
              />
              {fieldErrors.subject && <p className="mt-1 text-xs text-red-600">{fieldErrors.subject}</p>}
            </div>

            <div>
              <label htmlFor="contact-message" className={labelClass}>Message</label>
              <textarea
                id="contact-message"
                name="message"
                maxLength={4000}
                rows={5}
                placeholder="Tell us what you need. The more context you give, the faster we can help."
                className={`${fieldErrors.message ? inputErrorClass : inputClass} resize-y`}
                disabled={state === "loading"}
                onChange={() => fieldErrors.message && setFieldErrors((p) => ({ ...p, message: undefined }))}
              />
              {fieldErrors.message && <p className="mt-1 text-xs text-red-600">{fieldErrors.message}</p>}
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
              className="flex items-center justify-center gap-2 rounded-xl bg-teal px-6 py-3.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-teal-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {state === "loading" ? (
                <>
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                  Sending…
                </>
              ) : (
                "Send message"
              )}
            </motion.button>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  )
}
