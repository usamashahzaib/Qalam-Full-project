"use client"

import { useCallback, useEffect, useMemo, useState } from "react"

const ROLES = [
  ["founder", "Founder"],
  ["ceo", "CEO"],
  ["ai_engineer", "AI Engineer"],
  ["hr", "HR"],
  ["sales", "Sales"],
  ["designer", "Designer"],
  ["consultant", "Consultant"],
] as const
const FORMATS = ["short", "medium", "long"] as const

type Score = {
  total_score: number
  hook_score: number
  authenticity_score: number
  specificity_score: number
  engagement_score: number
  formatting_score: number
  feedback: string
  is_good_enough: boolean
}
type Generated = {
  id?: string
  content: string
  hook: string
  body: string
  cta: string
  hashtags: string[]
  score: Score | null
  role: string
  saved: boolean
}
type Usage = { current: number; limit: number | "unlimited"; remaining: number | "unlimited"; plan?: string }

const splitPost = (content: string) => {
  const parts = content.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean)
  return {
    hook: parts[0] || "",
    cta: parts.length > 1 ? parts[parts.length - 1] : "",
    body: parts.slice(1, -1).join("\n\n") || parts.slice(1).join("\n\n"),
  }
}

export default function WritePage() {
  const [topic, setTopic] = useState("")
  const [role, setRole] = useState("founder")
  const [format, setFormat] = useState<(typeof FORMATS)[number]>("medium")
  const [goal, setGoal] = useState("")
  const [post, setPost] = useState<Generated | null>(null)
  const [usage, setUsage] = useState<Usage | null>(null)
  const [editedContent, setEditedContent] = useState("")
  const [isEditing, setIsEditing] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [status, setStatus] = useState("")

  const displayed = useMemo(() => {
    if (!post) return { hook: "", body: "", cta: "" }
    return {
      hook: post.hook || splitPost(post.content).hook,
      body: post.body || splitPost(post.content).body,
      cta: post.cta || splitPost(post.content).cta,
    }
  }, [post])

  const loadUsage = useCallback(async () => {
    const res = await fetch("/api/generate", { method: "GET" })
    const data = await res.json().catch(() => ({}))
    if (res.ok && data.usage) setUsage(data.usage)
  }, [])

  useEffect(() => {
    void loadUsage()
  }, [loadUsage])

  const generate = async (nextTopic = topic) => {
    setIsGenerating(true)
    setStatus("Generating... Estimated time: 15-30 seconds.")
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: nextTopic, role, format, goal, qualityCheck: true }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Generation failed")
      setPost(data.post)
      setEditedContent(data.post?.content || "")
      if (data.usage) setUsage(data.usage)
      setIsEditing(false)
      setStatus(data.post?.saved ? "Saved to library." : "Generated. Save failed server-side.")
    } catch (error) {
      setStatus((error as Error).message)
    } finally {
      setIsGenerating(false)
    }
  }

  const confirmSaved = async () => {
    if (!post?.id) return setStatus("No saved post id returned.")
    setIsSaving(true)
    try {
      const res = await fetch("/api/generate", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: post.id, confirmOnly: true }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Save confirmation failed")
      setStatus("Library save confirmed.")
    } catch (error) {
      setStatus((error as Error).message)
    } finally {
      setIsSaving(false)
    }
  }

  const openEditor = async () => {
    if (!post?.id) return
    setIsSaving(true)
    try {
      const res = await fetch("/api/generate", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: post.id, confirmOnly: true }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Could not load editor")
      setEditedContent(String(data.post?.content || post.content))
      setIsEditing(true)
      setStatus("Editor loaded.")
    } catch (error) {
      setStatus((error as Error).message)
    } finally {
      setIsSaving(false)
    }
  }

  const saveEdit = async () => {
    if (!post?.id) return
    setIsSaving(true)
    try {
      const res = await fetch("/api/generate", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: post.id, content: editedContent }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Update failed")
      const parts = splitPost(editedContent)
      setPost({ ...post, content: editedContent, hook: parts.hook, body: parts.body, cta: parts.cta, saved: true })
      setIsEditing(false)
      setStatus("Edited post saved.")
    } catch (error) {
      setStatus((error as Error).message)
    } finally {
      setIsSaving(false)
    }
  }

  const draftsLeft = usage ? usage.remaining === "unlimited" ? "Unlimited drafts left this month" : `${usage.remaining} drafts left this month` : "Loading draft limit..."

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-6 text-zinc-950 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-6xl gap-5 lg:grid-cols-[380px_minmax(0,1fr)]">
        <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-zinc-100 pb-4">
            <div>
              <h1 className="text-xl font-bold">AI Writer</h1>
              <p className="mt-1 text-sm text-zinc-500">{draftsLeft}</p>
            </div>
            <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-600">{usage?.plan || "plan"}</span>
          </div>

          <div className="mt-5 space-y-4">
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wide text-zinc-500">Topic</span>
              <textarea value={topic} onChange={(e) => setTopic(e.target.value)} rows={4} className="mt-1 w-full resize-none rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-teal" />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-wide text-zinc-500">Role</span>
                <select value={role} onChange={(e) => setRole(e.target.value)} className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-teal">
                  {ROLES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-wide text-zinc-500">Format</span>
                <select value={format} onChange={(e) => setFormat(e.target.value as typeof format)} className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-teal">
                  {FORMATS.map((value) => <option key={value} value={value}>{value}</option>)}
                </select>
              </label>
            </div>
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wide text-zinc-500">Goal</span>
              <input value={goal} onChange={(e) => setGoal(e.target.value)} className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-teal" />
            </label>
            <button onClick={() => generate()} disabled={isGenerating || topic.trim().length < 3} className="w-full rounded-lg bg-zinc-950 px-4 py-3 text-sm font-bold text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50">
              {isGenerating ? "Generating..." : "Generate"}
            </button>
          </div>

          {status ? <p className="mt-4 rounded-lg bg-zinc-100 px-3 py-2 text-sm text-zinc-700">{status}</p> : null}
        </section>

        <section className="min-h-[640px] rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
          {!post ? (
            <div className="flex h-full min-h-[520px] items-center justify-center border border-dashed border-zinc-200">
              <p className="text-sm text-zinc-400">Generated post appears here.</p>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 pb-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-zinc-400">Draft</p>
                  <h2 className="mt-1 text-lg font-bold">{topic || "Generated post"}</h2>
                </div>
                {post.score ? (
                  <div className="rounded-lg border border-zinc-200 px-4 py-2 text-right">
                    <p className="text-xs font-semibold text-zinc-500">Quality score</p>
                    <p className="text-2xl font-bold text-teal">{post.score.total_score}/100</p>
                  </div>
                ) : null}
              </div>

              <div className="grid gap-4">
                <article className="rounded-lg border border-zinc-200 p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-zinc-400">Hook</p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6">{displayed.hook}</p>
                </article>
                <article className="rounded-lg border border-zinc-200 p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-zinc-400">Body</p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6">{displayed.body}</p>
                </article>
                <article className="rounded-lg border border-zinc-200 p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-zinc-400">CTA</p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6">{displayed.cta}</p>
                </article>
              </div>

              {post.score ? (
                <div className="grid gap-3 sm:grid-cols-5">
                  {[
                    ["Hook", post.score.hook_score],
                    ["Voice", post.score.authenticity_score],
                    ["Specificity", post.score.specificity_score],
                    ["Engagement", post.score.engagement_score],
                    ["Format", post.score.formatting_score],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-lg bg-zinc-50 px-3 py-2">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-400">{label}</p>
                      <p className="mt-1 text-lg font-bold">{value}</p>
                    </div>
                  ))}
                </div>
              ) : null}

              {isEditing ? (
                <div className="rounded-lg border border-zinc-200 p-4">
                  <textarea value={editedContent} onChange={(e) => setEditedContent(e.target.value)} rows={12} className="w-full resize-y rounded-lg border border-zinc-200 px-3 py-2 text-sm leading-6 outline-none focus:border-teal" />
                  <div className="mt-3 flex justify-end gap-2">
                    <button onClick={saveEdit} disabled={isSaving} className="rounded-lg bg-teal px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{isSaving ? "Saving..." : "Save edit"}</button>
                  </div>
                </div>
              ) : null}

              <div className="flex flex-wrap gap-2">
                <button onClick={confirmSaved} disabled={isSaving || !post.id} className="rounded-lg bg-teal px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{isSaving ? "Checking..." : "Save to Library"}</button>
                <button onClick={() => generate(topic)} disabled={isGenerating} className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-semibold hover:bg-zinc-50 disabled:opacity-50">Regenerate</button>
                <button onClick={openEditor} disabled={isSaving || !post.id} className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-semibold hover:bg-zinc-50 disabled:opacity-50">Edit</button>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
