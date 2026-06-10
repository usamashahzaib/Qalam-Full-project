"use client"

import { useState, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"

type FormState = "idle" | "loading" | "success" | "error"

const inputClass =
  "w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 placeholder-zinc-400 outline-none transition-all focus:border-teal/50 focus:bg-white focus:ring-2 focus:ring-teal/10"

const labelClass = "mb-1.5 block text-sm font-semibold text-zinc-700"

export function ContactForm() {
  const [state, setState] = useState<FormState>("idle")
  const [error, setError] = useState<string | null>(null)
  const formRef = useRef<HTMLFormElement>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setState("loading")
    setError(null)

    const data = Object.fromEntries(new FormData(e.currentTarget))

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
                  required
                  minLength={2}
                  maxLength={100}
                  placeholder="Your full name"
                  className={inputClass}
                  disabled={state === "loading"}
                />
              </div>
              <div>
                <label htmlFor="contact-email" className={labelClass}>Email</label>
                <input
                  id="contact-email"
                  name="email"
                  type="email"
                  required
                  maxLength={200}
                  placeholder="you@example.com"
                  className={inputClass}
                  disabled={state === "loading"}
                />
              </div>
            </div>

            <div>
              <label htmlFor="contact-subject" className={labelClass}>Subject</label>
              <input
                id="contact-subject"
                name="subject"
                type="text"
                required
                minLength={3}
                maxLength={200}
                placeholder="e.g. Upgrade question, Agency onboarding, Bug report"
                className={inputClass}
                disabled={state === "loading"}
              />
            </div>

            <div>
              <label htmlFor="contact-message" className={labelClass}>Message</label>
              <textarea
                id="contact-message"
                name="message"
                required
                minLength={10}
                maxLength={4000}
                rows={5}
                placeholder="Tell us what you need. The more context you give, the faster we can help."
                className={`${inputClass} resize-y`}
                disabled={state === "loading"}
              />
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
