"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import type { ResumeData } from "@/lib/career-resume"
import { emptyResumeData } from "@/lib/career-resume"
import { RESUME_TEMPLATES } from "@/lib/resume-templates"
import { ResumePreview } from "@/components/career/ResumePreview"
import { DeleteArtifactButton } from "@/components/DeleteArtifactButton"
import { toHundredPointScore } from "@/lib/free-tool-scores"

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
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    fetch(`/api/career/resumes/${params.id}${suffix}`)
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((data) => setDocument(data.resume))
      .catch(() => setMessage("Resume could not be loaded."))
  }, [params.id, suffix])

  const setData = (patch: Partial<ResumeData>) => {
    if (!document) return
    setDocument({ ...document, resumeData: { ...document.resumeData, ...patch } })
  }

  const save = async () => {
    if (!document) return
    setSaving(true)
    setMessage("")
    const response = await fetch(`/api/career/resumes/${params.id}${suffix}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...document, workspaceKey }),
    })
    const data = await response.json().catch(() => ({}))
    if (response.ok) {
      setDocument(data.resume)
      setMessage("Resume saved. A version snapshot was created.")
    } else setMessage(data.error || "Resume could not be saved.")
    setSaving(false)
  }

  const downloadPdf = async () => {
    if (!document) return
    setDownloading(true)
    setMessage("")
    try {
      const response = await fetch(`/api/career/resumes/${params.id}/pdf${suffix}`)
      if (!response.ok) {
        const body = await response.json().catch(() => ({}))
        throw new Error(body.error || "PDF could not be generated.")
      }
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const anchor = window.document.createElement("a")
      anchor.href = url
      anchor.download = `${document.title.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "") || "ats-resume"}.pdf`
      window.document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(url)
      setMessage("ATS-safe PDF downloaded.")
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "PDF could not be downloaded.")
    } finally {
      setDownloading(false)
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

  return (
    <main className="min-h-full bg-zinc-100 px-4 py-5 lg:px-6">
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
          <div><p className="text-xs font-bold uppercase tracking-[0.14em] text-teal">Resume editor</p><input className="mt-1 min-w-72 border-0 p-0 text-xl font-bold text-zinc-900 outline-none" value={document.title} onChange={(event) => setDocument({ ...document, title: event.target.value })} /></div>
          <div className="flex flex-wrap gap-2"><DeleteArtifactButton itemType="resume" itemTitle={document.title} onDelete={deleteResume} onDeleted={leaveDeletedResume} /><button onClick={downloadPdf} disabled={downloading} className="min-h-11 rounded-xl border border-zinc-300 bg-white px-4 text-sm font-bold text-zinc-700 disabled:opacity-50">{downloading ? "Preparing PDF..." : "Download PDF"}</button><button onClick={save} disabled={saving} className="min-h-11 rounded-xl bg-teal px-4 text-sm font-bold text-white disabled:opacity-50">{saving ? "Saving..." : "Save version"}</button></div>
        </header>
        {message && <p className="mb-4 rounded-xl border border-gold/20 bg-gold/10 px-4 py-3 text-sm text-zinc-700 print:hidden">{message}</p>}

        <div className="grid items-start gap-5 xl:grid-cols-[440px_1fr]">
          <aside className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-5 print:hidden">
            <div className="grid grid-cols-2 gap-3">
              <label><span className={label}>Template</span><select className={input} value={document.templateKey} onChange={(event) => setDocument({ ...document, templateKey: event.target.value })}>{RESUME_TEMPLATES.map((template) => <option key={template.key} value={template.key}>{template.name}</option>)}</select></label>
              <label><span className={label}>ATS score</span><div className="rounded-lg bg-teal/8 px-3 py-2.5 text-sm font-bold text-teal">{document.atsScore != null ? toHundredPointScore(document.atsScore) : "Not scored"}{document.atsScore != null ? "/100" : ""}</div></label>
            </div>

            <Section title="Contact">
              <div className="grid gap-3 sm:grid-cols-2">
                {(["fullName", "email", "phone", "location", "linkedinUrl", "headline"] as const).map((key) => <label key={key} className={key === "headline" || key === "linkedinUrl" ? "sm:col-span-2" : ""}><span className={label}>{key.replace(/([A-Z])/g, " $1")}</span><input className={input} value={data[key]} onChange={(event) => setData({ [key]: event.target.value })} /></label>)}
              </div>
            </Section>

            <Section title="Summary and skills">
              <textarea className={`${input} min-h-28 resize-y`} value={data.summary} onChange={(event) => setData({ summary: event.target.value })} />
              <label className="mt-3 block"><span className={label}>Skills, comma separated</span><textarea className={`${input} min-h-20 resize-y`} value={data.skills.join(", ")} onChange={(event) => setData({ skills: event.target.value.split(",").map((item) => item.trim()).filter(Boolean) })} /></label>
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
                    <textarea className={`${input} mt-2 min-h-28 resize-y`} value={entry.bullets.join("\n")} onChange={(event) => setData({ experience: data.experience.map((item, itemIndex) => itemIndex === index ? { ...item, bullets: event.target.value.split("\n").map((bullet) => bullet.trim()).filter(Boolean) } : item) })} />
                    <button onClick={() => setData({ experience: data.experience.filter((_, itemIndex) => itemIndex !== index) })} className="mt-2 text-xs font-semibold text-red-600">Remove role</button>
                  </div>
                ))}
                <button onClick={() => setData({ experience: [...data.experience, { title: "", organization: "", location: "", startDate: "", endDate: "", bullets: [] }] })} className="text-xs font-bold text-teal">+ Add role</button>
              </div>
            </Section>

            <Section title="Education and certifications">
              <textarea className={`${input} min-h-24 resize-y`} value={data.education.map((item) => [item.title, item.organization, item.startDate, item.endDate].join(" | ")).join("\n")} onChange={(event) => setData({ education: event.target.value.split("\n").filter(Boolean).map((line) => { const [title, organization, startDate, endDate] = line.split("|").map((item) => item.trim()); return { title: title || "", organization: organization || "", location: "", startDate: startDate || "", endDate: endDate || "", bullets: [] } }) })} />
              <label className="mt-3 block"><span className={label}>Certifications, one per line</span><textarea className={`${input} min-h-20 resize-y`} value={data.certifications.join("\n")} onChange={(event) => setData({ certifications: event.target.value.split("\n").map((item) => item.trim()).filter(Boolean) })} /></label>
            </Section>
          </aside>

          <div id="resume-print" className="overflow-auto"><ResumePreview data={data} templateKey={document.templateKey} /></div>
        </div>
      </div>
    </main>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="border-t border-zinc-100 pt-4"><h2 className="mb-3 text-sm font-bold text-zinc-900">{title}</h2>{children}</section>
}
