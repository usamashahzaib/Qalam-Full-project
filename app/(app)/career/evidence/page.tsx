"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { motion, useReducedMotion } from "framer-motion"
import { trackCareerEvent } from "@/lib/career-events"

type Evidence = { id: string; evidence_type: string; title: string; summary: string; source_url: string | null; issuer: string | null; skills: string[]; verification_status: "self_reported" | "documented" | "partner_verified"; updated_at: string }
type Consents = { recruiterDiscovery: boolean; outcomeLearning: boolean; partnerReporting: boolean }

const types = [
  ["achievement", "Achievement"],
  ["skill", "Skill"],
  ["credential", "Credential"],
  ["work_sample", "Work sample"],
  ["experience", "Experience"],
  ["education", "Education"],
]
const fieldClass = "min-h-11 w-full rounded-xl border border-zinc-200 bg-[oklch(0.995_0.004_165)] px-3.5 text-sm text-zinc-900 outline-none transition focus:border-teal focus:ring-2 focus:ring-teal/10"

export default function EvidencePage() {
  const reduceMotion = useReducedMotion()
  const [items, setItems] = useState<Evidence[]>([])
  const [limit, setLimit] = useState<number | "unlimited">(15)
  const [consents, setConsents] = useState<Consents>({ recruiterDiscovery: false, outcomeLearning: false, partnerReporting: false })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [filter, setFilter] = useState("all")
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [form, setForm] = useState({ evidenceType: "achievement", title: "", summary: "", sourceUrl: "", issuer: "", skills: "" })

  const load = useCallback(async () => {
    setLoading(true)
    setError("")
    const [evidenceResponse, consentResponse] = await Promise.all([fetch("/api/career/evidence"), fetch("/api/career/consent")])
    const evidenceData = await evidenceResponse.json().catch(() => ({}))
    const consentData = await consentResponse.json().catch(() => ({}))
    if (!evidenceResponse.ok) setError(evidenceData.error || "Evidence Vault could not be loaded.")
    else {
      setItems(evidenceData.evidence || [])
      setLimit(evidenceData.entitlements?.evidenceItems ?? 15)
    }
    if (consentResponse.ok && consentData.consents) setConsents(consentData.consents)
    setLoading(false)
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0)
    return () => window.clearTimeout(timer)
  }, [load])
  const visibleItems = useMemo(() => filter === "all" ? items : items.filter((item) => item.evidence_type === filter), [filter, items])
  const verifiedCount = items.filter((item) => item.verification_status !== "self_reported").length

  const create = async () => {
    setSaving(true)
    setError("")
    setMessage("")
    const response = await fetch("/api/career/evidence", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, skills: form.skills.split(",").map((item) => item.trim()).filter(Boolean), metrics: {} }) })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) setError(data.error === "evidence_limit" ? `Your plan includes ${data.limit} evidence items. Upgrade for more capacity.` : data.error || "Evidence could not be saved.")
    else {
      setForm({ evidenceType: "achievement", title: "", summary: "", sourceUrl: "", issuer: "", skills: "" })
      setFormOpen(false)
      setMessage("Evidence added to your career truth layer.")
      void trackCareerEvent("career.evidence_created", { evidence_type: form.evidenceType, documented: Boolean(form.sourceUrl) })
      await load()
    }
    setSaving(false)
  }

  const remove = async (id: string) => {
    const response = await fetch(`/api/career/evidence/${id}`, { method: "DELETE" })
    if (!response.ok) return setError("Evidence could not be deleted.")
    setItems((current) => current.filter((item) => item.id !== id))
    setMessage("Evidence deleted.")
    void trackCareerEvent("career.evidence_deleted")
  }

  const updateConsent = async (key: keyof Consents, value: boolean) => {
    const next = { ...consents, [key]: value }
    setConsents(next)
    const response = await fetch("/api/career/consent", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(next) })
    if (!response.ok) {
      setConsents(consents)
      setError("Privacy choice could not be saved.")
    } else {
      setMessage("Privacy choice saved.")
      void trackCareerEvent("career.consent_updated", { purpose: key, granted: value })
    }
  }

  return (
    <main className="min-h-full bg-[oklch(0.975_0.006_165)] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="border-b border-zinc-200 pb-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-teal">Proof of employability</p><h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-950">One verified truth behind every career asset.</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600">Store proof once. Use it across resumes, LinkedIn, cover letters, interviews, and recruiter discovery without inventing claims.</p></div>
            <button type="button" onClick={() => setFormOpen((value) => !value)} className="min-h-11 rounded-xl bg-teal px-5 text-sm font-bold text-white transition hover:bg-teal-600">{formOpen ? "Close form" : "Add evidence"}</button>
          </div>
        </header>

        <section className="grid border-b border-zinc-200 sm:grid-cols-3"><div className="py-5 sm:border-r sm:border-zinc-200"><p className="text-xs font-semibold text-zinc-500">Evidence stored</p><p className="mt-1 text-2xl font-bold text-zinc-950">{items.length}{limit === "unlimited" ? "" : `/${limit}`}</p></div><div className="py-5 sm:border-r sm:border-zinc-200 sm:px-5"><p className="text-xs font-semibold text-zinc-500">Documented or verified</p><p className="mt-1 text-2xl font-bold text-zinc-950">{verifiedCount}</p></div><div className="py-5 sm:pl-5"><p className="text-xs font-semibold text-zinc-500">Truth standard</p><p className="mt-1 text-2xl font-bold text-zinc-950">Source first</p></div></section>

        {formOpen && <motion.section initial={reduceMotion ? false : { opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }} className="border-b border-zinc-200 py-6"><div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"><label><span className="mb-1.5 block text-xs font-semibold text-zinc-600">Evidence type</span><select className={fieldClass} value={form.evidenceType} onChange={(event) => setForm({ ...form, evidenceType: event.target.value })}>{types.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="lg:col-span-2"><span className="mb-1.5 block text-xs font-semibold text-zinc-600">Title</span><input className={fieldClass} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Reduced time to hire by 28%" /></label><label className="md:col-span-2 lg:col-span-3"><span className="mb-1.5 block text-xs font-semibold text-zinc-600">Evidence summary</span><textarea className={`${fieldClass} min-h-24 py-3`} value={form.summary} onChange={(event) => setForm({ ...form, summary: event.target.value })} placeholder="Context, action, result, and how the result was measured." /></label><label><span className="mb-1.5 block text-xs font-semibold text-zinc-600">Source URL</span><input type="url" className={fieldClass} value={form.sourceUrl} onChange={(event) => setForm({ ...form, sourceUrl: event.target.value })} placeholder="https://" /></label><label><span className="mb-1.5 block text-xs font-semibold text-zinc-600">Issuer or organization</span><input className={fieldClass} value={form.issuer} onChange={(event) => setForm({ ...form, issuer: event.target.value })} /></label><label><span className="mb-1.5 block text-xs font-semibold text-zinc-600">Skills, comma separated</span><input className={fieldClass} value={form.skills} onChange={(event) => setForm({ ...form, skills: event.target.value })} /></label></div><button type="button" disabled={saving || !form.title} onClick={create} className="mt-4 min-h-11 rounded-xl bg-zinc-950 px-5 text-sm font-bold text-white disabled:opacity-40">{saving ? "Saving..." : "Save evidence"}</button></motion.section>}

        {(message || error) && <p role="status" className={`mt-5 rounded-xl border px-4 py-3 text-sm ${error ? "border-red-200 bg-red-50 text-red-700" : "border-teal/20 bg-teal/5 text-teal-800"}`}>{error || message}</p>}

        <div className="grid gap-8 py-7 lg:grid-cols-[minmax(0,1fr)_340px]">
          <section><div className="mb-4 flex gap-2 overflow-x-auto">{[["all", "All"], ...types].map(([value, label]) => <button key={value} type="button" onClick={() => setFilter(value)} className={`min-h-10 whitespace-nowrap rounded-full px-4 text-xs font-bold transition ${filter === value ? "bg-zinc-950 text-white" : "border border-zinc-200 bg-white text-zinc-600 hover:border-teal/40"}`}>{label}</button>)}</div>{loading ? <div className="space-y-3">{[1, 2, 3].map((item) => <div key={item} className="h-28 animate-pulse rounded-xl bg-zinc-200/70" />)}</div> : visibleItems.length ? <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">{visibleItems.map((item) => <article key={item.id} className="border-b border-zinc-100 px-5 py-5 last:border-b-0"><div className="flex items-start justify-between gap-4"><div><div className="flex flex-wrap items-center gap-2"><span className="text-[11px] font-bold uppercase tracking-[0.12em] text-teal">{item.evidence_type.replace("_", " ")}</span><span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${item.verification_status === "partner_verified" ? "bg-teal/10 text-teal" : item.verification_status === "documented" ? "bg-gold/10 text-gold-700" : "bg-zinc-100 text-zinc-500"}`}>{item.verification_status.replace("_", " ")}</span></div><h2 className="mt-2 text-base font-bold text-zinc-950">{item.title}</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-600">{item.summary || "Add context and measurable proof to strengthen this evidence."}</p></div><button type="button" onClick={() => void remove(item.id)} className="min-h-10 px-2 text-xs font-semibold text-zinc-400 transition hover:text-red-600">Delete</button></div>{item.skills?.length ? <div className="mt-3 flex flex-wrap gap-1.5">{item.skills.map((skill) => <span key={skill} className="rounded-full bg-zinc-100 px-2.5 py-1 text-[11px] font-medium text-zinc-600">{skill}</span>)}</div> : null}</article>)}</div> : <div className="py-20 text-center"><p className="text-lg font-bold text-zinc-900">No evidence in this view.</p><p className="mt-2 text-sm text-zinc-500">Start with one measurable achievement or credential.</p></div>}</section>

          <aside className="self-start rounded-2xl border border-zinc-200 bg-white p-5"><p className="text-xs font-bold uppercase tracking-[0.14em] text-zinc-500">Privacy controls</p><h2 className="mt-2 text-lg font-bold text-zinc-950">Your data, your permission.</h2><p className="mt-2 text-sm leading-6 text-zinc-600">Qalam never turns private evidence into recruiter access or aggregate learning without the choice shown here.</p><div className="mt-5 divide-y divide-zinc-100">{[["recruiterDiscovery", "Recruiter discovery", "Allow verified recruiters to find your public profile."], ["outcomeLearning", "Outcome learning", "Use de-identified application outcomes to improve recommendations."], ["partnerReporting", "Partner reporting", "Include de-identified results in cohort reporting."]].map(([key, title, copy]) => <label key={key} className="flex cursor-pointer gap-3 py-4"><input type="checkbox" checked={consents[key as keyof Consents]} onChange={(event) => void updateConsent(key as keyof Consents, event.target.checked)} className="mt-1 h-4 w-4 accent-teal" /><span><strong className="block text-sm text-zinc-900">{title}</strong><span className="mt-1 block text-xs leading-5 text-zinc-500">{copy}</span></span></label>)}</div><p className="mt-4 text-xs leading-5 text-zinc-400">You can change these choices anytime. Visibility remains off until your public candidate profile is enabled.</p></aside>
        </div>
      </div>
    </main>
  )
}
