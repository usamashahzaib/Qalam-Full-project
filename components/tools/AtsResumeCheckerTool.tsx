"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { APP_URL } from "@/lib/seo"
import { RESUME_HANDOFF_KEY } from "@/lib/resume-signals"
import { parseResumeReviewResponse, type ResumeReviewResult, type ResumeReviewScoreKey } from "@/lib/career-resume-review"
import { ATS_DIRECT_ANSWER, ATS_FACTORS, ATS_FAQS, ATS_STEPS } from "@/lib/ats-methodology"
import { CheckIcon, MicroscopeIcon } from "@/components/ui/qalam-icons"
import { trackMarketingEvent } from "@/lib/marketing-events"

const scoreLabels: Record<ResumeReviewScoreKey, string> = {
  ats_parsing: "ATS parsing",
  role_alignment: "Role alignment",
  recruiter_read: "Six-second read",
  achievement_evidence: "Achievement proof",
  career_progression: "Career progression",
  skills_credibility: "Skills credibility",
  clarity: "Clarity",
  professional_hygiene: "Professional hygiene",
}

const wordCount = (value: string) => value.trim().split(/\s+/).filter(Boolean).length
const scoreBand = (score: number) => score >= 80 ? "strong" : score >= 60 ? "developing" : "at_risk"
const scoreTone = (score: number) => score >= 80 ? "text-emerald-700" : score >= 60 ? "text-gold-700" : "text-red-700"
const uploadError = (code: string) => ({
  resume_pdf_too_large: "This file is over 5 MB. Upload a smaller PDF or DOCX.",
  resume_pdf_too_many_pages: "This file has more than 15 pages. Upload a shorter resume.",
  resume_pdf_text_missing: "This PDF appears to be scanned or image-only. Upload a text-based PDF or DOCX.",
  resume_docx_text_missing: "This DOCX has too little readable text to review.",
  resume_file_type_unsupported: "Upload a PDF or DOCX resume.",
} as Record<string, string>)[code] || code

export function AtsResumeCheckerTool() {
  const [resumeText, setResumeText] = useState("")
  const [jobDescription, setJobDescription] = useState("")
  const [result, setResult] = useState<ResumeReviewResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [sourceName, setSourceName] = useState("")
  const [error, setError] = useState("")

  // The homepage hero runs an instant structural read, then hands the resume
  // here so the visitor never re-uploads to get the full review.
  useEffect(() => {
    let handoffTimer: ReturnType<typeof setTimeout> | undefined
    try {
      const handoff = sessionStorage.getItem(RESUME_HANDOFF_KEY)
      if (handoff) {
        handoffTimer = setTimeout(() => {
          setResumeText(handoff)
          sessionStorage.removeItem(RESUME_HANDOFF_KEY)
        }, 0)
      }
    } catch {
      // sessionStorage can be unavailable in private browsing; the form still works.
    }

    return () => {
      if (handoffTimer) clearTimeout(handoffTimer)
    }
  }, [])

  const uploadResume = async (file: File) => {
    setUploading(true)
    setError("")
    setResult(null)
    try {
      const body = new FormData()
      body.append("file", file)
      const response = await fetch("/api/free-tools/ats-resume-checker/parse", { method: "POST", body })
      const data = await response.json().catch(() => ({}))
      if (!response.ok || typeof data.text !== "string") {
        throw new Error(uploadError(data.error || "This file could not be read. Upload a text-based PDF or DOCX."))
      }
      setResumeText(data.text)
      setSourceName(file.name)
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Resume upload failed.")
    } finally {
      setUploading(false)
    }
  }

  const statusMessage = uploading
    ? "Reading your resume file."
    : loading
      ? "Checking your resume. This can take up to a minute."
      : result
        ? `Review complete. Readiness score ${result.overall_score} out of 100. ${result.screening_decision}.`
        : ""

  const checkResume = async () => {
    if (resumeText.trim().length < 200) return setError("Upload a text-based PDF or DOCX, or add at least 200 characters of resume text.")
    setLoading(true)
    setError("")
    setResult(null)
    try {
      const response = await fetch("/api/free-tools/ats-resume-checker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeText, jobDescription }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || "Resume check failed.")
      // The response is re-validated on the client so a partial or unexpected
      // body can never render as a review, and can never emit an assessment
      // event whose score band was inferred from a missing score.
      const review = parseResumeReviewResponse(data)
      if (!review) throw new Error("The resume check could not be completed. Try again.")
      setResult(review)
      trackMarketingEvent("assessment_complete", {
        assessment: "ats_resume_checker",
        score_band: scoreBand(review.overall_score),
        job_description_supplied: jobDescription.trim().length > 0,
      })
    } catch (requestError) {
      setError((requestError as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-zinc-50 pt-24">
      <section className="border-b border-zinc-200 bg-[#f8f7f3] px-6 py-16 sm:py-20">
        <div className="mx-auto max-w-[1100px]">
          <Link href="/free-tools" className="mb-8 inline-flex min-h-11 items-center text-sm font-medium text-zinc-500 hover:text-teal">{"<- All free tools"}</Link>
          <div className="grid items-end gap-8 lg:grid-cols-[1fr_360px]">
            <div>
              <p className="mb-4 text-xs font-bold uppercase tracking-[0.18em] text-teal">Free. No account required.</p>
              <h1 className="max-w-3xl text-4xl font-extrabold tracking-tight text-zinc-900 sm:text-6xl">See what ATS software and recruiters will question.</h1>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-zinc-600">Get a responsible first-screen review across parsing, job fit, proof, progression, skills, clarity, and rejection risk. Add a job description for a role-specific check.</p>
            </div>
            <div className="border-t border-zinc-300 pt-5 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
              {["No sign-in", "No payment card", "No invented experience"].map((item) => (
                <p key={item} className="flex min-h-9 items-center gap-2 text-sm font-semibold text-zinc-700"><CheckIcon className="h-4 w-4 text-teal" />{item}</p>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 py-12 sm:py-16">
        <div className="mx-auto grid max-w-[1100px] gap-8 lg:grid-cols-[1fr_320px]">
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-7">
            <label className="flex min-h-36 flex-col justify-between gap-4 rounded-xl border border-dashed border-teal/40 bg-teal/[0.03] p-5 sm:flex-row sm:items-center">
              <div>
                <p className="text-sm font-bold text-zinc-900">Upload your resume first</p>
                <p className="mt-1 max-w-xl text-xs leading-5 text-zinc-600">PDF or DOCX, up to 5 MB. Qalam extracts the text, then scores that exact content. LinkedIn profile PDFs also work.</p>
              </div>
              <span className="inline-flex min-h-11 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-teal px-4 text-sm font-bold text-white transition hover:bg-teal-600">
                {uploading ? "Reading file..." : "Choose resume"}
                <input
                  type="file"
                  accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  className="hidden"
                  disabled={uploading || loading}
                  onChange={(event) => {
                    const file = event.target.files?.[0]
                    event.target.value = ""
                    if (file) void uploadResume(file)
                  }}
                />
              </span>
            </label>
            {sourceName ? <p className="mt-3 rounded-lg bg-teal/5 px-3 py-2 text-xs font-semibold text-teal">Imported: {sourceName}. Review the extracted text before scoring.</p> : null}

            <div className="mt-6 grid gap-6 md:grid-cols-2">
              <label className="block">
                <span className="text-sm font-bold text-zinc-900">Your resume</span>
                <span className="mt-1 block text-xs text-zinc-500">Required. Upload above, then correct extraction only if needed.</span>
                <textarea value={resumeText} onChange={(event) => { setResumeText(event.target.value); setSourceName("") }} rows={16} maxLength={20000} placeholder="Upload a resume, LinkedIn PDF, or paste complete resume text..." className="mt-3 w-full resize-y rounded-xl border border-zinc-300 px-4 py-3 text-sm leading-6 outline-none transition focus:border-teal focus:ring-2 focus:ring-teal/20" />
                <span className="mt-2 block text-xs text-zinc-400">{wordCount(resumeText)} words</span>
              </label>
              <label className="block">
                <span className="text-sm font-bold text-zinc-900">Target job description</span>
                <span className="mt-1 block text-xs text-zinc-500">Optional, but needed for exact role fit.</span>
                <textarea value={jobDescription} onChange={(event) => setJobDescription(event.target.value)} rows={16} maxLength={12000} placeholder="Paste the target job description here..." className="mt-3 w-full resize-y rounded-xl border border-zinc-300 px-4 py-3 text-sm leading-6 outline-none transition focus:border-teal focus:ring-2 focus:ring-teal/20" />
                <span className="mt-2 block text-xs text-zinc-400">{wordCount(jobDescription)} words</span>
              </label>
            </div>
            <div className="mt-6 flex flex-col items-start justify-between gap-4 border-t border-zinc-100 pt-6 sm:flex-row sm:items-center">
              <p className="max-w-xl text-xs leading-5 text-zinc-500">Qalam evaluates job-relevant evidence only. Scores are independent diagnostics, not an employer ATS result or hiring guarantee.</p>
              <button onClick={checkResume} disabled={loading || uploading || resumeText.trim().length < 200} className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-teal px-6 text-sm font-bold text-white transition hover:bg-teal-600 focus:outline-none focus:ring-2 focus:ring-teal focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-zinc-200 disabled:text-zinc-500">
                <MicroscopeIcon className="h-4 w-4" />{loading ? "Running recruiter review..." : "Check my resume free"}
              </button>
            </div>
            {error ? <p role="alert" className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p> : null}
            {/* Always mounted so the region exists before its text changes.
                A live region created in the same render as its content is not
                reliably announced by screen readers. */}
            <p className="sr-only" role="status" aria-live="polite">{statusMessage}</p>
          </div>

          <aside className="h-fit rounded-2xl bg-[#073f3b] p-6 text-white lg:sticky lg:top-28">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-gold-100">After your check</p>
            <h2 className="mt-3 text-2xl font-bold">Build one ATS resume free every month.</h2>
            <p className="mt-3 text-sm leading-6 text-white/70">Sign in to target an exact job, edit every line, choose from 12 ATS-safe templates, and export to PDF.</p>
            <Link href={`${APP_URL}/login?callbackUrl=/career/resumes`} className="mt-6 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-gold px-4 text-sm font-bold text-teal-900 transition hover:bg-gold-600">Build my monthly free resume</Link>
            <p className="mt-3 text-center text-xs text-white/65">Free plan. One generation per month.</p>
          </aside>
        </div>

        {result ? (
          <div className="mx-auto mt-10 max-w-[1100px] space-y-6">
            <section className="grid gap-6 rounded-2xl border border-zinc-200 bg-white p-6 sm:p-8 lg:grid-cols-[220px_1fr]">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">Qalam readiness score</p>
                <p className={`mt-2 text-6xl font-extrabold ${scoreTone(result.overall_score)}`}>{result.overall_score}<span className="text-2xl text-zinc-400">/100</span></p>
                <p className="mt-3 text-sm font-bold text-teal">{result.screening_decision}</p>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-zinc-900">Recruiter verdict</h2>
                <p className="mt-3 max-w-3xl leading-7 text-zinc-700">{result.verdict}</p>
                <p className="mt-4 rounded-xl bg-gold/8 px-4 py-3 text-sm font-semibold text-zinc-800">Next: {result.next_step}</p>
              </div>
            </section>

            <section className="rounded-2xl border border-zinc-200 bg-white p-6 sm:p-8">
              <h2 className="text-2xl font-bold text-zinc-900">Scorecard</h2>
              <div className="mt-6 grid gap-x-8 gap-y-5 md:grid-cols-2">
                {Object.entries(result.scores).map(([key, value]) => (
                  <div key={key}>
                    <div className="mb-2 flex justify-between text-sm"><span className="font-semibold text-zinc-700">{scoreLabels[key as ResumeReviewScoreKey]}</span><span className={`font-bold ${scoreTone(value)}`}>{value}/100</span></div>
                    <div className="h-2 overflow-hidden rounded-full bg-zinc-100"><div className="h-full rounded-full bg-teal" style={{ width: `${value}%` }} /></div>
                  </div>
                ))}
              </div>
            </section>

            <section className="grid gap-px overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-200 sm:grid-cols-2 lg:grid-cols-4">
              {Object.entries(result.recruiter_read).map(([key, value]) => (
                <div key={key} className="bg-white p-5"><p className="text-xs font-bold uppercase tracking-wide text-zinc-500">{key.replaceAll("_", " ")}</p><p className="mt-2 text-sm leading-6 text-zinc-700">{value}</p></div>
              ))}
            </section>

            <section className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-2xl border border-zinc-200 bg-white p-6">
                <h2 className="text-xl font-bold text-zinc-900">Rejection risks</h2>
                <div className="mt-4 divide-y divide-zinc-100">{result.risks.map((risk, index) => <div key={`${risk.issue}-${index}`} className="py-4"><span className={`rounded-full px-2 py-1 text-[11px] font-bold uppercase ${risk.severity === "high" ? "bg-red-50 text-red-700" : risk.severity === "medium" ? "bg-gold/10 text-gold-700" : "bg-zinc-100 text-zinc-600"}`}>{risk.severity}</span><p className="mt-2 font-semibold text-zinc-900">{risk.issue}</p><p className="mt-1 text-sm leading-6 text-zinc-600">{risk.why}</p></div>)}</div>
              </div>
              <div className="rounded-2xl border border-zinc-200 bg-white p-6">
                <h2 className="text-xl font-bold text-zinc-900">Keyword evidence</h2>
                <p className="mt-1 text-sm text-zinc-500">Never add unsupported keywords as candidate facts.</p>
                <div className="mt-4 flex flex-wrap gap-2">{result.missing_keywords.map((item, index) => <span key={`${item.keyword}-${index}`} className="rounded-full border border-zinc-200 px-3 py-2 text-sm text-zinc-700">{item.keyword} <strong className="ml-1 text-xs text-teal">{item.evidence_status}</strong></span>)}</div>
              </div>
            </section>

            <section className="rounded-2xl border border-zinc-200 bg-white p-6 sm:p-8">
              <h2 className="text-2xl font-bold text-zinc-900">Priority correction plan</h2>
              <ol className="mt-5 divide-y divide-zinc-100">{result.priority_fixes.map((fix) => <li key={fix.priority} className="grid gap-2 py-5 sm:grid-cols-[40px_150px_1fr]"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-teal text-sm font-bold text-white">{fix.priority}</span><span className="font-bold text-zinc-900">{fix.section}</span><div><p className="text-sm leading-6 text-zinc-700">{fix.action}</p><p className="mt-2 rounded-lg bg-zinc-50 px-3 py-2 text-sm leading-6 text-zinc-600">{fix.example}</p></div></li>)}</ol>
            </section>

            <section className="rounded-2xl bg-[#073f3b] p-6 text-white sm:p-8">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-gold-100">Truth-preserving rewrite</p>
              <h2 className="mt-2 text-2xl font-bold">Professional summary</h2>
              <p className="mt-4 max-w-4xl leading-7 text-white/80">{result.rewritten_summary}</p>
              <Link href={`${APP_URL}/login?callbackUrl=/career/resumes`} className="mt-6 inline-flex min-h-11 items-center rounded-xl bg-gold px-5 text-sm font-bold text-teal-900">Build the full resume free</Link>
            </section>
          </div>
        ) : null}
      </section>

      <section className="border-y border-zinc-200 bg-white px-6 py-16">
        <div className="mx-auto max-w-[1100px]">
          <div className="grid gap-10 lg:grid-cols-[1fr_320px]">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-teal">How the score works</p>
              <h2 className="mt-3 text-3xl font-bold text-zinc-900">Eight factors. Evidence over keyword stuffing.</h2>
              <p className="mt-4 max-w-3xl leading-7 text-zinc-600">{ATS_DIRECT_ANSWER}</p>
              <ol className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {ATS_STEPS.map((step, index) => <li key={step.name} className="border-t border-zinc-300 pt-4"><span className="text-xs font-bold text-teal">0{index + 1}</span><h3 className="mt-2 text-sm font-bold text-zinc-900">{step.name}</h3><p className="mt-1 text-xs leading-5 text-zinc-600">{step.text}</p></li>)}
              </ol>
              <div className="mt-8 grid gap-px overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-200 sm:grid-cols-2">
                {ATS_FACTORS.map((factor) => <div key={factor.name} className="bg-white p-5"><div className="flex items-center justify-between gap-4"><h3 className="font-bold text-zinc-900">{factor.name}</h3><span className="text-xs font-bold text-gold-700">{factor.weight}%</span></div><p className="mt-2 text-sm leading-6 text-zinc-600">{factor.definition}</p></div>)}
              </div>
            </div>
            <aside className="h-fit rounded-2xl border border-teal/20 bg-teal/[0.04] p-6">
              <h2 className="text-xl font-bold text-zinc-900">Public scoring methodology</h2>
              <p className="mt-3 text-sm leading-6 text-zinc-600">Read the weighting, truth rules, recruiter logic, and known limitations behind every Qalam score.</p>
              <Link href="/methodology/ats-resume-readiness" className="mt-5 inline-flex min-h-11 items-center rounded-xl border border-teal px-4 text-sm font-bold text-teal hover:bg-teal hover:text-white">Read the methodology</Link>
            </aside>
          </div>
        </div>
      </section>

      <section className="px-6 py-16">
        <div className="mx-auto max-w-[900px]">
          <h2 className="text-3xl font-bold text-zinc-900">ATS resume checker questions</h2>
          <div className="mt-8 divide-y divide-zinc-200 border-y border-zinc-200">
            {ATS_FAQS.map((faq) => <details key={faq.q} className="group py-5"><summary className="cursor-pointer list-none font-bold text-zinc-900">{faq.q}</summary><p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-600">{faq.a}</p></details>)}
          </div>
        </div>
      </section>
    </main>
  )
}
