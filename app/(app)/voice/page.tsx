"use client"

import { useMemo, useState } from "react"
import { useWorkspace } from "@/components/providers/WorkspaceProvider"

const LINKEDIN_RE = /^https:\/\/(www\.)?linkedin\.com\/(in|company)\/[A-Za-z0-9-_%]+\/?$/

export default function VoiceProfilePage() {
  const { profile, saveProfile, isLoadingProfile, posts, drafts, scheduled, published } = useWorkspace()
  const [editing, setEditing] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [goalInput, setGoalInput] = useState("")
  const [draft, setDraft] = useState({
    name: profile.name,
    title: profile.title,
    linkedinUrl: profile.linkedinUrl,
    industry: profile.industry,
    tone: profile.tone,
    goals: profile.goals,
  })

  const readyCount = useMemo(
    () => [profile.name, profile.title, profile.linkedinUrl, profile.industry, profile.tone, profile.goals.length ? "goals" : ""].filter(Boolean).length,
    [profile]
  )

  const resetDraft = () => {
    setDraft({
      name: profile.name,
      title: profile.title,
      linkedinUrl: profile.linkedinUrl,
      industry: profile.industry,
      tone: profile.tone,
      goals: profile.goals,
    })
    setGoalInput("")
  }

  const startEdit = () => {
    resetDraft()
    setStatus(null)
    setEditing(true)
  }

  const save = async () => {
    const trimmedUrl = draft.linkedinUrl.trim()
    if (trimmedUrl && !LINKEDIN_RE.test(trimmedUrl)) {
      setStatus("Use a valid public LinkedIn profile URL.")
      return
    }
    try {
      setStatus("Saving...")
      await saveProfile({
        name: draft.name.trim(),
        title: draft.title.trim(),
        linkedinUrl: trimmedUrl,
        industry: draft.industry.trim(),
        tone: draft.tone.trim(),
        goals: draft.goals,
      })
      setEditing(false)
      setStatus("Saved")
    } catch (error) {
      setStatus((error as Error).message || "Save failed")
    }
  }

  const addGoal = () => {
    const value = goalInput.trim()
    if (!value || draft.goals.includes(value)) return
    setDraft((prev) => ({ ...prev, goals: [...prev.goals, value] }))
    setGoalInput("")
  }

  const removeGoal = (goal: string) => setDraft((prev) => ({ ...prev, goals: prev.goals.filter((item) => item !== goal) }))
  const statusTone = status === "Saved" ? "text-emerald-600" : status === "Saving..." ? "text-zinc-500" : "text-red-600"

  return (
    <div className="mx-auto max-w-6xl px-6 py-10 sm:px-10">
      <div className="relative mb-8 overflow-hidden rounded-2xl border border-zinc-100 bg-white px-6 py-5 shadow-sm">
        <div
          className="pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full"
          style={{ background: "radial-gradient(circle, rgba(201,135,31,0.1) 0%, transparent 70%)" }}
        />
        <div className="relative">
          <h1 className="text-3xl font-bold text-zinc-900">Voice Profile</h1>
          <p className="mt-1 text-sm text-zinc-500">Your brand brief for Qalam. It keeps drafts, AI replies, and post angles aligned with your tone.</p>
        </div>
      </div>

      <div className="mb-6 rounded-2xl border border-zinc-200 bg-white p-6">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-zinc-900">Profile readiness</h2>
            <p className="mt-1 text-sm text-zinc-500">AI drafts use these fields to match your voice and positioning.</p>
          </div>
          <div className="text-right">
            <span className={`text-3xl font-bold ${readyCount >= 5 ? "text-teal" : readyCount >= 3 ? "text-amber-600" : "text-zinc-400"}`}>{readyCount}</span>
            <span className="text-lg text-zinc-300">/6</span>
          </div>
        </div>
        <div className="mb-4 h-2 overflow-hidden rounded-full bg-zinc-100">
          <div className={`h-full rounded-full transition-all ${readyCount >= 5 ? "bg-teal" : readyCount >= 3 ? "bg-amber-400" : "bg-zinc-300"}`} style={{ width: `${(readyCount / 6) * 100}%` }} />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {[
            { label: "Name", filled: Boolean(profile.name) },
            { label: "Title / Role", filled: Boolean(profile.title) },
            { label: "LinkedIn URL", filled: Boolean(profile.linkedinUrl) },
            { label: "Industry", filled: Boolean(profile.industry) },
            { label: "Brand tone", filled: Boolean(profile.tone) },
            { label: "Content goals", filled: profile.goals.length > 0 },
          ].map((field) => (
            <div key={field.label} className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-xs font-semibold transition-all ${field.filled ? "border-teal/20 bg-teal/5 text-teal" : "border-zinc-100 bg-zinc-50 text-zinc-400"}`}>
              <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold ${field.filled ? "bg-teal text-white" : "border border-zinc-200 bg-white text-zinc-400"}`}>{field.filled ? "✓" : ""}</span>
              {field.label}
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="rounded-2xl border border-zinc-200 bg-white p-5 sm:p-6">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-zinc-900">Voice settings</h2>
              <p className="mt-1 text-sm text-zinc-500">Set the basics once. Qalam uses them to keep output short, relevant, and on-brand.</p>
            </div>
            {!editing ? (
              <button onClick={startEdit} className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-50">Edit</button>
            ) : (
              <div className="flex items-center gap-2">
                <button onClick={() => { setEditing(false); setStatus(null); resetDraft() }} className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50">Cancel</button>
                <button onClick={save} className="rounded-lg bg-teal px-4 py-2 text-sm font-semibold text-white hover:bg-teal-600">Save</button>
              </div>
            )}
          </div>

          {status ? <p className={`mb-4 text-sm ${statusTone}`}>{status}</p> : null}
          {isLoadingProfile ? <p className="mb-4 text-sm text-zinc-500">Loading profile...</p> : null}

          {!editing ? (
            <div className="space-y-5">
              <Info label="Name" value={profile.name || "Not set"} />
              <Info label="Title / Role" value={profile.title || "Not set"} />
              <Info label="LinkedIn URL" value={profile.linkedinUrl || "Not set"} />
              <Info label="Industry" value={profile.industry || "Not set"} />
              <Info label="Tone" value={profile.tone || "Not set"} />
              <div>
                <p className="mb-1 text-xs font-medium text-zinc-500">Content goals</p>
                {profile.goals.length ? (
                  <div className="flex flex-wrap gap-2">
                    {profile.goals.map((goal) => <span key={goal} className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700">{goal}</span>)}
                  </div>
                ) : (
                  <p className="text-sm text-zinc-400">No goals set</p>
                )}
              </div>
              <div className="rounded-2xl border border-teal/20 bg-teal/5 p-4">
                <p className="text-sm font-semibold text-teal">Why this matters</p>
                <p className="mt-1 text-sm text-zinc-600">Voice memory combines these settings with your saved posts. It improves AI drafts, chat replies, and publishing suggestions over time.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <Field label="Name"><input value={draft.name} onChange={(e) => setDraft((prev) => ({ ...prev, name: e.target.value }))} className="w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm text-zinc-900 outline-none focus:border-teal focus:ring-4 focus:ring-teal/10" /></Field>
              <Field label="Title / Role"><input value={draft.title} onChange={(e) => setDraft((prev) => ({ ...prev, title: e.target.value }))} className="w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm text-zinc-900 outline-none focus:border-teal focus:ring-4 focus:ring-teal/10" /></Field>
              <Field label="LinkedIn URL"><input value={draft.linkedinUrl} onChange={(e) => setDraft((prev) => ({ ...prev, linkedinUrl: e.target.value }))} placeholder="https://www.linkedin.com/in/your-handle" className="w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm text-zinc-900 outline-none focus:border-teal focus:ring-4 focus:ring-teal/10" /></Field>
              <Field label="Industry"><input value={draft.industry} onChange={(e) => setDraft((prev) => ({ ...prev, industry: e.target.value }))} className="w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm text-zinc-900 outline-none focus:border-teal focus:ring-4 focus:ring-teal/10" /></Field>
              <Field label="Tone"><input value={draft.tone} onChange={(e) => setDraft((prev) => ({ ...prev, tone: e.target.value }))} placeholder="Direct, calm, sharp, friendly" className="w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm text-zinc-900 outline-none focus:border-teal focus:ring-4 focus:ring-teal/10" /></Field>
              <div>
                <p className="mb-1 text-xs font-medium text-zinc-500">Content goals</p>
                <div className="flex gap-2">
                  <input value={goalInput} onChange={(e) => setGoalInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addGoal())} placeholder="e.g. high engagement" className="flex-1 rounded-xl border border-zinc-200 px-4 py-3 text-sm text-zinc-900 outline-none focus:border-teal focus:ring-4 focus:ring-teal/10" />
                  <button onClick={addGoal} className="rounded-xl border border-zinc-300 px-4 py-3 text-sm font-semibold text-zinc-800 hover:bg-zinc-50">Add</button>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {draft.goals.map((goal) => <button key={goal} onClick={() => removeGoal(goal)} className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-200">{goal} - remove</button>)}
                  {!draft.goals.length ? <p className="text-sm text-zinc-400">No goals set</p> : null}
                </div>
              </div>
              <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600">Use a public LinkedIn profile link only. Qalam uses this for profile context, not for scraping.</div>
            </div>
          )}
        </section>

        <aside className="space-y-5">
          <Card title="Voice corpus">
            <Metric label="Total posts" value={posts.length} />
            <Metric label="Drafts" value={drafts.length} />
            <Metric label="Scheduled" value={scheduled.length} />
            <Metric label="Published" value={published.length} />
          </Card>
          <Card title="By type">
            <Metric label="LinkedIn - Text post" value={posts.filter((post) => post.type === "LinkedIn - Text post").length} />
            <Metric label="LinkedIn - Carousel" value={posts.filter((post) => post.type === "LinkedIn - Carousel").length} />
          </Card>
          <Card title="Most recent">
            {posts[0] ? (
              <>
                <p className="text-lg font-semibold text-zinc-900">{posts[0].title}</p>
                <p className="mt-1 text-sm text-zinc-500">{posts[0].status.replaceAll("_", " ")} - {posts[0].type}</p>
                <p className="mt-1 text-sm text-zinc-400">{posts[0].date}</p>
              </>
            ) : <p className="text-sm text-zinc-500">No posts yet.</p>}
          </Card>
        </aside>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1 block text-xs font-medium text-zinc-500">{label}</span>{children}</label>
}

function Info({ label, value }: { label: string; value: string }) {
  const isEmpty = value === "Not set" || value === "No goals set"
  return (
    <div>
      <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-zinc-400">{label}</p>
      <div className={`rounded-xl border px-4 py-3 text-sm ${isEmpty ? "border-zinc-100 bg-zinc-50 text-zinc-400 italic" : "border-zinc-200 bg-white text-zinc-900 shadow-sm"}`}>{value}</div>
    </div>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-5">
      <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-zinc-400">{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  )
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-zinc-500">{label}</span>
      <span className="text-sm font-bold text-zinc-900">{value}</span>
    </div>
  )
}
