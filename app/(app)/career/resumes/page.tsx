"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { RESUME_TEMPLATES } from "@/lib/resume-templates"

type ResumeListItem = {
  id: string
  title: string
  templateKey: string
  targetRole: string
  targetCompany: string
  atsScore: number | null
  updatedAt: string
}

const field = "w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none focus:border-teal focus:ring-2 focus:ring-teal/10"

const defaultForm = { title: "", templateKey: "clean", targetRole: "", targetCompany: "", jobDescription: "", sourceResume: "" }

function readResumeHandoff(): { form: typeof defaultForm; open: boolean } {
  if (typeof window === "undefined") return { form: defaultForm, open: false }
  try {
    const raw = sessionStorage.getItem("careerResumeHandoff")
    if (!raw) return { form: defaultForm, open: false }
    sessionStorage.removeItem("careerResumeHandoff")
    const p = JSON.parse(raw) as { sourceResume?: string; jobDescription?: string; targetRole?: string }
    return {
      open: true,
      form: {
        title: p.targetRole ? `${p.targetRole} resume` : "",
        templateKey: "clean",
        targetRole: p.targetRole || "",
        targetCompany: "",
        jobDescription: p.jobDescription || "",
        sourceResume: p.sourceResume || "",
      },
    }
  } catch {
    return { form: defaultForm, open: false }
  }
}

export default function ResumesPage() {
  const searchParams = useSearchParams()
  const workspaceKey = searchParams.get("client") || undefined
  const suffix = workspaceKey ? `?workspaceKey=${encodeURIComponent(workspaceKey)}` : ""
  const [resumes, setResumes] = useState<ResumeListItem[]>([])
  const [handoff] = useState(readResumeHandoff)
  const [showCreate, setShowCreate] = useState(handoff.open)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [form, setForm] = useState(handoff.form)
  const [uploading, setUploading] = useState(false)
  const [sourceLabel, setSourceLabel] = useState("")

  useEffect(() => {
    fetch(`/api/career/resumes${suffix}`)
      .then((res) => res.json())
      .then((data) => setResumes(data.resumes || []))
      .catch(() => setError("Resumes could not be loaded."))
  }, [suffix])

  const uploadResumeFile = async (file: File, source: "resume" | "linkedin") => {
    setUploading(true)
    setError("")
    try {
      const body = new FormData()
      body.append("file", file)
      const response = await fetch(`/api/career/resume-parse${suffix}`, { method: "POST", body })
      const data = await response.json().catch(() => ({}))
      if (!response.ok || typeof data.text !== "string") {
        setError(data.error ? `Upload failed: ${data.error}` : "Resume file could not be read.")
        return
      }
      setForm((prev) => ({ ...prev, sourceResume: data.text }))
      setSourceLabel(source === "linkedin" ? `LinkedIn profile imported: ${file.name}` : `Resume imported: ${file.name}`)
    } catch {
      setError("Resume upload failed.")
    } finally {
      setUploading(false)
    }
  }

  const generate = async () => {
    setLoading(true)
    setError("")
    const response = await fetch(`/api/career/resumes/generate${suffix}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, workspaceKey }),
    })
    const data = await response.json().catch(() => ({}))
    if (response.ok) {
      window.location.href = `/career/resumes/${data.id}${workspaceKey ? `?client=${encodeURIComponent(workspaceKey)}` : ""}`
      return
    }
    setError(data.error || "Resume generation failed.")
    setLoading(false)
  }

  return (
    <main className="min-h-full bg-zinc-50/70 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-col gap-4 rounded-3xl bg-[#073f3b] px-7 py-8 text-white sm:flex-row sm:items-end sm:justify-between">
          <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-gold-700">ATS Resume Studio</p><h1 className="mt-2 text-3xl font-bold">One career. Every resume targeted.</h1><p className="mt-2 max-w-2xl text-sm text-white/70">Build from verified experience, match the exact JD, edit every line, and export an ATS-safe PDF.</p></div>
          <button onClick={() => setShowCreate((value) => !value)} className="rounded-xl bg-gold px-5 py-3 text-sm font-bold text-teal-900">{showCreate ? "Close" : "Create targeted resume"}</button>
        </header>

        {error && <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

        {showCreate && (
          <section className="mt-5 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-zinc-900">Generate from an existing resume</h2>
            <p className="mt-1 text-sm text-zinc-500">Import a resume or your LinkedIn profile PDF. Qalam rewrites only supported facts. It will not invent experience or metrics.</p>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <label className="flex min-h-32 flex-col items-start justify-between gap-3 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-4 text-sm">
              <div>
                <p className="font-semibold text-zinc-900">Import resume</p>
                <p className="mt-1 text-xs leading-relaxed text-zinc-500">Upload a PDF or DOCX up to 5 MB. Review the extracted text before generation.</p>
              </div>
              <span className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg bg-teal px-4 text-xs font-bold text-white transition hover:bg-teal-600">
                {uploading ? "Reading file..." : "Choose resume"}
                <input
                  type="file"
                  accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  className="hidden"
                  disabled={uploading}
                  onChange={(event) => {
                    const file = event.target.files?.[0]
                    event.target.value = ""
                    if (file) void uploadResumeFile(file, "resume")
                  }}
                />
              </span>
            </label>
            <label className="flex min-h-32 flex-col items-start justify-between gap-3 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-4 text-sm">
              <div>
                <p className="font-semibold text-zinc-900">Import LinkedIn profile</p>
                <p className="mt-1 text-xs leading-relaxed text-zinc-500">On LinkedIn, open More, choose Save to PDF, then upload that file here.</p>
              </div>
              <span className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-teal px-4 text-xs font-bold text-teal transition hover:bg-teal/5">
                {uploading ? "Reading file..." : "Choose LinkedIn PDF"}
                <input type="file" accept=".pdf,application/pdf" className="hidden" disabled={uploading} onChange={(event) => {
                  const file = event.target.files?.[0]
                  event.target.value = ""
                  if (file) void uploadResumeFile(file, "linkedin")
                }} />
              </span>
            </label>
            </div>
            {sourceLabel && <p className="mt-3 rounded-lg bg-teal/5 px-3 py-2 text-xs font-semibold text-teal">{sourceLabel}</p>}

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <input className={field} placeholder="Resume name" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
              <input className={field} placeholder="Target role" value={form.targetRole} onChange={(event) => setForm({ ...form, targetRole: event.target.value })} />
              <input className={field} placeholder="Target company, optional" value={form.targetCompany} onChange={(event) => setForm({ ...form, targetCompany: event.target.value })} />
              <select className={field} value={form.templateKey} onChange={(event) => setForm({ ...form, templateKey: event.target.value })}>{RESUME_TEMPLATES.map((template) => <option key={template.key} value={template.key}>{template.name} - {template.bestFor}</option>)}</select>
              <textarea className={`${field} min-h-64 resize-y`} placeholder="Imported source appears here, or paste your resume or LinkedIn profile text" value={form.sourceResume} onChange={(event) => setForm({ ...form, sourceResume: event.target.value })} />
              <textarea className={`${field} min-h-64 resize-y`} placeholder="Paste the exact job description" value={form.jobDescription} onChange={(event) => setForm({ ...form, jobDescription: event.target.value })} />
            </div>
            <button disabled={loading || uploading} onClick={generate} className="mt-5 rounded-xl bg-teal px-5 py-3 text-sm font-bold text-white disabled:opacity-50">{loading ? "Building targeted resume..." : "Generate ATS resume"}</button>
          </section>
        )}

        <section className="mt-5">
          <div className="mb-3 flex items-center justify-between"><h2 className="text-lg font-bold text-zinc-900">Your resumes</h2><span className="text-xs text-zinc-500">{resumes.length} saved</span></div>
          {resumes.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-300 bg-white px-6 py-14 text-center"><p className="font-semibold text-zinc-800">No resumes yet.</p><p className="mt-1 text-sm text-zinc-500">Your first targeted resume is free.</p></div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {resumes.map((resume) => (
                <Link key={resume.id} href={`/career/resumes/${resume.id}${workspaceKey ? `?client=${encodeURIComponent(workspaceKey)}` : ""}`} className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-teal/30 hover:shadow-md">
                  <div className="flex items-start justify-between"><span className="rounded-full bg-teal/10 px-2.5 py-1 text-[10px] font-bold uppercase text-teal">{resume.templateKey}</span>{resume.atsScore != null && <span className="text-sm font-bold text-gold-700">{resume.atsScore}/100</span>}</div>
                  <h3 className="mt-5 font-bold text-zinc-900">{resume.title}</h3>
                  <p className="mt-1 text-sm text-zinc-500">{resume.targetRole}{resume.targetCompany ? ` at ${resume.targetCompany}` : ""}</p>
                  <p className="mt-4 text-xs text-zinc-400">Updated {new Date(resume.updatedAt).toLocaleDateString()}</p>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
