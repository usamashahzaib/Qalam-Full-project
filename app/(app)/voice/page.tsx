"use client"

import { useMemo, useState, useRef } from "react"
import { useWorkspace } from "@/components/providers/WorkspaceProvider"
import { LockedFeature } from "@/components/LockedFeature"

const LINKEDIN_RE = /^https:\/\/www\.linkedin\.com\/in\/[A-Za-z0-9-_%]{3,}\/?$/

export default function VoiceProfilePage() {
  const { profile, saveProfile, isLoadingProfile, posts, drafts, scheduled, published, refreshPosts } = useWorkspace()
  const [activeTab, setActiveTab] = useState<"brief" | "trainer">("brief")
  
  // Settings edit state
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

  // Voice Trainer state
  const [trainingMode, setTrainingMode] = useState<"text" | "audio">("text")
  const [textCorpus, setTextCorpus] = useState("")
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [isTraining, setIsTraining] = useState(false)
  const [trainError, setTrainError] = useState<string | null>(null)
  const [trainSuccess, setTrainSuccess] = useState<boolean>(false)
  const [trainingLog, setTrainingLog] = useState<string>("")
  const [analysisResult, setAnalysisResult] = useState<{
    tone: string
    length: string
    formatting: string
    emojis: string
    hashtags: string
  } | null>(null)
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Parse structured tone if available
  const parsedTone = useMemo(() => {
    if (!profile.tone) return null
    if (!profile.tone.includes("|")) return { raw: profile.tone }
    try {
      return profile.tone.split("|").reduce((acc, part) => {
        const [key, val] = part.split(":").map(s => s.trim())
        if (key && val) {
          acc[key.toLowerCase()] = val
        }
        return acc
      }, {} as Record<string, string>)
    } catch {
      return { raw: profile.tone }
    }
  }, [profile.tone])

  const readyCount = useMemo(
    () => [profile.name, profile.title, profile.linkedinUrl, profile.industry, profile.tone, profile.goals.length ? "goals" : ""].filter(Boolean).length,
    [profile]
  )
  
  const linkedinInvalid = Boolean(draft.linkedinUrl.trim()) && !LINKEDIN_RE.test(draft.linkedinUrl.trim())

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
      setStatus("Use a valid LinkedIn profile URL: https://www.linkedin.com/in/your-handle")
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
  
  const handleAudioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setAudioFile(e.target.files[0])
      setTrainError(null)
    }
  }

  const handleTrainVoice = async () => {
    setTrainError(null)
    setTrainSuccess(false)
    setAnalysisResult(null)
    setIsTraining(true)
    setTrainingLog("Initializing AI Voice Trainer...")

    try {
      const formData = new FormData()
      if (trainingMode === "audio") {
        if (!audioFile) {
          throw new Error("Please select an audio file to train.")
        }
        formData.append("file", audioFile)
        setTrainingLog("Uploading audio and transcribing voice sample...")
      } else {
        if (!textCorpus.trim() || textCorpus.trim().length < 15) {
          throw new Error("Please enter a text corpus of at least 15 characters to train.")
        }
        formData.append("text", textCorpus.trim())
        setTrainingLog("Analyzing brand voice text fingerprint...")
      }

      const res = await fetch("/api/voice/train", {
        method: "POST",
        body: formData,
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Failed to train voice profile.")
      }

      setTrainingLog("Finalizing brand voice parameters...")
      setAnalysisResult(data.analysis)
      setTrainSuccess(true)
      
      // Reload posts/profile data
      await refreshPosts()
      
      // Update local settings form draft to reflect new tone
      if (data.profile?.tone) {
        setDraft((prev) => ({ ...prev, tone: data.profile.tone }))
      }
    } catch (err) {
      setTrainError((err as Error).message)
    } finally {
      setIsTraining(false)
    }
  }

  const statusTone = status === "Saved" ? "text-emerald-600" : status === "Saving..." ? "text-zinc-500" : "text-red-600"

  return (
    <LockedFeature feature="Voice profile" requiredPlan="Solo">
      <div className="mx-auto max-w-6xl px-6 py-10 sm:px-10 font-jakarta">
        {/* Header Section */}
        <div className="relative mb-8 overflow-hidden rounded-3xl border border-teal/10 bg-gradient-to-br from-teal/5 to-teal-950/5 p-6 shadow-sm">
          <div
            className="pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full"
            style={{ background: "radial-gradient(circle, rgba(201,135,31,0.1) 0%, transparent 70%)" }}
          />
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900">Voice Profile</h1>
              <p className="mt-1 text-sm text-zinc-500">Lock tone, formatting, and target goals before you scale drafts.</p>
            </div>
            {/* Tabs Selector */}
            <div className="flex items-center gap-1 rounded-xl bg-zinc-100 p-1.5 self-start sm:self-center">
              <button
                onClick={() => setActiveTab("brief")}
                className={`rounded-lg px-4 py-2 text-xs font-bold transition-all ${activeTab === "brief" ? "bg-white text-teal shadow-sm" : "text-zinc-600 hover:text-zinc-900"}`}
              >
                Voice brief
              </button>
              <button
                onClick={() => setActiveTab("trainer")}
                className={`rounded-lg px-4 py-2 text-xs font-bold transition-all ${activeTab === "trainer" ? "bg-white text-teal shadow-sm" : "text-zinc-600 hover:text-zinc-900"}`}
              >
                AI Voice Trainer
              </button>
            </div>
          </div>
        </div>

        {activeTab === "brief" ? (
          <>
            {/* Readiness Summary */}
            <div className="mb-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
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
              <div className="mb-4 h-2.5 overflow-hidden rounded-full bg-zinc-100">
                <div className={`h-full rounded-full transition-all duration-500 ${readyCount >= 5 ? "bg-teal" : readyCount >= 3 ? "bg-amber-400" : "bg-zinc-300"}`} style={{ width: `${(readyCount / 6) * 100}%` }} />
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
                  <div key={field.label} className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-xs font-bold transition-all ${field.filled ? "border-teal/20 bg-teal/5 text-teal" : "border-zinc-100 bg-zinc-50 text-zinc-400"}`}>
                    <span className={`flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold ${field.filled ? "bg-teal text-white" : "border border-zinc-200 bg-white text-zinc-400"}`}>{field.filled ? "✓" : ""}</span>
                    {field.label}
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
              {/* Voice settings card */}
              <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="mb-5 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-bold text-zinc-900">Voice settings</h2>
                    <p className="mt-1 text-sm text-zinc-500">Set the basics once. Qalam uses them to keep output short, relevant, and on-brand.</p>
                  </div>
                  {!editing ? (
                    <button onClick={startEdit} className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-bold text-zinc-800 hover:bg-zinc-50 transition-colors cursor-pointer">Edit</button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button onClick={() => { setEditing(false); setStatus(null); resetDraft() }} className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-bold text-zinc-700 hover:bg-zinc-50 transition-colors cursor-pointer">Cancel</button>
                      <button onClick={save} disabled={linkedinInvalid} className="rounded-lg bg-teal px-4 py-2 text-sm font-bold text-white hover:bg-teal-600 disabled:cursor-not-allowed disabled:opacity-50 transition-colors cursor-pointer">Save</button>
                    </div>
                  )}
                </div>

                {status ? <p className={`mb-4 text-sm font-semibold ${statusTone}`}>{status}</p> : null}
                {isLoadingProfile ? <p className="mb-4 text-sm text-zinc-500">Loading profile...</p> : null}

                {!editing ? (
                  <div className="space-y-5">
                    <Info label="Name" value={profile.name || "Not set"} />
                    <Info label="Title / Role" value={profile.title || "Not set"} />
                    <Info label="LinkedIn URL" value={profile.linkedinUrl || "Not set"} />
                    <Info label="Industry" value={profile.industry || "Not set"} />
                    
                    <div>
                      <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Tone Fingerprint</p>
                      {parsedTone && !parsedTone.raw ? (
                        <div className="rounded-2xl border border-zinc-200 bg-zinc-50/30 p-4 shadow-sm space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <BadgeInfo label="Tone" value={parsedTone.tone} />
                            <BadgeInfo label="Length" value={parsedTone.length} />
                            <BadgeInfo label="Formatting" value={parsedTone.formatting} />
                            <BadgeInfo label="Emojis" value={parsedTone.emojis} />
                          </div>
                          <div className="border-t border-zinc-100 pt-3">
                            <BadgeInfo label="Hashtags" value={parsedTone.hashtags} />
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 shadow-sm">{profile.tone || "Not set"}</div>
                      )}
                    </div>

                    <div>
                      <p className="mb-1 text-xs font-bold text-zinc-500">Content goals</p>
                      {profile.goals.length ? (
                        <div className="flex flex-wrap gap-2">
                          {profile.goals.map((goal) => <span key={goal} className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-bold text-zinc-700">{goal}</span>)}
                        </div>
                      ) : (
                        <p className="text-sm text-zinc-400 italic">No goals set</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Field label="Name"><input value={draft.name} onChange={(e) => setDraft((prev) => ({ ...prev, name: e.target.value }))} className="w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm text-zinc-900 outline-none focus:border-teal focus:ring-4 focus:ring-teal/10 transition-all" /></Field>
                    <Field label="Title / Role"><input value={draft.title} onChange={(e) => setDraft((prev) => ({ ...prev, title: e.target.value }))} className="w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm text-zinc-900 outline-none focus:border-teal focus:ring-4 focus:ring-teal/10 transition-all" /></Field>
                    <Field label="LinkedIn URL">
                      <input value={draft.linkedinUrl} onChange={(e) => setDraft((prev) => ({ ...prev, linkedinUrl: e.target.value }))} placeholder="https://www.linkedin.com/in/your-handle" className={`w-full rounded-xl border px-4 py-3 text-sm text-zinc-900 outline-none focus:ring-4 ${linkedinInvalid ? "border-red-300 focus:border-red-400 focus:ring-red-100" : "border-zinc-200 focus:border-teal focus:ring-teal/10"}`} />
                      {linkedinInvalid ? <p className="mt-1.5 text-xs font-semibold text-red-600">Use https://www.linkedin.com/in/ plus at least 3 characters.</p> : null}
                    </Field>
                    <Field label="Industry"><input value={draft.industry} onChange={(e) => setDraft((prev) => ({ ...prev, industry: e.target.value }))} className="w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm text-zinc-900 outline-none focus:border-teal focus:ring-4 focus:ring-teal/10 transition-all" /></Field>
                    <Field label="Tone"><input value={draft.tone} onChange={(e) => setDraft((prev) => ({ ...prev, tone: e.target.value }))} placeholder="Direct, calm, sharp, friendly" className="w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm text-zinc-900 outline-none focus:border-teal focus:ring-4 focus:ring-teal/10 transition-all" /></Field>
                    <div>
                      <p className="mb-1 text-xs font-bold text-zinc-500">Content goals</p>
                      <div className="flex gap-2">
                        <input value={goalInput} onChange={(e) => setGoalInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addGoal())} placeholder="e.g. high engagement" className="flex-1 rounded-xl border border-zinc-200 px-4 py-3 text-sm text-zinc-900 outline-none focus:border-teal focus:ring-4 focus:ring-teal/10 transition-all" />
                        <button onClick={addGoal} className="rounded-xl border border-zinc-300 px-4 py-3 text-sm font-bold text-zinc-800 hover:bg-zinc-50 cursor-pointer">Add</button>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {draft.goals.map((goal) => (
                          <span key={goal} className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 pl-3 pr-1.5 py-1 text-xs font-bold text-zinc-700">
                            {goal}
                            <button onClick={() => removeGoal(goal)} aria-label={`Remove ${goal}`} className="flex h-4 w-4 cursor-pointer items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-300 hover:text-zinc-700">
                              <svg viewBox="0 0 12 12" fill="none" className="h-2.5 w-2.5"><path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                            </button>
                          </span>
                        ))}
                        {!draft.goals.length ? <p className="text-sm text-zinc-400 italic">No goals set</p> : null}
                      </div>
                    </div>
                  </div>
                )}
              </section>

              {/* Sidebar stats */}
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
                      <p className="text-lg font-bold text-zinc-900 truncate">{posts[0].title}</p>
                      <p className="mt-1 text-sm text-zinc-500">{posts[0].status.replaceAll("_", " ")} - {posts[0].type}</p>
                      <p className="mt-1 text-sm text-zinc-400">{posts[0].date}</p>
                    </>
                  ) : <p className="text-sm text-zinc-500 italic">No posts yet.</p>}
                </Card>
              </aside>
            </div>
          </>
        ) : (
          /* AI Voice Trainer Tab */
          <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
            <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
              <h2 className="text-xl font-extrabold text-zinc-900">AI Voice Trainer</h2>
              <p className="mt-1 text-sm text-zinc-500">Train Qalam on your style by uploading audio recordings of your speech or pasting written text.</p>

              {/* Selector */}
              <div className="my-6 flex border-b border-zinc-200">
                <button
                  onClick={() => { setTrainingMode("text"); setTrainError(null); }}
                  className={`border-b-2 px-4 py-2.5 text-sm font-bold transition-all ${trainingMode === "text" ? "border-teal text-teal" : "border-transparent text-zinc-500 hover:text-zinc-800"}`}
                >
                  Text Corpus
                </button>
                <button
                  onClick={() => { setTrainingMode("audio"); setTrainError(null); }}
                  className={`border-b-2 px-4 py-2.5 text-sm font-bold transition-all ${trainingMode === "audio" ? "border-teal text-teal" : "border-transparent text-zinc-500 hover:text-zinc-800"}`}
                >
                  Voice Memo / Audio
                </button>
              </div>

              {/* Text corpus inputs */}
              {trainingMode === "text" && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Pasted Writing Sample</label>
                    <textarea
                      value={textCorpus}
                      onChange={(e) => setTextCorpus(e.target.value)}
                      placeholder="Paste past successful LinkedIn posts, articles, or comments. The more text you provide, the better the AI can isolate your tone parameters..."
                      rows={8}
                      className="w-full rounded-2xl border border-zinc-200 px-4 py-3.5 text-sm text-zinc-900 outline-none focus:border-teal focus:ring-4 focus:ring-teal/10 transition-all font-sans"
                    />
                    <div className="mt-1.5 flex justify-between text-xs text-zinc-400">
                      <span>Min 15 characters required</span>
                      <span>{textCorpus.length} characters</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Audio inputs */}
              {trainingMode === "audio" && (
                <div className="space-y-4">
                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider">Audio Upload</label>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-zinc-200 bg-zinc-50/50 py-10 text-center hover:border-teal/50 hover:bg-zinc-50 cursor-pointer transition-all group"
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleAudioChange}
                      accept="audio/*"
                      className="hidden"
                    />
                    <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-teal/10 text-teal group-hover:scale-105 transition-transform">
                      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                      </svg>
                    </div>
                    {audioFile ? (
                      <div>
                        <p className="text-sm font-bold text-zinc-800">{audioFile.name}</p>
                        <p className="mt-1 text-xs text-zinc-400">{(audioFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-sm font-bold text-zinc-800">Select or drop audio memo</p>
                        <p className="mt-1 text-xs text-zinc-400">Supports WAV, MP3, M4A up to 25MB</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Error and log display */}
              {trainError && (
                <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-bold text-red-700">
                  {trainError}
                </div>
              )}

              {isTraining && (
                <div className="mt-5 flex items-center gap-3 rounded-2xl border border-teal/15 bg-teal/5 p-4 text-xs font-bold text-teal">
                  <svg className="h-4 w-4 animate-spin text-teal" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>{trainingLog}</span>
                </div>
              )}

              {/* CTA button */}
              <div className="mt-6 flex justify-end">
                <button
                  onClick={handleTrainVoice}
                  disabled={isTraining || (trainingMode === "audio" && !audioFile) || (trainingMode === "text" && textCorpus.trim().length < 15)}
                  className="rounded-xl bg-teal px-6 py-3 text-sm font-bold text-white hover:bg-teal-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md shadow-teal/10 cursor-pointer"
                >
                  {isTraining ? "Training brand voice..." : "Train Brand Voice"}
                </button>
              </div>
            </section>

            {/* AI Results Analysis */}
            <aside className="space-y-5">
              {trainSuccess && analysisResult ? (
                <section className="rounded-2xl border border-emerald-200 bg-emerald-50/25 p-5 shadow-sm animate-fade-in">
                  <div className="mb-4 flex items-center gap-2 text-emerald-800">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-800">✓</span>
                    <h3 className="text-sm font-bold uppercase tracking-wider">Trained Successfully</h3>
                  </div>
                  <div className="space-y-4">
                    <AnalysisRow label="Linguistic Tone" value={analysisResult.tone} />
                    <AnalysisRow label="Format Style" value={analysisResult.formatting} />
                    <AnalysisRow label="Length Fingerprint" value={analysisResult.length} />
                    <AnalysisRow label="Emoji Density" value={analysisResult.emojis} />
                    <AnalysisRow label="Hashtag Strategy" value={analysisResult.hashtags} />
                  </div>
                  <div className="mt-5 border-t border-emerald-100 pt-4">
                    <p className="text-xs leading-relaxed text-zinc-600">Your voice fingerprint has been locked to your workspace. Any drafts generated from here on will adhere strictly to these constraints.</p>
                  </div>
                </section>
              ) : (
                <section className="rounded-2xl border border-zinc-200 bg-white p-5 text-center">
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-zinc-100 text-zinc-400 mx-auto">
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-bold text-zinc-700">Awaiting Training</h3>
                  <p className="mt-2 text-xs text-zinc-400 leading-relaxed">Provide written text or audio to analyze and isolate your brand tone, emoji density, and line length.</p>
                </section>
              )}

              <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
                <h3 className="text-sm font-bold text-zinc-800 mb-2">How it works</h3>
                <p className="text-xs leading-relaxed text-zinc-500">Qalam parses your text or audio transcription to map your styling parameters. These parameters are directly injected into post generation and strategically weighted to reject responses containing generic AI slop.</p>
              </section>
            </aside>
          </div>
        )}
      </div>
    </LockedFeature>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1.5 block text-xs font-bold text-zinc-500 uppercase tracking-wider">{label}</span>{children}</label>
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

function BadgeInfo({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <p className="text-[9px] font-bold uppercase tracking-wider text-zinc-400 mb-1">{label}</p>
      <span className="inline-block rounded-xl bg-teal/5 border border-teal/15 px-3 py-1.5 text-xs font-bold text-teal">{value || "Default"}</span>
    </div>
  )
}

function AnalysisRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl bg-white border border-emerald-100/50 p-3 shadow-sm">
      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">{label}</span>
      <span className="text-sm font-bold text-zinc-800">{value}</span>
    </div>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-xs font-bold uppercase tracking-wider text-zinc-400">{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  )
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-zinc-500 font-medium">{label}</span>
      <span className="text-sm font-bold text-zinc-900">{value}</span>
    </div>
  )
}
