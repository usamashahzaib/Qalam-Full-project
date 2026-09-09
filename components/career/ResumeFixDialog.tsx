"use client"

import { useEffect, useRef, useState } from "react"
import type { ResumeData } from "@/lib/career-resume"
import { resumeDataSchema } from "@/lib/career-resume"
import { scoreResume, type AtsCheck } from "@/lib/ats-engine"
import { normalizeResumeData } from "@/lib/ats-normalize"

const field = "mt-1 w-full rounded-lg border border-zinc-300 bg-white p-3 text-sm text-zinc-900"

export function ResumeFixDialog({ data, check, targetRole, jobDescription, onApply, onClose }: {
  data: ResumeData; check: AtsCheck; targetRole: string; jobDescription: string
  onApply: (next: ResumeData) => void; onClose: () => void
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [draft, setDraft] = useState<ResumeData>(() => structuredClone(data))
  useEffect(() => { dialog.current?.showModal() }, [])
  const normalized = normalizeResumeData(draft)
  const before = scoreResume({ resume: normalizeResumeData(data), targetRole, jobDescription })
  const after = scoreResume({ resume: normalized, targetRole, jobDescription })
  const delta = after.overall - before.overall
  const valid = resumeDataSchema.safeParse(draft).success
  const changed = JSON.stringify(data) !== JSON.stringify(normalized)
  const set = (patch: Partial<ResumeData>) => setDraft((value) => ({ ...value, ...patch }))
  const contact = ["contact_block", "contact_valid", "profile_link"].includes(check.id)
  const skills = check.id.startsWith("skills_") || check.id === "keyword_coverage"
  const profile = ["headline_present", "title_alignment", "summary_length", "no_buzzwords", "standard_sections"].includes(check.id)
  const education = check.id === "education_present"
  const experience = !contact && !profile && !education

  return <dialog ref={dialog} onCancel={onClose} onClose={onClose} className="fixed inset-0 m-auto max-h-[90vh] w-[min(680px,94vw)] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl backdrop:bg-black/40">
    <div className="flex items-start justify-between gap-4">
      <div><p className="text-xs font-bold uppercase tracking-wide text-teal">Improve your resume</p><h2 className="mt-1 text-xl font-bold">{check.label}</h2></div>
      <button type="button" onClick={onClose} aria-label="Close suggestion" className="rounded-lg border px-3 py-2">Close</button>
    </div>
    <p className="mt-3 text-sm text-zinc-600">{check.detail}</p>
    <p className="mt-2 text-sm leading-relaxed">{check.fix}</p>
    <p className="mt-3 rounded-lg bg-teal/5 p-3 text-sm text-teal">Use details you can verify. Edit the proposed text below, then apply it to your CV. No results or numbers are invented.</p>
    <div className="my-5 space-y-4">
      {contact && (["fullName", "email", "phone", "location", "linkedinUrl"] as const).map((key) => <label className="block text-sm font-semibold" key={key}>{key.replace(/([A-Z])/g, " $1")}<input className={field} value={draft[key]} onChange={(event) => set({ [key]: event.target.value })} /></label>)}
      {profile && <><label className="block text-sm font-semibold">Headline<input className={field} value={draft.headline} onChange={(event) => set({ headline: event.target.value })} /></label><label className="block text-sm font-semibold">Professional summary<textarea rows={6} className={field} value={draft.summary} onChange={(event) => set({ summary: event.target.value })} /></label></>}
      {skills && <label className="block text-sm font-semibold">Skills, one per line<textarea rows={6} className={field} value={draft.skills.join("\n")} onChange={(event) => set({ skills: event.target.value.split("\n") })} /></label>}
      {(experience || education) && <>
        {(education ? draft.education : draft.experience).map((entry, index) => {
          const key = education ? "education" : "experience"
          const update = (patch: Partial<typeof entry>) => set({ [key]: draft[key].map((item, i) => i === index ? { ...item, ...patch } : item) })
          return <fieldset key={index} className="rounded-xl border border-zinc-200 p-4"><legend className="px-1 text-sm font-bold">{entry.organization || `Entry ${index + 1}`}</legend>
            <div className="grid gap-3 sm:grid-cols-2">{(["title", "organization", "location", "startDate", "endDate"] as const).map((name) => <label key={name} className="text-xs font-semibold">{name.replace(/([A-Z])/g, " $1")}<input className={field} value={entry[name]} onChange={(event) => update({ [name]: event.target.value })} /></label>)}</div>
            <label className="mt-3 block text-sm font-semibold">{education ? "Details" : "Achievements, one per line"}<textarea rows={6} className={field} value={entry.bullets.join("\n")} onChange={(event) => update({ bullets: event.target.value.split("\n") })} /></label>
          </fieldset>
        })}
        <button type="button" className="text-sm font-bold text-teal" onClick={() => {
          const key = education ? "education" : "experience"
          set({ [key]: [...draft[key], { title: "", organization: "", location: "", startDate: "", endDate: "", bullets: [] }] })
        }}>+ Add {education ? "education" : "role or career break"}</button>
      </>}
    </div>
    <div className="sticky bottom-0 border-t bg-white pt-4">
      <p className="text-sm font-semibold" aria-live="polite">Score preview: {before.overall} to {after.overall} / 100 ({delta > 0 ? "+" : ""}{delta})</p>
      <p className="mt-1 text-xs text-zinc-500">Points change only when the audit detects stronger evidence. Save a version to keep these changes.</p>
      {!valid && <p className="mt-2 text-sm text-red-700">Some fields exceed the resume limits. Shorten the text or reduce the number of entries.</p>}
      <button type="button" disabled={!changed || !valid} onClick={() => onApply(normalized)} className="mt-3 rounded-xl bg-teal px-5 py-3 text-sm font-bold text-white disabled:opacity-40">Apply to CV</button>
    </div>
  </dialog>
}
