"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { motion, useReducedMotion } from "framer-motion"
import type { ApplicationStatus } from "@/lib/career-outcomes"
import { trackCareerEvent } from "@/lib/career-events"

type Application = {
  id: string
  status: ApplicationStatus
  excitement: number | null
  next_action: string
  next_action_at: string | null
  notes: string
  updated_at: string
  job: { title: string; company: string; location: string; source_url: string | null }
  resume?: { id: string; title: string; ats_score: number | null } | null
}

type Metrics = { total: number; active: number; interviews: number; offers: number; responses: number }
type Entitlements = { activeApplications: number | "unlimited" }
type ResumeOption = { id: string; title: string; atsScore: number | null }
type AdvancedInsights = { byStatus: Record<string, number>; resumePerformance: { resumeId: string; title: string; applications: number; responses: number; interviews: number }[] }

const statuses: { value: ApplicationStatus; label: string }[] = [
  { value: "saved", label: "Saved" },
  { value: "applied", label: "Applied" },
  { value: "screening", label: "Screening" },
  { value: "interview", label: "Interview" },
  { value: "offer", label: "Offer" },
  { value: "accepted", label: "Accepted" },
  { value: "rejected", label: "Rejected" },
  { value: "withdrawn", label: "Withdrawn" },
]

const fieldClass = "min-h-11 w-full rounded-xl border border-zinc-200 bg-[oklch(0.995_0.004_165)] px-3.5 text-sm text-zinc-900 outline-none transition focus:border-teal focus:ring-2 focus:ring-teal/10"

export default function ApplicationsPage() {
  const reduceMotion = useReducedMotion()
  const [applications, setApplications] = useState<Application[]>([])
  const [metrics, setMetrics] = useState<Metrics>({ total: 0, active: 0, interviews: 0, offers: 0, responses: 0 })
  const [entitlements, setEntitlements] = useState<Entitlements | null>(null)
  const [resumes, setResumes] = useState<ResumeOption[]>([])
  const [advancedInsights, setAdvancedInsights] = useState<AdvancedInsights | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState({ title: "", company: "", location: "", sourceUrl: "", description: "", resumeId: "", status: "saved" as ApplicationStatus, nextAction: "" })

  const load = useCallback(async () => {
    setLoading(true)
    setError("")
    const [response, resumesResponse] = await Promise.all([fetch("/api/career/applications"), fetch("/api/career/resumes")])
    const [data, resumesData] = await Promise.all([response.json().catch(() => ({})), resumesResponse.json().catch(() => ({}))])
    if (!response.ok) setError(data.error === "schema_not_applied" ? "Career Outcomes migration is not applied yet." : data.error || "Applications could not be loaded.")
    else {
      setApplications(data.applications || [])
      setMetrics(data.metrics || {})
      setEntitlements(data.entitlements || null)
      setAdvancedInsights(data.advancedInsights || null)
      if (resumesResponse.ok) setResumes(resumesData.resumes || [])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0)
    return () => window.clearTimeout(timer)
  }, [load])

  const responseRate = useMemo(() => metrics.total ? Math.round((metrics.responses / metrics.total) * 100) : 0, [metrics])

  const createApplication = async () => {
    setSaving(true)
    setError("")
    setMessage("")
    const response = await fetch("/api/career/applications", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, resumeId: form.resumeId || null }) })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) setError(data.error === "active_application_limit" ? `Free includes ${data.limit} active applications. Archive one or upgrade to Solo.` : data.error || "Application could not be created.")
    else {
      setForm({ title: "", company: "", location: "", sourceUrl: "", description: "", resumeId: "", status: "saved", nextAction: "" })
      setFormOpen(false)
      setMessage("Application added to your outcome ledger.")
      void trackCareerEvent("career.application_created", { status: form.status, resume_attached: Boolean(form.resumeId) })
      await load()
    }
    setSaving(false)
  }

  const updateStatus = async (id: string, status: ApplicationStatus) => {
    const previous = applications
    setApplications((items) => items.map((item) => item.id === id ? { ...item, status } : item))
    const response = await fetch(`/api/career/applications/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) })
    if (!response.ok) {
      setApplications(previous)
      setError("Stage change could not be saved.")
      return
    }
    setMessage("Application stage updated.")
    void trackCareerEvent("career.application_stage_changed", { status })
    await load()
  }

  return (
    <main className="min-h-full bg-[oklch(0.975_0.006_165)] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="border-b border-zinc-200 pb-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-teal">Career outcome ledger</p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-950">Know which applications actually work.</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600">Link every job, resume version, stage change, and result. Your history becomes evidence, not guesswork.</p>
            </div>
            <button type="button" onClick={() => setFormOpen((value) => !value)} className="min-h-11 rounded-xl bg-teal px-5 text-sm font-bold text-white transition hover:bg-teal-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2">{formOpen ? "Close form" : "Add application"}</button>
          </div>
        </header>

        <section aria-label="Application metrics" className="grid border-b border-zinc-200 sm:grid-cols-5">
          {[["Active", metrics.active], ["Interviews", metrics.interviews], ["Offers", metrics.offers], ["Response rate", `${responseRate}%`], ["Plan capacity", entitlements?.activeApplications === "unlimited" ? "Unlimited" : `${metrics.active}/${entitlements?.activeApplications ?? 10}`]].map(([label, value]) => (
            <div key={label} className="border-zinc-200 py-5 sm:border-r sm:px-5 sm:first:pl-0 sm:last:border-r-0"><p className="text-xs font-semibold text-zinc-500">{label}</p><p className="mt-1 text-2xl font-bold tabular-nums text-zinc-950">{value}</p></div>
          ))}
        </section>

        {formOpen && (
          <motion.section initial={reduceMotion ? false : { opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }} className="border-b border-zinc-200 py-6">
            <div className="grid gap-4 lg:grid-cols-[1fr_1fr_1fr_auto]">
              <label><span className="mb-1.5 block text-xs font-semibold text-zinc-600">Job title</span><input className={fieldClass} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Senior Product Manager" /></label>
              <label><span className="mb-1.5 block text-xs font-semibold text-zinc-600">Company</span><input className={fieldClass} value={form.company} onChange={(event) => setForm({ ...form, company: event.target.value })} placeholder="Company name" /></label>
              <label><span className="mb-1.5 block text-xs font-semibold text-zinc-600">Location</span><input className={fieldClass} value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} placeholder="Lahore or Remote" /></label>
              <label><span className="mb-1.5 block text-xs font-semibold text-zinc-600">Stage</span><select className={fieldClass} value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as ApplicationStatus })}>{statuses.slice(0, 5).map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}</select></label>
              <label className="lg:col-span-2"><span className="mb-1.5 block text-xs font-semibold text-zinc-600">Job URL</span><input className={fieldClass} type="url" value={form.sourceUrl} onChange={(event) => setForm({ ...form, sourceUrl: event.target.value })} placeholder="https://" /></label>
              <label><span className="mb-1.5 block text-xs font-semibold text-zinc-600">Submitted resume</span><select className={fieldClass} value={form.resumeId} onChange={(event) => setForm({ ...form, resumeId: event.target.value })}><option value="">Not attached yet</option>{resumes.map((resume) => <option key={resume.id} value={resume.id}>{resume.title}{resume.atsScore != null ? `, ATS ${resume.atsScore}` : ""}</option>)}</select></label>
              <label><span className="mb-1.5 block text-xs font-semibold text-zinc-600">Next action</span><input className={fieldClass} value={form.nextAction} onChange={(event) => setForm({ ...form, nextAction: event.target.value })} placeholder="Follow up on Friday" /></label>
            </div>
            <button type="button" disabled={saving || !form.title || !form.company} onClick={createApplication} className="mt-4 min-h-11 rounded-xl bg-zinc-950 px-5 text-sm font-bold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40">{saving ? "Saving..." : "Save application"}</button>
          </motion.section>
        )}

        {(message || error) && <p role="status" className={`mt-5 rounded-xl border px-4 py-3 text-sm ${error ? "border-red-200 bg-red-50 text-red-700" : "border-teal/20 bg-teal/5 text-teal-800"}`}>{error || message}</p>}

        <section className="py-6">
          {advancedInsights?.resumePerformance.length ? <div className="mb-6 border-y border-zinc-200 py-5"><p className="text-xs font-bold uppercase tracking-[0.14em] text-gold-700">Pro outcome intelligence</p><div className="mt-3 grid gap-3 sm:grid-cols-3">{advancedInsights.resumePerformance.slice(0, 3).map((resume) => <div key={resume.resumeId}><p className="truncate text-sm font-bold text-zinc-900">{resume.title}</p><p className="mt-1 text-xs text-zinc-500">{resume.responses}/{resume.applications} responses, {resume.interviews} interviews</p></div>)}</div><p className="mt-3 text-xs text-zinc-400">Observed history only. Small samples are directional, not predictive.</p></div> : null}
          {loading ? <div className="space-y-3" aria-label="Loading applications">{[1, 2, 3].map((item) => <div key={item} className="h-24 animate-pulse rounded-xl bg-zinc-200/70" />)}</div> : applications.length ? (
            <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-[oklch(0.995_0.004_165)]">
              <div className="hidden grid-cols-[1.4fr_1fr_0.8fr_1fr] gap-4 border-b border-zinc-200 bg-zinc-50 px-5 py-3 text-xs font-bold uppercase tracking-[0.1em] text-zinc-500 md:grid"><span>Opportunity</span><span>Resume evidence</span><span>Stage</span><span>Next action</span></div>
              {applications.map((application) => (
                <motion.article key={application.id} layout={!reduceMotion} className="grid gap-4 border-b border-zinc-100 px-5 py-4 last:border-b-0 md:grid-cols-[1.4fr_1fr_0.8fr_1fr] md:items-center">
                  <div><div className="flex items-center gap-2"><h2 className="font-bold text-zinc-950">{application.job.title}</h2>{application.job.source_url && <a href={application.job.source_url} target="_blank" rel="noreferrer" className="text-xs font-bold text-teal">View job</a>}</div><p className="mt-1 text-sm text-zinc-600">{application.job.company}{application.job.location ? `, ${application.job.location}` : ""}</p></div>
                  <div>{application.resume ? <><p className="text-sm font-semibold text-zinc-800">{application.resume.title}</p><p className="mt-1 text-xs text-zinc-500">ATS score {application.resume.ats_score ?? "Not scored"}</p></> : <Link href="/career/resumes" className="text-sm font-semibold text-teal">Attach a tailored resume</Link>}</div>
                  <select aria-label={`Stage for ${application.job.title}`} className={fieldClass} value={application.status} onChange={(event) => void updateStatus(application.id, event.target.value as ApplicationStatus)}>{statuses.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}</select>
                  <p className="text-sm leading-5 text-zinc-600">{application.next_action || "No next action set"}</p>
                </motion.article>
              ))}
            </div>
          ) : !error ? (
            <div className="py-20 text-center"><p className="text-lg font-bold text-zinc-900">Your outcome ledger is empty.</p><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-500">Add the next role before you apply. Qalam will preserve the job, resume version, and every stage change.</p><button type="button" onClick={() => setFormOpen(true)} className="mt-5 min-h-11 rounded-xl bg-teal px-5 text-sm font-bold text-white">Add your first application</button></div>
          ) : null}
        </section>
      </div>
    </main>
  )
}
