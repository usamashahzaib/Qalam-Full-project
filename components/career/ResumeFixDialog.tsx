"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import type { ResumeData } from "@/lib/career-resume"
import { resumeDataSchema } from "@/lib/career-resume"
import type { AtsCheck } from "@/lib/ats-engine"
import { normalizeResumeData } from "@/lib/ats-normalize"
import {
  FIX_FORMULAS, PLACEHOLDER, REWRITE_CHECKS, fillPlaceholdersForEstimate, findFixTargets, hasPlaceholder,
  quickFixes, readPath, scoreOf, writePath, type FixTarget,
} from "@/lib/ats-fixes"
import { titleCase } from "@/lib/title-case"

const field = "mt-1 w-full rounded-lg border border-zinc-300 bg-white p-3 text-sm text-zinc-900 outline-none focus:border-teal"

type Suggestion = { id: string; options: string[] }

const gainTone = (gain: number) => (gain > 0 ? "bg-teal/10 text-teal" : "bg-zinc-100 text-zinc-500")

/**
 * Fix flow for one failing check.
 *
 * It shows the exact lines costing points, offers rewrites for each line with
 * the score change computed by the real engine, and lets the candidate fill any
 * figure the rewrite needs before it can be applied. Nothing is written to the
 * CV until "Apply to CV".
 */
export function ResumeFixDialog({ data, check, targetRole, jobDescription, workspaceKey, onApply, onClose }: {
  data: ResumeData; check: AtsCheck; targetRole: string; jobDescription: string; workspaceKey?: string
  onApply: (next: ResumeData) => void; onClose: () => void
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const context = useMemo(() => ({ targetRole, jobDescription }), [targetRole, jobDescription])
  const [draft, setDraft] = useState<ResumeData>(() => normalizeResumeData(structuredClone(data)))
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [editing, setEditing] = useState<Record<string, string>>({})
  const [manual, setManual] = useState(false)
  const [fetched, setFetched] = useState(false)

  useEffect(() => {
    const element = dialog.current
    if (!element) return
    // showModal throws when the dialog is already open, which React's
    // development double effect triggers. Guarding keeps the fix flow opening
    // in every environment.
    if (!element.open) {
      if (typeof element.showModal === "function") element.showModal()
      else element.setAttribute("open", "")
    }
  }, [])

  const baseline = useMemo(() => scoreOf(data, context), [data, context])
  const after = useMemo(() => scoreOf(draft, context), [draft, context])
  const targets = useMemo(() => findFixTargets(check.id, normalizeResumeData(data), baseline), [check.id, data, baseline])
  const quick = useMemo(() => quickFixes(check.id, draft, scoreOf(draft, context), context), [check.id, draft, context])
  const canRewrite = REWRITE_CHECKS.has(check.id) && targets.length > 0
  const writing = loading || (canRewrite && !fetched)
  const formula = FIX_FORMULAS[check.id]

  const normalized = normalizeResumeData(draft)
  const delta = after.overall - baseline.overall
  const valid = resumeDataSchema.safeParse(draft).success
  const changed = JSON.stringify(normalizeResumeData(data)) !== JSON.stringify(normalized)
  const unfilled = [normalized.headline, normalized.summary, ...normalized.experience.flatMap((entry) => entry.bullets)].some(hasPlaceholder)
  const set = (patch: Partial<ResumeData>) => setDraft((value) => ({ ...value, ...patch }))

  // The request returns data only; state is set in the promise callbacks so
  // the opening effect never renders synchronously.
  const loadSuggestions = async (regenerate: boolean): Promise<{ suggestions: Suggestion[]; error: string }> => {
    try {
      const response = await fetch(`/api/career/resumes/fix-suggestions${workspaceKey ? `?workspaceKey=${encodeURIComponent(workspaceKey)}` : ""}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checkId: check.id, targetRole, jobDescription, resumeData: normalizeResumeData(data), regenerate, workspaceKey }),
      })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) return { suggestions: [], error: body.error || "Suggestions could not be loaded." }
      const list: Suggestion[] = Array.isArray(body.suggestions) ? body.suggestions : []
      return { suggestions: list, error: list.length ? "" : "No rewrites came back for these lines. Use the sentence shape above to edit them yourself." }
    } catch {
      return { suggestions: [], error: "Suggestions could not be loaded. Check your connection and try again." }
    }
  }

  const showResult = (result: { suggestions: Suggestion[]; error: string }) => {
    setSuggestions(result.suggestions)
    setError(result.error)
    setLoading(false)
    setFetched(true)
  }

  const regenerateSuggestions = () => {
    setLoading(true)
    setError("")
    void loadSuggestions(true).then(showResult)
  }

  useEffect(() => {
    if (canRewrite) void loadSuggestions(false).then(showResult)
    // Fetch once per opened check; the resume is fixed while the dialog is open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Overall change when the ceiling allows it; otherwise the change to the
  // weighted total, which is what lifts the ceiling once enough lines improve.
  const gainFor = (target: FixTarget, text: string) => {
    const estimate = scoreOf(writePath(draft, target.path, fillPlaceholdersForEstimate(text)), context)
    return estimate.overall - after.overall || estimate.rawOverall - after.rawOverall
  }

  const applyText = (target: FixTarget, text: string) => {
    setDraft((value) => writePath(value, target.path, text))
    setEditing((value) => ({ ...value, [target.id]: text }))
  }

  const contact = ["contact_block", "contact_valid", "profile_link"].includes(check.id)
  const education = check.id === "education_present"
  const experienceFields = ["dated_entries", "history_depth", "timeline_complete", "tenure_pattern", "scope_growth", "bullet_balance"].includes(check.id)

  return <dialog ref={dialog} onCancel={onClose} onClose={onClose} aria-labelledby="fix-title" className="fixed inset-0 m-auto max-h-[92vh] w-[min(760px,95vw)] overflow-y-auto rounded-2xl bg-white p-0 text-zinc-900 shadow-xl backdrop:bg-black/40">
    <div className="p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold text-teal">Improve Your Resume</p>
          <h2 id="fix-title" className="mt-1 text-xl font-bold">{titleCase(check.label)}</h2>
          <p className="mt-1 text-sm text-zinc-600">{check.detail}{check.pointsAtStake > 0 ? ` - up to +${check.pointsAtStake} points available` : ""}</p>
        </div>
        <button type="button" onClick={onClose} aria-label="Close suggestion" className="min-h-10 rounded-lg border border-zinc-300 px-3 text-sm font-semibold">Close</button>
      </div>

      {check.fix && <p className="mt-4 text-sm leading-relaxed text-zinc-700">{check.fix}</p>}

      {formula && (
        <div className="mt-4 rounded-xl border border-teal/20 bg-teal/5 p-4">
          <p className="text-xs font-bold text-teal">Sentence Shape</p>
          <p className="mt-1 text-sm font-semibold">{formula.formula}</p>
          <p className="mt-1 text-sm text-zinc-600">Example: {formula.example}</p>
        </div>
      )}

      {quick.length > 0 && (
        <section className="mt-5">
          <h3 className="text-sm font-bold">One-Click Fixes</h3>
          <ul className="mt-2 space-y-2">
            {quick.map((fix) => {
              const next = scoreOf(fix.next, context)
              const gain = next.overall - after.overall
              const rawGain = next.rawOverall - after.rawOverall
              return <li key={fix.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 p-3">
                <div className="min-w-0 flex-1"><p className="text-sm font-semibold">{fix.title}</p><p className="mt-0.5 text-xs text-zinc-600">{fix.description}</p></div>
                <span className={`rounded-full px-2 py-0.5 text-xs font-bold tabular-nums ${gainTone(Math.max(gain, rawGain))}`} title={gain > 0 ? "Score change if applied" : "Raises the weighted total; the score moves once the ceiling is cleared"}>{gain > 0 ? `+${gain}` : rawGain > 0 ? `+${rawGain} toward total` : "Cleaner"}</span>
                <button type="button" onClick={() => setDraft(fix.next)} className="min-h-10 rounded-lg bg-teal px-3 text-sm font-bold text-white">Apply</button>
              </li>
            })}
          </ul>
        </section>
      )}

      {canRewrite && (
        <section className="mt-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-bold">Lines Costing You Points ({targets.length})</h3>
            <button type="button" disabled={writing} onClick={regenerateSuggestions} className="text-sm font-bold text-teal underline disabled:opacity-50">{writing ? "Writing suggestions..." : "New Suggestions"}</button>
          </div>
          <p className="mt-1 text-xs text-zinc-500">Pick a rewrite or edit the line yourself. Anything in [brackets] is a figure only you know: fill it in before applying. Qalam never invents numbers.</p>
          {error && <p className="mt-2 rounded-lg bg-gold/10 px-3 py-2 text-sm text-zinc-700">{error}</p>}
          <ol className="mt-3 space-y-4">
            {targets.map((target) => {
              const options = suggestions.find((item) => item.id === target.id)?.options || []
              const value = editing[target.id] ?? readPath(draft, target.path)
              return <li key={target.id} className="rounded-xl border border-zinc-200 p-4">
                <p className="text-xs font-semibold text-zinc-500">{target.context}</p>
                <p className="mt-1 rounded-lg bg-red-50 px-3 py-2 text-sm text-zinc-800"><span className="mr-2 text-xs font-bold text-red-700">Now</span>{target.current || "(empty)"}</p>
                <p className="mt-1 text-xs text-red-700">{target.problem}</p>

                {writing && options.length === 0 && <p className="mt-3 text-sm text-zinc-500">Writing rewrites for this line...</p>}
                {options.length > 0 && <ul className="mt-3 space-y-2">
                  {options.map((option, index) => {
                    const gain = gainFor(target, option)
                    const needsInput = hasPlaceholder(option)
                    return <li key={index} className="flex flex-wrap items-start gap-3 rounded-lg border border-teal/20 bg-teal/[0.03] p-3">
                      <p className="min-w-0 flex-1 text-sm leading-relaxed">{option.split(PLACEHOLDER).map((part, partIndex) => partIndex % 2 === 1 ? <mark key={partIndex} className="rounded bg-gold/25 px-1 font-semibold text-zinc-900">[{part}]</mark> : <span key={partIndex}>{part}</span>)}</p>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-bold tabular-nums ${gainTone(gain)}`} title={needsInput ? "Estimated once the bracketed figure is filled in" : "Score change if applied"}>{gain > 0 ? `+${gain}${needsInput ? " once filled" : ""}` : "No change"}</span>
                      <button type="button" onClick={() => applyText(target, option)} className="min-h-9 shrink-0 rounded-lg bg-teal px-3 text-xs font-bold text-white">Use this</button>
                    </li>
                  })}
                </ul>}

                <label className="mt-3 block text-xs font-semibold text-zinc-600">Your version
                  <textarea rows={target.path.kind === "summary" ? 4 : 2} className={field} value={value} onChange={(event) => applyText(target, event.target.value)} />
                </label>
                {hasPlaceholder(value) && <p className="mt-1 text-xs font-semibold text-gold-700">Replace the [bracketed] text with your real figure.</p>}
              </li>
            })}
          </ol>
        </section>
      )}

      {(contact || education || experienceFields || !canRewrite) && (
        <section className="mt-5 space-y-4">
          {contact && (["fullName", "email", "phone", "location", "linkedinUrl"] as const).map((key) => <label className="block text-sm font-semibold" key={key}>{titleCase(key.replace(/([A-Z])/g, " $1"))}<input className={field} value={draft[key]} placeholder={key === "location" ? "Lahore, Pakistan" : key === "phone" ? "+92 300 1234567" : key === "linkedinUrl" ? "linkedin.com/in/yourname" : ""} onChange={(event) => set({ [key]: event.target.value })} /></label>)}
          {education && <EntryEditor entries={draft.education} kind="education" onChange={(education) => set({ education })} />}
          {(experienceFields || (!contact && !education && !canRewrite && quick.length === 0)) && <EntryEditor entries={draft.experience} kind="experience" onChange={(experience) => set({ experience })} />}
        </section>
      )}

      {canRewrite && (
        <div className="mt-5">
          <button type="button" onClick={() => setManual((value) => !value)} className="text-sm font-bold text-teal underline" aria-expanded={manual}>{manual ? "Hide full editor" : "Edit the whole section instead"}</button>
          {manual && <div className="mt-3 space-y-4">
            <label className="block text-sm font-semibold">Headline<input className={field} value={draft.headline} onChange={(event) => set({ headline: event.target.value })} /></label>
            <label className="block text-sm font-semibold">Summary<textarea rows={5} className={field} value={draft.summary} onChange={(event) => set({ summary: event.target.value })} /></label>
            <label className="block text-sm font-semibold">Skills, one per line<textarea rows={5} className={field} value={draft.skills.join("\n")} onChange={(event) => set({ skills: event.target.value.split("\n") })} /></label>
            <EntryEditor entries={draft.experience} kind="experience" onChange={(experience) => set({ experience })} />
          </div>}
        </div>
      )}
    </div>

    <div className="sticky bottom-0 border-t border-zinc-200 bg-white px-6 py-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div aria-live="polite">
          <p className="text-sm font-bold">Score: {baseline.overall} <span className="text-zinc-400">to</span> {after.overall} / 100 <span className={delta > 0 ? "text-teal" : delta < 0 ? "text-red-700" : "text-zinc-500"}>({delta > 0 ? "+" : ""}{delta})</span></p>
          {after.caps.length > 0 && <p className="text-xs font-semibold text-gold-700">Held at {after.overall} by a ceiling: {after.caps[0].reason} Weighted total is {after.rawOverall}.</p>}
          <p className="text-xs text-zinc-500">{unfilled ? "Fill every [bracketed] figure to apply." : !valid ? "Some fields exceed the resume limits. Shorten the text." : changed ? "Ready. Click Apply to CV, then save a version to keep it." : "Choose a fix above to see the score move."}</p>
        </div>
        <button type="button" disabled={!changed || !valid || unfilled} onClick={() => onApply(normalized)} className="min-h-11 rounded-xl bg-teal px-5 text-sm font-bold text-white disabled:opacity-40">Apply to CV</button>
      </div>
    </div>
  </dialog>
}

function EntryEditor({ entries, kind, onChange }: { entries: ResumeData["experience"]; kind: "experience" | "education"; onChange: (entries: ResumeData["experience"]) => void }) {
  return <div className="space-y-3">
    {entries.map((entry, index) => {
      const update = (patch: Partial<typeof entry>) => onChange(entries.map((item, i) => (i === index ? { ...item, ...patch } : item)))
      return <fieldset key={index} className="rounded-xl border border-zinc-200 p-4"><legend className="px-1 text-sm font-bold">{entry.organization || `Entry ${index + 1}`}</legend>
        <div className="grid gap-3 sm:grid-cols-2">{(["title", "organization", "location", "startDate", "endDate"] as const).map((name) => <label key={name} className="text-xs font-semibold">{titleCase(name.replace(/([A-Z])/g, " $1"))}<input className={field} placeholder={name.endsWith("Date") ? "Mar 2021" : ""} value={entry[name]} onChange={(event) => update({ [name]: event.target.value })} /></label>)}</div>
        <label className="mt-3 block text-sm font-semibold">{kind === "education" ? "Details" : "Achievements, one per line"}<textarea rows={4} className={field} value={entry.bullets.join("\n")} onChange={(event) => update({ bullets: event.target.value.split("\n") })} /></label>
      </fieldset>
    })}
    <button type="button" className="text-sm font-bold text-teal" onClick={() => onChange([...entries, { title: "", organization: "", location: "", startDate: "", endDate: "", bullets: [] }])}>+ Add {kind === "education" ? "education" : "role or career break"}</button>
  </div>
}
