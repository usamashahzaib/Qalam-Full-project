"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { trackCareerEvent } from "@/lib/career-events"

type Candidate = {
  workspace_id: string
  public_name: string
  professional_headline: string
  target_roles: string[]
  locations: string[]
  skills: string[]
  years_experience: number | null
  linkedin_url: string | null
}

type Organization = { id: string; name: string; organization_type: string; verification_status: "pending" | "verified" | "rejected" | "suspended" }

const field = "w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none focus:border-teal"

export default function CareerNetworkPage() {
  const searchParams = useSearchParams()
  const workspaceKey = searchParams.get("client") || undefined
  const suffix = workspaceKey ? `?workspaceKey=${encodeURIComponent(workspaceKey)}` : ""
  const [form, setForm] = useState({ isSearchable: false, publicName: "", professionalHeadline: "", targetRoles: "", locations: "", skills: "", yearsExperience: "", linkedinUrl: "", contactEmail: "" })
  const [query, setQuery] = useState("")
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [message, setMessage] = useState("")
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [organizationForm, setOrganizationForm] = useState({ name: "", organizationType: "recruiter", website: "" })

  useEffect(() => {
    fetch(`/api/career/visibility${suffix}`).then((response) => response.json()).then(({ visibility }) => {
      if (!visibility) return
      setForm({
        isSearchable: visibility.is_searchable,
        publicName: visibility.public_name || "",
        professionalHeadline: visibility.professional_headline || "",
        targetRoles: (visibility.target_roles || []).join(", "),
        locations: (visibility.locations || []).join(", "),
        skills: (visibility.skills || []).join(", "),
        yearsExperience: visibility.years_experience?.toString() || "",
        linkedinUrl: visibility.linkedin_url || "",
        contactEmail: visibility.contact_email || "",
      })
    }).catch(() => undefined)
  }, [suffix])

  useEffect(() => {
    fetch("/api/career/organization").then(async (response) => response.ok ? response.json() : null).then((data) => setOrganization(data?.organization || null)).catch(() => undefined)
  }, [])

  const save = async () => {
    const payload = {
      workspaceKey,
      isSearchable: form.isSearchable,
      publicName: form.publicName,
      professionalHeadline: form.professionalHeadline,
      targetRoles: split(form.targetRoles),
      locations: split(form.locations),
      skills: split(form.skills),
      yearsExperience: form.yearsExperience ? Number(form.yearsExperience) : null,
      linkedinUrl: form.linkedinUrl,
      contactEmail: form.contactEmail,
    }
    const response = await fetch(`/api/career/visibility${suffix}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
    const data = await response.json().catch(() => ({}))
    setMessage(response.ok ? "Recruiter visibility saved." : data.error || "Settings could not be saved.")
  }

  const search = async () => {
    const response = await fetch(`/api/career/recruiter-search?q=${encodeURIComponent(query)}`)
    const data = await response.json().catch(() => ({}))
    if (!response.ok) setMessage(data.message || data.error || "Candidate search is unavailable.")
    setCandidates(data.candidates || [])
  }

  const submitOrganization = async () => {
    const response = await fetch("/api/career/organization", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(organizationForm) })
    const data = await response.json().catch(() => ({}))
    if (response.ok) {
      setOrganization(data.organization)
      setMessage("Organization submitted for verification.")
      void trackCareerEvent("career.organization_submitted", { organization_type: organizationForm.organizationType })
    } else setMessage(data.error === "upgrade_required" ? "Verified recruiter workspaces require Pro." : data.error || "Organization could not be submitted.")
  }

  return (
    <main className="min-h-full bg-zinc-50/70 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="rounded-3xl bg-[#073f3b] px-7 py-8 text-white"><p className="text-xs font-bold uppercase tracking-[0.16em] text-gold-700">Career Network</p><h1 className="mt-2 text-3xl font-bold">Be searchable without exposing everything.</h1><p className="mt-2 max-w-2xl text-sm text-white/70">Recruiter discovery is opt in and off by default. Contact details never appear in search results.</p><Link href="/career/match" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-xs font-bold text-white">Looking for peers instead of recruiters? Open Signal Match</Link></header>
        {message && <p className="mt-4 rounded-xl border border-gold/20 bg-gold/10 px-4 py-3 text-sm text-zinc-700">{message}</p>}
        <div className="mt-5 grid gap-5">
          <section className="rounded-2xl border border-zinc-200 bg-white p-6">
            <div className="flex items-center justify-between"><div><h2 className="text-xl font-bold text-zinc-900">Candidate visibility</h2><p className="mt-1 text-sm text-zinc-500">Off by default. You control when recruiters can find you.</p></div><button onClick={() => setForm({ ...form, isSearchable: !form.isSearchable })} className={`rounded-full px-4 py-2 text-xs font-bold ${form.isSearchable ? "bg-teal text-white" : "bg-zinc-100 text-zinc-500"}`}>{form.isSearchable ? "Searchable" : "Private"}</button></div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1.5 text-xs font-semibold text-zinc-700">Public name<input className={field} placeholder="Public name" value={form.publicName} onChange={(event) => setForm({ ...form, publicName: event.target.value })} /></label>
              <label className="grid gap-1.5 text-xs font-semibold text-zinc-700">Years of experience<input className={field} placeholder="Years of experience" type="number" min={0} max={60} value={form.yearsExperience} onChange={(event) => setForm({ ...form, yearsExperience: event.target.value })} /></label>
              <label className="grid gap-1.5 text-xs font-semibold text-zinc-700 sm:col-span-2">Professional headline<input className={field} placeholder="Professional headline" value={form.professionalHeadline} onChange={(event) => setForm({ ...form, professionalHeadline: event.target.value })} /></label>
              <label className="grid gap-1.5 text-xs font-semibold text-zinc-700">Target roles, comma separated<input className={field} placeholder="Target roles, comma separated" value={form.targetRoles} onChange={(event) => setForm({ ...form, targetRoles: event.target.value })} /></label>
              <label className="grid gap-1.5 text-xs font-semibold text-zinc-700">Locations, comma separated<input className={field} placeholder="Locations, comma separated" value={form.locations} onChange={(event) => setForm({ ...form, locations: event.target.value })} /></label>
              <label className="grid gap-1.5 text-xs font-semibold text-zinc-700 sm:col-span-2">Skills, comma separated<input className={field} placeholder="Skills, comma separated" value={form.skills} onChange={(event) => setForm({ ...form, skills: event.target.value })} /></label>
              <label className="grid gap-1.5 text-xs font-semibold text-zinc-700">LinkedIn URL<input className={field} placeholder="LinkedIn URL" value={form.linkedinUrl} onChange={(event) => setForm({ ...form, linkedinUrl: event.target.value })} /></label>
              <label className="grid gap-1.5 text-xs font-semibold text-zinc-700">Private contact email<input className={field} placeholder="Private contact email" value={form.contactEmail} onChange={(event) => setForm({ ...form, contactEmail: event.target.value })} /></label>
            </div>
            <button onClick={save} className="mt-4 rounded-xl bg-teal px-5 py-3 text-sm font-bold text-white">Save visibility</button>
          </section>
          <section className="rounded-2xl border border-zinc-200 bg-zinc-50/80 p-6">
            <div className="flex items-start justify-between gap-3"><div><p className="text-[11px] font-bold uppercase tracking-[0.14em] text-zinc-400">For employers and recruiters</p><h2 className="mt-1 text-xl font-bold text-zinc-900">Verified recruiter search</h2><p className="mt-1 text-sm text-zinc-500">Reviewed by hand, not instant. Qalam checks the organization identity and intended use before search is enabled, and search stays locked until it is.</p></div>{organization && <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase ${organization.verification_status === "verified" ? "bg-teal/10 text-teal" : "bg-gold/10 text-gold-700"}`}>{organization.verification_status}</span>}</div>
            {!organization ? <div className="mt-5 grid gap-3"><label className="grid gap-1.5 text-xs font-semibold text-zinc-700">Organization name<input className={field} placeholder="Organization name" value={organizationForm.name} onChange={(event) => setOrganizationForm({ ...organizationForm, name: event.target.value })} /></label><label className="grid gap-1.5 text-xs font-semibold text-zinc-700">Organization type<select className={field} value={organizationForm.organizationType} onChange={(event) => setOrganizationForm({ ...organizationForm, organizationType: event.target.value })}><option value="recruiter">Recruitment agency</option><option value="employer">Employer</option><option value="university">University</option><option value="bootcamp">Bootcamp</option><option value="credential_body">Credential body</option></select></label><label className="grid gap-1.5 text-xs font-semibold text-zinc-700">Organization website<input className={field} type="url" placeholder="Organization website" value={organizationForm.website} onChange={(event) => setOrganizationForm({ ...organizationForm, website: event.target.value })} /></label><button type="button" disabled={!organizationForm.name} onClick={submitOrganization} className="min-h-11 rounded-xl bg-zinc-900 px-5 text-sm font-bold text-white disabled:opacity-40">Submit for verification</button><p className="text-xs leading-5 text-zinc-400">Recruiter search remains locked until Qalam verifies the organization. Candidate visibility does not require Pro.</p></div> : organization.verification_status !== "verified" ? <div className="mt-8 rounded-xl bg-zinc-50 px-5 py-8 text-center"><p className="font-bold text-zinc-900">Verification pending</p><p className="mt-2 text-sm leading-6 text-zinc-500">Qalam will enable search after reviewing the organization identity and use case.</p></div> : <>
            <div className="mt-4 flex gap-2"><input aria-label="Search candidates by role, skill, location, or name" className={field} placeholder="Role, skill, location, or name" value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") search() }} /><button onClick={search} className="rounded-xl bg-zinc-900 px-5 text-sm font-bold text-white">Search</button></div>
            <div className="mt-4 max-h-[520px] space-y-3 overflow-y-auto">
              {candidates.map((candidate) => <article key={candidate.workspace_id} className="rounded-xl border border-zinc-200 p-4"><div className="flex items-start justify-between gap-3"><div><h3 className="font-bold text-zinc-900">{candidate.public_name || "Qalam candidate"}</h3><p className="mt-1 text-sm text-zinc-600">{candidate.professional_headline}</p></div>{candidate.linkedin_url && <a href={candidate.linkedin_url} target="_blank" rel="noreferrer" className="text-xs font-bold text-teal">LinkedIn</a>}</div><p className="mt-3 text-xs text-zinc-500">{candidate.target_roles?.join(" · ")} {candidate.locations?.length ? `| ${candidate.locations.join(", ")}` : ""}</p><div className="mt-3 flex flex-wrap gap-1.5">{candidate.skills?.slice(0, 8).map((skill) => <span key={skill} className="rounded-full bg-zinc-100 px-2.5 py-1 text-[11px] text-zinc-600">{skill}</span>)}</div></article>)}
              {candidates.length === 0 && <p className="py-12 text-center text-sm text-zinc-400">Search results appear here.</p>}
            </div>
            </>}
          </section>
        </div>
      </div>
    </main>
  )
}

const split = (value: string) => value.split(",").map((item) => item.trim()).filter(Boolean)
