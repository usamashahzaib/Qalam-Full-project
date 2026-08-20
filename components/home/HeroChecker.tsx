"use client"

import { useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { motion, useReducedMotion } from "framer-motion"
import { analyzeResume, MIN_RESUME_CHARS, RESUME_HANDOFF_KEY, type SignalState } from "@/lib/resume-signals"
import { trackMarketingEvent } from "@/lib/marketing-events"

const UPLOAD_ERRORS: Record<string, string> = {
  resume_pdf_too_large: "That file is over 5 MB. Try a smaller PDF or DOCX.",
  resume_pdf_too_many_pages: "That file has more than 15 pages. Try a shorter resume.",
  resume_pdf_text_missing: "That PDF looks scanned or image only. Try a text based PDF or DOCX.",
  resume_docx_text_missing: "That DOCX has too little readable text.",
  resume_file_type_unsupported: "Upload a PDF or DOCX resume.",
  resume_file_missing: "No file was received. Try again.",
}

const STATE_COLOR: Record<SignalState, string> = {
  pass: "oklch(0.78 0.13 155)",
  warn: "oklch(0.85 0.05 85)",
  fail: "oklch(0.68 0.15 30)",
}

const STATE_LABEL: Record<SignalState, string> = {
  pass: "Looks fine",
  warn: "Worth a look",
  fail: "Needs attention",
}

export function HeroChecker() {
  const router = useRouter()
  const prefersReducedMotion = useReducedMotion()
  const [resumeText, setResumeText] = useState("")
  const [sourceName, setSourceName] = useState("")
  const [pasting, setPasting] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState("")
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const read = useMemo(
    () => (resumeText.trim().length >= MIN_RESUME_CHARS ? analyzeResume(resumeText) : null),
    [resumeText]
  )

  const uploadResume = async (file: File) => {
    trackMarketingEvent("resume_check_start", { placement: "inline_checker", method: "upload" })
    setUploading(true)
    setError("")
    try {
      const body = new FormData()
      body.append("file", file)
      const response = await fetch("/api/free-tools/ats-resume-checker/parse", { method: "POST", body })
      const data = await response.json().catch(() => ({}))
      if (!response.ok || typeof data.text !== "string") {
        throw new Error(UPLOAD_ERRORS[data.error] || "That file could not be read. Try a text based PDF or DOCX.")
      }
      setResumeText(data.text)
      setSourceName(file.name)
      setPasting(false)
    } catch (uploadFailure) {
      setError(uploadFailure instanceof Error ? uploadFailure.message : "Upload failed.")
    } finally {
      setUploading(false)
    }
  }

  const runFullReview = () => {
    try {
      sessionStorage.setItem(RESUME_HANDOFF_KEY, resumeText)
    } catch {
      // Private browsing can block sessionStorage. The checker page still works,
      // the visitor just re-adds their resume there.
    }
    router.push("/free-tools/ats-resume-checker")
  }

  const reset = () => {
    setResumeText("")
    setSourceName("")
    setError("")
    setPasting(false)
  }

  const busy = uploading

  return (
    <div className="w-full max-w-[560px]">
      {!read ? (
        <div
          onDragOver={(event) => {
            event.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault()
            setDragging(false)
            const file = event.dataTransfer.files?.[0]
            if (file) uploadResume(file)
          }}
          className={`rounded-2xl border border-dashed p-6 transition-colors duration-200 sm:p-8 ${
            dragging ? "border-[oklch(0.85_0.05_85)] bg-white/8" : "border-white/20 bg-white/[0.04]"
          }`}
        >
          {pasting ? (
            <div className="flex flex-col gap-3">
              <label htmlFor="hero-resume-text" className="text-sm font-medium text-white/80">
                Paste your resume text
              </label>
              <textarea
                id="hero-resume-text"
                ref={textareaRef}
                rows={6}
                autoFocus
                value={resumeText}
                onChange={(event) => setResumeText(event.target.value)}
                placeholder="Paste at least a couple of paragraphs from your resume."
                className="w-full resize-y rounded-xl border border-white/15 bg-[oklch(0.1_0.014_196)] p-3 text-sm leading-relaxed text-white/90 placeholder:text-white/30 focus:border-white/30 focus:outline-none"
              />
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-white/45" aria-live="polite">
                  {resumeText.trim().length > 0
                    ? `${resumeText.trim().length} of ${MIN_RESUME_CHARS} characters`
                    : "Nothing pasted yet"}
                </p>
                <button
                  type="button"
                  onClick={() => setPasting(false)}
                  className="text-xs font-medium text-white/60 underline underline-offset-4 hover:text-white"
                >
                  Upload a file instead
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 text-center">
              <p className="text-base font-semibold text-white">
                {busy ? "Reading your resume" : "Drop your resume here"}
              </p>
              <p className="max-w-[36ch] text-sm leading-relaxed text-white/55">
                PDF or DOCX. It is read in your browser session for the instant check, and nothing is
                stored.
              </p>
              <div className="flex flex-col items-center gap-3 sm:flex-row">
                <label className="qlx-champagne-btn press inline-flex min-h-11 cursor-pointer items-center rounded-xl px-6 text-sm font-semibold">
                  {busy ? "Working..." : "Choose file"}
                  <input
                    type="file"
                    accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    className="sr-only"
                    disabled={busy}
                    onChange={(event) => {
                      const file = event.target.files?.[0]
                      if (file) uploadResume(file)
                      event.target.value = ""
                    }}
                  />
                </label>
                <button
                  type="button"
                  onClick={() => {
                    trackMarketingEvent("resume_check_start", { placement: "inline_checker", method: "paste" })
                    setPasting(true)
                  }}
                  className="min-h-11 text-sm font-medium text-white/70 underline underline-offset-4 transition-colors hover:text-white"
                >
                  or paste the text
                </button>
              </div>
            </div>
          )}

          {error && (
            <p role="alert" className="mt-4 text-sm text-[oklch(0.72_0.15_30)]">
              {error}
            </p>
          )}
        </div>
      ) : (
        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 28 }}
          className="qlx-panel overflow-hidden rounded-2xl"
        >
          <div className="flex items-center justify-between gap-4 border-b border-white/10 px-5 py-4">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">
                {sourceName || "Pasted resume"}
              </p>
              <p className="text-xs text-white/45" aria-live="polite">
                {read.passed} of {read.total} structural checks clear
              </p>
            </div>
            <button
              type="button"
              onClick={reset}
              className="shrink-0 text-xs font-medium text-white/50 underline underline-offset-4 transition-colors hover:text-white"
            >
              Clear
            </button>
          </div>

          <ul className="divide-y divide-white/8">
            {read.signals.map((signal, index) => (
              <motion.li
                key={signal.key}
                initial={prefersReducedMotion ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: prefersReducedMotion ? 0 : index * 0.05, duration: 0.25 }}
                className="flex items-center justify-between gap-4 px-5 py-3"
              >
                <span className="flex min-w-0 items-center gap-3">
                  <span
                    aria-hidden="true"
                    className="h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{ background: STATE_COLOR[signal.state] }}
                  />
                  <span className="truncate text-sm text-white/85">{signal.label}</span>
                </span>
                <span className="shrink-0 text-xs tabular-nums text-white/50">
                  <span className="sr-only">{STATE_LABEL[signal.state]}. </span>
                  {signal.detail}
                </span>
              </motion.li>
            ))}
          </ul>

          <div className="border-t border-white/10 p-5">
            <button
              type="button"
              onClick={runFullReview}
              className="qlx-champagne-btn press flex min-h-11 w-full items-center justify-center rounded-xl px-6 text-sm font-semibold"
            >
              Run the full recruiter review
            </button>
            <p className="mt-3 text-center text-xs leading-relaxed text-white/45">
              The checks above are structural only. The full review reads job fit, proof, progression,
              and clarity.
            </p>
          </div>
        </motion.div>
      )}
    </div>
  )
}
