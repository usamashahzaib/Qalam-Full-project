"use client"

import { useRef, useState } from "react"
import type { ProfessionalContext } from "@/lib/professional-context"

type Suggestions = {
  name: string
  title: string
  industry: string
  goals: string
  linkedinUrl: string
}

type ImportResponse = {
  professionalContext?: ProfessionalContext
  suggestions?: Suggestions
  sourceDeleted?: boolean
  pagesAnalyzed?: number
  error?: string
}

const ERROR_MESSAGES: Record<string, string> = {
  resume_pdf_missing: "Choose a PDF first.",
  resume_pdf_type_invalid: "Only PDF files are supported.",
  resume_pdf_empty: "The PDF is empty.",
  resume_pdf_too_large: "PDF must be 5 MB or smaller.",
  resume_pdf_signature_invalid: "This file is not a valid PDF.",
  resume_pdf_too_many_pages: "PDF must be 15 pages or fewer.",
  resume_pdf_text_missing: "No readable text found. Scanned-image PDFs are not supported yet.",
  professional_profile_analysis_failed: "Profile analysis is temporarily unavailable.",
  professional_profile_response_invalid: "The profile could not be extracted safely. Try another PDF.",
  rate_limit_exceeded: "Too many imports. Try again in a minute.",
}

const csv = (values: string[]) => values.join(", ")
const splitCsv = (value: string) =>
  value.split(",").map((item) => item.trim()).filter(Boolean).slice(0, 12)

export function ProfessionalProfileImport({
  context,
  onImported,
  onChange,
}: {
  context: ProfessionalContext | null
  onImported: (context: ProfessionalContext, suggestions: Suggestions) => void
  onChange: (context: ProfessionalContext) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [source, setSource] = useState<ProfessionalContext["source"]>("resume_pdf")
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null)

  const analyze = async () => {
    if (!file || isAnalyzing) return
    setIsAnalyzing(true)
    setMessage(null)
    try {
      const form = new FormData()
      form.set("document", file)
      form.set("source", source)
      const response = await fetch("/api/voice/import-document", { method: "POST", body: form })
      const data = await response.json() as ImportResponse
      if (!response.ok || !data.professionalContext || !data.suggestions) {
        throw new Error(ERROR_MESSAGES[data.error || ""] || "Document analysis failed.")
      }
      onImported(data.professionalContext, data.suggestions)
      setFile(null)
      if (inputRef.current) inputRef.current.value = ""
      setMessage({
        text: `Profile extracted from ${data.pagesAnalyzed || 0} page(s). Source PDF deleted. Review, then save.`,
        error: false,
      })
    } catch (error) {
      setMessage({ text: (error as Error).message, error: true })
    } finally {
      setIsAnalyzing(false)
    }
  }

  const update = <K extends keyof ProfessionalContext>(key: K, value: ProfessionalContext[K]) => {
    if (context) onChange({ ...context, [key]: value })
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
      <div className="border-b border-zinc-100 bg-zinc-50/60 px-5 py-3.5">
        <h2 className="text-sm font-bold text-zinc-900">
          Professional context
          <span className="ml-1 rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-bold text-amber-700">Pro</span>
        </h2>
        <p className="mt-0.5 text-xs text-zinc-500">
          Import a resume or LinkedIn PDF once. The source is processed in memory and never stored.
        </p>
      </div>

      <div className="space-y-4 p-5">
        <div className="grid gap-3 sm:grid-cols-[160px_1fr]">
          <select
            value={source}
            onChange={(event) => setSource(event.target.value as ProfessionalContext["source"])}
            className="rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-800 outline-none focus:border-teal"
          >
            <option value="resume_pdf">Resume / CV PDF</option>
            <option value="linkedin_pdf">LinkedIn profile PDF</option>
          </select>
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf,.pdf"
            onChange={(event) => {
              setFile(event.target.files?.[0] || null)
              setMessage(null)
            }}
            className="block w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-600 file:mr-3 file:rounded-lg file:border-0 file:bg-teal/10 file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-teal"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => void analyze()}
            disabled={!file || isAnalyzing || file.size > 5 * 1024 * 1024}
            className="rounded-xl bg-teal px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-teal-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isAnalyzing ? "Analyzing document..." : "Analyze document"}
          </button>
          <p className="text-[11px] text-zinc-400">PDF only. Maximum 5 MB and 15 pages.</p>
        </div>

        {file && file.size > 5 * 1024 * 1024 ? (
          <p className="text-xs font-medium text-red-600">PDF must be 5 MB or smaller.</p>
        ) : null}
        {message ? (
          <p className={`text-xs font-medium ${message.error ? "text-red-600" : "text-emerald-600"}`}>
            {message.text}
          </p>
        ) : null}

        {context ? (
          <div className="space-y-4 border-t border-zinc-100 pt-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-zinc-900">Review extracted profile</h3>
                <p className="text-xs text-zinc-500">Nothing below is active until you save your profile.</p>
              </div>
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
                Source deleted
              </span>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <ContextField label="Primary role" value={context.primaryRole} onChange={(value) => update("primaryRole", value)} />
              <ContextField label="Seniority" value={context.seniority} onChange={(value) => update("seniority", value)} />
              <ContextField label="Industry" value={context.industry} onChange={(value) => update("industry", value)} />
            </div>

            <ContextArea label="Expertise" value={csv(context.expertise)} onChange={(value) => update("expertise", splitCsv(value))} />
            <ContextArea label="Target audience" value={csv(context.audience)} onChange={(value) => update("audience", splitCsv(value))} />
            <ContextArea label="Content pillars" value={csv(context.contentPillars)} onChange={(value) => update("contentPillars", splitCsv(value))} />
            <ContextArea label="Verified proof points" value={csv(context.proofPoints)} onChange={(value) => update("proofPoints", splitCsv(value))} />
            <ContextArea label="Career highlights" value={csv(context.careerHighlights)} onChange={(value) => update("careerHighlights", splitCsv(value))} />
            <ContextArea label="Avoided topics" value={csv(context.avoidedTopics)} onChange={(value) => update("avoidedTopics", splitCsv(value))} />
          </div>
        ) : null}
      </div>
    </section>
  )
}

function ContextField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <label className="text-[11px] font-bold uppercase tracking-wide text-zinc-400">
      {label}
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1.5 w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm font-normal normal-case tracking-normal text-zinc-900 outline-none focus:border-teal"
      />
    </label>
  )
}

function ContextArea({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <label className="block text-[11px] font-bold uppercase tracking-wide text-zinc-400">
      {label}
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={2}
        placeholder="Comma-separated"
        className="mt-1.5 w-full resize-none rounded-xl border border-zinc-200 px-3 py-2.5 text-sm font-normal normal-case tracking-normal text-zinc-900 outline-none focus:border-teal"
      />
    </label>
  )
}
