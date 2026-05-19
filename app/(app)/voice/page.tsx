"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useWorkspace } from "@/components/providers/WorkspaceProvider"
import { useAuth } from "@/components/providers/AuthProvider"
import { withClientParam } from "@/lib/workspace-navigation"

type ProfileDraft = {
  name: string
  title: string
  linkedinUrl: string
  industry: string
  goals: string[]
  tone: string
}

export default function VoicePage() {
  const { profile, posts, drafts, scheduled, published, isLoadingProfile, saveProfile, state } = useWorkspace()
  const { user } = useAuth()
  const activeClientId = (state as { agency?: { activeClientId?: string | null } }).agency?.activeClientId || null

  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<ProfileDraft>({ ...profile })
  const [goalInput, setGoalInput] = useState("")
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle")
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    if (editing || saveStatus === "saving") return
    setDraft({ ...profile })
  }, [editing, profile, saveStatus])

  const completeness = useMemo(() => {
    const checks = [Boolean(profile.name), Boolean(profile.title), Boolean(profile.linkedinUrl), Boolean(profile.industry), Boolean(profile.tone), profile.goals.length > 0]
    return Math.round((checks.filter(Boolean).length / checks.length) * 100)
  }, [profile])

  const corpusByType = useMemo(() => {
    const map: Record<string, number> = {}
    for (const post of posts) {
      const key = post.type || "Unknown"
      map[key] = (map[key] || 0) + 1
    }
    return Object.entries(map).sort((a, b) => b[1] - a[1])
  }, [posts])

  const mostRecent = useMemo(() => posts.length === 0 ? null : [...posts].sort((a, b) => (a.updatedAt > b.updatedAt ? -1 : 1))[0], [posts])

  const startEditing = useCallback(() => {
    setDraft({ ...profile })
    setSaveStatus("idle")
    setSaveError(null)
    setEditing(true)
  }, [profile])

  const onCancel = useCallback(() => {
    setDraft({ ...profile })
    setGoalInput("")
    setSaveStatus("idle")
    setEditing(false)
  }, [profile])

  const onSave = useCallback(async () => {
    setSaveStatus("saving")
    setSaveError(null)
    try {
      await saveProfile(draft)
      setSaveStatus("saved")
      setGoalInput("")
      setEditing(false)
      setTimeout(() => setSaveStatus("idle"), 3000)
    } catch (e) {
      setSaveStatus("error")
      setSaveError((e as Error).message || "Save failed")
    }
  }, [draft, saveProfile])

  const addGoal = useCallback(() => {
    const goal = goalInput.trim()
    if (!goal) return
    setDraft((prev) => ({ ...prev, goals: [...prev.goals, goal] }))
    setGoalInput("")
  }, [goalInput])

  const removeGoal = useCallback((index: number) => {
    setDraft((prev) => ({ ...prev, goals: prev.goals.filter((_, idx) => idx !== index) }))
  }, [])

  const activeProfile = editing ? draft : profile

  return (
    <div className="mx-auto max-w-4xl px-6 py-10 font-jakarta sm:px-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-zinc-900">Voice Profile</h1>
        <p className="mt-1 text-sm text-zinc-500">Your voice memory is stored in the database and shapes AI generation.</p>
        {isLoadingProfile && <p className="mt-2 text-xs text-zinc-400 animate-pulse">Loading profile from database...</p>}
      </div>

      <section className="mb-5 rounded-2xl border border-zinc-200 bg-white p-5">
        <div className="flex items-center justify-between"><div><p className="text-sm font-semibold text-zinc-900">Profile completeness</p><p className="mt-0.5 text-xs text-zinc-500">6 fields shape the AI voice signal</p></div><span className={`text-2xl font-bold ${completeness === 100 ? "text-teal" : completeness >= 50 ? "text-amber-600" : "text-zinc-400"}`}>{completeness}%</span></div>
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-zinc-100"><div className="h-full rounded-full bg-teal transition-all duration-500" style={{ width: `${completeness}%` }} /></div>
      </section>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_300px]">
        <section className="rounded-2xl border border-zinc-200 bg-white p-5">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-900">Voice settings</h2>
            <div className="flex items-center gap-3">
              {saveStatus === "saved" && <span className="text-xs font-semibold text-emerald-600">Saved to database ?</span>}
              {saveStatus === "error" && <span className="text-xs text-red-600">{saveError}</span>}
              {!editing ? <button onClick={startEditing} className="text-xs font-semibold text-teal hover:underline">Edit</button> : <div className="flex gap-4"><button onClick={onCancel} className="text-xs text-zinc-500 hover:underline">Cancel</button><button onClick={onSave} disabled={saveStatus === "saving"} className="text-xs font-semibold text-teal hover:underline disabled:opacity-50">{saveStatus === "saving" ? "Saving..." : "Save to database"}</button></div>}
            </div>
          </div>

          <div className="space-y-4">
            {(["name", "title", "linkedinUrl", "industry", "tone"] as const).map((field) => <ProfileField key={field} label={field === "name" ? "Name" : field === "title" ? "Title / Role" : field === "linkedinUrl" ? "LinkedIn URL" : field === "industry" ? "Industry" : "Tone"} value={activeProfile[field]} editing={editing} onChange={(value) => setDraft((prev) => ({ ...prev, [field]: value }))} placeholder={field === "name" ? "Your full name" : field === "title" ? "e.g. Founder at Acme" : field === "linkedinUrl" ? "https://linkedin.com/in/yourhandle" : field === "industry" ? "e.g. SaaS, Fintech" : "e.g. Direct, conversational"} />)}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-zinc-700">Content goals</label>
              <div className="mb-2 flex min-h-8 flex-wrap gap-2">{activeProfile.goals.length > 0 ? activeProfile.goals.map((goal, idx) => <span key={idx} className="flex items-center gap-1.5 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs text-zinc-700">{goal}{editing && <button onClick={() => removeGoal(idx)} className="ml-0.5 text-zinc-400 hover:text-zinc-700" aria-label="Remove goal">x</button>}</span>) : <span className="text-xs italic text-zinc-400">No goals set</span>}</div>
              {editing && <div className="flex gap-2"><input value={goalInput} onChange={(e) => setGoalInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addGoal() } }} placeholder="Type a goal, press Enter" className="flex-1 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-teal/30" /><button onClick={addGoal} className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50">Add</button></div>}
            </div>
          </div>

          <div className="mt-5">{user?.linkedinMemberId ? <div className="rounded-xl border border-teal/20 bg-teal/5 px-4 py-3"><p className="text-xs font-semibold text-teal">LinkedIn connected</p><p className="mt-0.5 text-xs text-zinc-500">Authenticated via LinkedIn OAuth. Publishing is available.</p></div> : <div className="rounded-xl border border-zinc-100 bg-zinc-50 px-4 py-3"><p className="text-xs font-semibold text-zinc-600">LinkedIn not connected</p><p className="mt-0.5 text-xs text-zinc-500">Connect via LinkedIn to enable publishing. <Link href="/auth" className="font-semibold text-teal hover:underline">Sign in with LinkedIn</Link></p></div>}</div>
        </section>

        <div className="flex flex-col gap-4">
          <section className="rounded-2xl border border-zinc-200 bg-white p-4">
            <h2 className="mb-3 text-sm font-semibold text-zinc-900">Voice corpus</h2>
            <div className="space-y-2">{[{ label: "Total posts", value: posts.length }, { label: "Drafts", value: drafts.length }, { label: "Scheduled", value: scheduled.length }, { label: "Published", value: published.length }].map(({ label, value }) => <div key={label} className="flex items-center justify-between"><span className="text-xs text-zinc-500">{label}</span><span className="text-sm font-semibold text-zinc-900">{value}</span></div>)}</div>
            {corpusByType.length > 0 && <><div className="my-3 h-px bg-zinc-100" /><p className="mb-2 text-xs font-semibold text-zinc-500">By type</p><div className="space-y-1.5">{corpusByType.map(([type, count]) => <div key={type} className="flex items-center justify-between text-xs"><span className="truncate text-zinc-600">{type}</span><span className="ml-2 shrink-0 font-medium text-zinc-900">{count}</span></div>)}</div></>}
            {posts.length === 0 && <p className="mt-3 text-xs italic text-zinc-400">No posts yet. <Link href={withClientParam("/writer", activeClientId)} className="font-semibold text-teal hover:underline not-italic">Start writing</Link></p>}
          </section>

          {mostRecent && <section className="rounded-2xl border border-zinc-200 bg-white p-4"><h2 className="mb-2 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Most recent</h2><p className="truncate text-sm font-medium text-zinc-900">{mostRecent.title}</p><p className="mt-0.5 text-xs text-zinc-500">{mostRecent.status} · {mostRecent.type}</p><p className="mt-0.5 text-xs text-zinc-400">{mostRecent.date}</p></section>}

          <section className="rounded-2xl border border-zinc-100 bg-zinc-50 p-4"><p className="text-xs font-semibold text-zinc-500">About voice memory</p><p className="mt-1 text-xs leading-relaxed text-zinc-500">Voice memory is your profile settings and post corpus. Changes save to the database and apply immediately.</p></section>
        </div>
      </div>
    </div>
  )
}

function ProfileField({ label, value, editing, onChange, placeholder }: { label: string; value: string; editing: boolean; onChange: (v: string) => void; placeholder: string }) {
  return <div><label className="mb-1 block text-xs font-semibold text-zinc-700">{label}</label>{editing ? <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-teal/30" /> : <p className="min-h-9 rounded-lg bg-zinc-50 px-3 py-2 text-sm">{value ? <span className="text-zinc-800">{value}</span> : <span className="italic text-zinc-400">Not set</span>}</p>}</div>
}
