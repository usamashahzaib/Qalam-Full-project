"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import type { ResumeData } from "@/lib/career-resume"
import { emptyResumeData } from "@/lib/career-resume"
import { RESUME_TEMPLATES } from "@/lib/resume-templates"
import { ResumePreview } from "@/components/career/ResumePreview"
import { AtsAuditPanel } from "@/components/career/AtsAuditPanel"
import { scoreResume } from "@/lib/ats-engine"
import { normalizeResumeData } from "@/lib/ats-normalize"
import { ResumeFixDialog } from "@/components/career/ResumeFixDialog"
import { DeleteArtifactButton } from "@/components/DeleteArtifactButton"
import { downloadBlob, sanitizeFilename } from "@/lib/download"

type ResumeDocument = {
  id: string
  title: string
  templateKey: string
  targetRole: string
  targetCompany: string
  jobDescription: string
  resumeData: ResumeData
  analysis: Record<string, unknown>
  atsScore: number | null
  status: "draft" | "ready" | "archived"
}

const input = "w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-teal"
const label = "mb-1 block t-eyebrow text-zinc-500"

export default function ResumeEditorPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const searchParams = useSearchParams()
  const workspaceKey = searchParams.get("client") || undefined
  const suffix = workspaceKey ? `?workspaceKey=${encodeURIComponent(workspaceKey)}` : ""
  const [document, setDocument] = useState<ResumeDocument | null>(null)
  const [message, setMessage] = useState("")
  const [saving, setSaving] = useState(false)
  const [downloading, setDownloading] = useState<"pdf" | "docx" | null>(null)

  const [activeFix, setActiveFix] = useState<string | null>(null)
  const [undoData, setUndoData] = useState<ResumeData | null>(null)
  const [savedSnapshot, setSavedSnapshot] = useState("")
  const audit = useMemo(() => document ? scoreResume({ resume: normalizeResumeData(document.resumeData || emptyResumeData), targetRole: document.targetRole, jobDescription: document.jobDescription }) : null, [document])
  const savedAudit = useMemo(() => {
    if (!savedSnapshot) return null
    const saved = JSON.parse(savedSnapshot) as ResumeDocument
    return scoreResume({ resume: normalizeResumeData(saved.resumeData || emptyResumeData), targetRole: saved.targetRole, jobDescription: saved.jobDescription })
  }, [savedSnapshot])
  const dirty = document !== null && JSON.stringify(document) !== savedSnapshot

  useEffect(() => {
    fetch(`/api/career/resumes/${params.id}${suffix}`)
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((data) => { setDocument(data.resume); setSavedSnapshot(JSON.stringify(data.resume)) })
      .catch(() => setMessage("Resume could not be loaded."))
  }, [params.id, suffix])

  useEffect(() => {
    if (!dirty) return
    const warnOnLeave = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = "" }
    window.addEventListener("beforeunload", warnOnLeave)
    return () => window.removeEventListener("beforeunload", warnOnLeave)
  }, [dirty])

  const setData = (patch: Partial<ResumeData>) => {
    if (!document) return
    setDocument({ ...document, resumeData: { ...document.resumeData, ...patch } })
  }

  const save = async () => {
    if (!document) return false
    setSaving(true)
    setMessage("")
    try {
      const response = await fetch(`/api/career/resumes/${params.id}${suffix}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...document, workspaceKey }),
      })
      const data = await response.json().catch(() => ({}))
      if (response.ok) {
        setDocument(data.resume)
        setSavedSnapshot(JSON.stringify(data.resume))
        setMessage("Resume saved. A version snapshot was created.")
      } else setMessage(data.error || "Resume could not be saved.")
      return response.ok
    } catch {
      setMessage("Resume could not be saved. Your edits are still here. Please retry.")
      return false
    } finally { setSaving(false) }
  }

  // Both formats come from routes that differ only in the path segment and the
  // extension. Word matters as much as PDF here: several ATS extract text more
  // reliably from it, and a recruiter working the file needs to edit it.
  const download = async (format: "pdf" | "docx") => {
    if (!document) return
    setDownloading(format)
    setMessage("")
    try {
      if (dirty && !(await save())) return
      const response = await fetch(`/api/career/resumes/${params.id}/${format}${suffix}`)
      if (!response.ok) {
        const body = await response.json().catch(() => ({}))
        throw new Error(body.error || `The ${format.toUpperCase()} could not be generated.`)
      }
      const blob = await response.blob()
      downloadBlob(blob, `${sanitizeFilename(document.title, "ats-resume")}.${format}`)
      setMessage(`ATS-safe ${format.toUpperCase()} downloaded.`)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : `The ${format.toUpperCase()} could not be downloaded.`)
    } finally {
      setDownloading(null)
    }
  }

  const deleteResume = async () => {
    if (!document) return
    const response = await fetch(`/api/career/resumes/${params.id}${suffix}`, { method: "DELETE" })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(data.error || "Resume could not be deleted.")
  }

  const leaveDeletedResume = () => router.replace(`/career/resumes${workspaceKey ? `?client=${encodeURIComponent(workspaceKey)}` : ""}`)

  if (!document) return <main className="p-8 text-sm text-zinc-500">{message || "Loading resume..."}</main>
  const data = document.resumeData || emptyResumeData
  const selectedCheck = audit?.factors.flatMap((factor) => factor.checks).find((check) => check.id === activeFix)


  return (
    <main className="min-h-full bg-zinc-100 px-4 py-5 lg:px-6">
      {selectedCheck && <ResumeFixDialog key={selectedCheck.id} data={data} check={selectedCheck} targetRole={document.targetRole} jobDescription={document.jobDescription} onClose={() => setActiveFix(null)} onApply={(next) => {
        setUndoData(structuredClone(data))
        setData(next)
        setActiveFix(null)
        setMessage("Suggestion applied. Your CV and score have updated. Save a version to keep it.")
      }} />}
      <style jsx global>{`
        @media print {
          body * { visibility: hidden !important; }
          #resume-print, #resume-print * { visibility: visible !important; }
          #resume-print { position: absolute; inset: 0; width: 100%; }
          @page { size: A4; margin: 0; }
        }
      `}</style>
      <div className="mx-auto max-w-[1500px]">
        <header className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-white px-5 py-4 print:hidden">
          <div><p className="text-xs font-bold uppercase tracking-[0.14em] text-teal">Resume editor</p><input className="mt-1 min-w-72 border-0 p-0 text-xl font-bold text-zinc-900 outline-none" disabled={saving || downloading !== null} value={document.title} onChange={(event) => setDocument({ ...document, title: event.target.value })} /></div>
          <div className="flex flex-wrap gap-2"><DeleteArtifactButton itemType="resume" itemTitle={document.title} onDelete={deleteResume} onDeleted={leaveDeletedResume} /><button onClick={() => download("docx")} disabled={downloading !== null || saving} className="min-h-11 rounded-xl border border-zinc-300 bg-white px-4 text-sm font-bold text-zinc-700 disabled:opacity-50">{downloading === "docx" ? "Preparing Word..." : "Download Word"}</button><button onClick={() => download("pdf")} disabled={downloading !== null || saving} className="min-h-11 rounded-xl border border-zinc-300 bg-white px-4 text-sm font-bold text-zinc-700 disabled:opacity-50">{downloading === "pdf" ? "Preparing PDF..." : "Download PDF"}</button><button onClick={save} disabled={saving || downloading !== null} className="min-h-11 rounded-xl bg-teal px-4 text-sm font-bold text-white disabled:opacity-50">{saving ? "Saving..." : "Save version"}</button></div>
        </header>
        <p className="mb-3 text-sm text-zinc-600 print:hidden" role="status">{dirty ? "Unsaved changes. Downloads save your latest edits first." : "All changes saved."}</p>
        {undoData && <button className="mb-3 text-sm font-bold text-teal print:hidden" disabled={saving || downloading !== null} onClick={() => { setData(undoData); setUndoData(null); setMessage("Suggestion undone.") }}>Undo last suggestion</button>}
        {message && <p className="mb-4 rounded-xl border border-gold/20 bg-gold/10 px-4 py-3 text-sm text-zinc-700 print:hidden">{message}</p>}

        <div className="grid items-start gap-5 xl:grid-cols-[440px_1fr]">
          <fieldset disabled={saving || downloading !== null} className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-5 print:hidden">
            <div className="grid grid-cols-2 gap-3">
              <label><span className={label}>Template</span><select className={input} value={document.templateKey} onChange={(event) => setDocument({ ...document, templateKey: event.target.value })}>{RESUME_TEMPLATES.map((template) => <option key={template.key} value={template.key}>{template.name}</option>)}</select></label>
              <label><span className={label}>Live readiness</span><div className="rounded-lg bg-teal/8 px-3 py-2.5 text-sm font-bold text-teal">{audit?.overall ?? "Not scored"}{audit ? "/100" : ""}</div>{audit && savedAudit && audit.overall !== savedAudit.overall && <span className="mt-1 block text-xs text-teal">{audit.overall > savedAudit.overall ? "+" : ""}{audit.overall - savedAudit.overall} since last save</span>}<a href="#resume-audit" className="mt-1 block text-xs font-semibold text-teal underline">See fixes and breakdown</a></label>
            </div>

            <label className="block"><span className={label}>Target role</span><input className={input} value={document.targetRole} onChange={(event) => setDocument({ ...document, targetRole: event.target.value })} /></label>
            <label className="block">
              <span className={label}>Job description, optional</span>
              <textarea className={`${input} min-h-24 resize-y`} value={document.jobDescription} onChange={(event) => setDocument({ ...document, jobDescription: event.target.value })} placeholder="Paste the posting to score keyword coverage against the exact advert." />
            </label>

            <Section title="Contact">
              <div className="grid gap-3 sm:grid-cols-2">
                {(["fullName", "email", "phone", "location", "linkedinUrl", "headline"] as const).map((key) => <label key={key} className={key === "headline" || key === "linkedinUrl" ? "sm:col-span-2" : ""}><span className={label}>{key.replace(/([A-Z])/g, " $1")}</span><input className={input} value={data[key]} onChange={(event) => setData({ [key]: event.target.value })} /></label>)}
              </div>
            </Section>

            <Section title="Summary and skills">
              <textarea className={`${input} min-h-28 resize-y`} value={data.summary} onChange={(event) => setData({ summary: event.target.value })} />
              <label className="mt-3 block"><span className={label}>Skills, comma separated</span><textarea className={`${input} min-h-20 resize-y`} value={data.skills.join(", ")} onChange={(event) => setData({ skills: event.target.value.split(",") })} /></label>
            </Section>

            <Section title="Experience">
              <div className="space-y-4">
                {data.experience.map((entry, index) => (
                  <div key={index} className="rounded-xl border border-zinc-200 p-3">
                    <div className="grid gap-2 sm:grid-cols-2">
                      <input className={input} placeholder="Job title" value={entry.title} onChange={(event) => setData({ experience: data.experience.map((item, itemIndex) => itemIndex === index ? { ...item, title: event.target.value } : item) })} />
                      <input className={input} placeholder="Organization" value={entry.organization} onChange={(event) => setData({ experience: data.experience.map((item, itemIndex) => itemIndex === index ? { ...item, organization: event.target.value } : item) })} />
                      <input className={input} placeholder="Start date" value={entry.startDate} onChange={(event) => setData({ experience: data.experience.map((item, itemIndex) => itemIndex === index ? { ...item, startDate: event.target.value } : item) })} />
                      <input className={input} placeholder="End date" value={entry.endDate} onChange={(event) => setData({ experience: data.experience.map((item, itemIndex) => itemIndex === index ? { ...item, endDate: event.target.value } : item) })} />
                    </div>
                    <textarea className={`${input} mt-2 min-h-28 resize-y`} value={entry.bullets.join("\n")} onChange={(event) => setData({ experience: data.experience.map((item, itemIndex) => itemIndex === index ? { ...item, bullets: event.target.value.split("\n") } : item) })} />
                    <button onClick={() => setData({ experience: data.experience.filter((_, itemIndex) => itemIndex !== index) })} className="mt-2 text-xs font-semibold text-red-600">Remove role</button>
                  </div>
                ))}
                <button onClick={() => setData({ experience: [...data.experience, { title: "", organization: "", location: "", startDate: "", endDate: "", bullets: [] }] })} className="text-xs font-bold text-teal">+ Add role</button>
              </div>
            </Section>

            <Section title="Education and certifications">
              <textarea className={`${input} min-h-24 resize-y`} value={data.education.map((item) => [item.title, item.organization, item.startDate, item.endDate].join(" | ")).join("\n")} onChange={(event) => setData({ education: event.target.value.split("\n").filter(Boolean).map((line) => { const [title, organization, startDate, endDate] = line.split("|").map((item) => item.trim()); return { title: title || "", organization: organization || "", location: "", startDate: startDate || "", endDate: endDate || "", bullets: [] } }) })} />
              <label className="mt-3 block"><span className={label}>Certifications, one per line</span><textarea className={`${input} min-h-20 resize-y`} value={data.certifications.join("\n")} onChange={(event) => setData({ certifications: event.target.value.split("\n") })} /></label>
            </Section>
          </fieldset>

          <div className="space-y-5">
            <div id="resume-print" className="overflow-auto"><ResumePreview data={data} templateKey={document.templateKey} /></div>
            {audit && (
              <section id="resume-audit" className="scroll-mt-5 rounded-2xl border border-zinc-200 bg-zinc-50/70 p-5 print:hidden">
                <h2 className="mb-1 text-sm font-bold text-zinc-900">ATS readiness audit</h2>
                <p className="mb-4 text-xs text-zinc-500">Updates as you edit. The same scoring rules are used when you save. Design changes alone do not earn points.</p>
                <AtsAuditPanel audit={audit} baseline={savedAudit ?? undefined} onFix={setActiveFix} />
              </section>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="border-t border-zinc-100 pt-4"><h2 className="mb-3 text-sm font-bold text-zinc-900">{title}</h2>{children}</section>
}
