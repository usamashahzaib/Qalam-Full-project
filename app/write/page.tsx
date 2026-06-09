"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import ChatPanel from "@/components/chat-panel"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type GeneratedPost = {
  id?: string | null
  content: string
  hook: string
  body: string
  cta: string
  hashtags?: string[]
  role: string
}

type Score = { total_score: number; feedback?: string }

type HistoryItem = {
  id: string
  hook?: string
  content?: string
  role?: string
  created_at?: string
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ROLES = [
  ["ai_engineer", "AI Engineer"],
  ["ceo", "CEO"],
  ["hr", "HR"],
  ["sales", "Sales"],
  ["designer", "Designer"],
  ["consultant", "Consultant"],
  ["founder", "Founder"],
  ["developer", "Developer"],
] as const

const FORMATS = ["short", "medium", "long"] as const

function scoreChip(s: number) {
  if (s >= 80) return "bg-emerald-100 text-emerald-700"
  if (s >= 60) return "bg-amber-100 text-amber-700"
  return "bg-red-100 text-red-700"
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function WritePage() {
  // Core state (as specified)
  const [topic, setTopic] = useState("")
  const [role, setRole] = useState("ai_engineer")
  const [format, setFormat] = useState<"short" | "medium" | "long">("medium")
  const [goal, setGoal] = useState("")
  const [post, setPost] = useState<GeneratedPost | null>(null)
  const [hooks, setHooks] = useState<Array<{ hook: string; style: string }>>([])
  const [selectedHook, setSelectedHook] = useState("")
  const [usage, setUsage] = useState({ current: 0, limit: 0, remaining: 0, plan: "free" })
  const [isGenerating, setIsGenerating] = useState(false)
  const [isImproving, setIsImproving] = useState(false)
  const [activeTab, setActiveTab] = useState<"write" | "chat" | "history">("write")

  // Supporting state
  const [score, setScore] = useState<Score | null>(null)
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const [toast, setToast] = useState<{ text: string; error: boolean } | null>(null)
  // Ref so keyboard handler never captures stale closures
  const fnRef = useRef<{ generate: () => void; save: () => void }>({ generate: () => {}, save: () => {} })

  // ---------------------------------------------------------------------------
  // Toast
  // ---------------------------------------------------------------------------

  const showToast = useCallback((text: string, error = false) => {
    setToast({ text, error })
    setTimeout(() => setToast(null), 3000)
  }, [])

  // ---------------------------------------------------------------------------
  // On mount
  // ---------------------------------------------------------------------------

  useEffect(() => {
    fetch("/api/generate")
      .then((r) => r.json())
      .then((d) => {
        if (d.current !== undefined) {
          setUsage({ current: d.current, limit: d.limit, remaining: d.remaining, plan: d.plan ?? "free" })
        }
      })
      .catch(() => {})

    fetch("/api/voice/train").catch(() => {})
  }, [])

  // Fetch history when tab opens
  useEffect(() => {
    if (activeTab !== "history") return
    setIsLoadingHistory(true)
    fetch("/api/posts")
      .then((r) => r.json())
      .then((d) => setHistory(d.posts || []))
      .catch(() => showToast("Could not load history", true))
      .finally(() => setIsLoadingHistory(false))
  }, [activeTab, showToast])

  // ---------------------------------------------------------------------------
  // Generate
  // ---------------------------------------------------------------------------

  const generatePost = useCallback(
    async (hookOverride?: string, improve = false) => {
      if (topic.trim().length < 3) {
        showToast("Topic must be at least 3 characters", true)
        return
      }
      improve ? setIsImproving(true) : setIsGenerating(true)
      try {
        const usedHook = hookOverride ?? selectedHook
        const res = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            topic: usedHook ? `${topic}\nUse this hook: ${usedHook}` : topic,
            role,
            format,
            goal,
            qualityCheck: improve || usage.plan !== "free",
          }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.error || "Generation failed")
        setPost(data.post)
        setHooks(data.hooks || [])
        setScore(data.score || null)
        if (data.usage?.remaining !== undefined) {
          setUsage((prev) => ({ ...prev, remaining: data.usage.remaining }))
        }
        showToast(improve ? "Post improved!" : "Post generated!")
      } catch (err) {
        showToast((err as Error).message, true)
      } finally {
        setIsGenerating(false)
        setIsImproving(false)
      }
    },
    [topic, role, format, goal, selectedHook, usage.plan, showToast]
  )

  const saveToLibrary = useCallback(async () => {
    if (!post?.id) {
      showToast("No post to save", true)
      return
    }
    const res = await fetch("/api/generate", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: post.id, confirmOnly: true }),
    })
    showToast(res.ok ? "Saved to library" : "Save failed", !res.ok)
  }, [post, showToast])

  const copyPost = useCallback(async () => {
    if (!post?.content) return
    await navigator.clipboard.writeText(post.content)
    showToast("Copied!")
  }, [post, showToast])

  // Keep ref fresh every render to avoid stale closures in keyboard handler
  useEffect(() => {
    fnRef.current = {
      generate: () => void generatePost(),
      save: () => void saveToLibrary(),
    }
  })

  // ---------------------------------------------------------------------------
  // Keyboard shortcuts (Ctrl/Cmd+Enter, Ctrl/Cmd+S)
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault()
        fnRef.current.generate()
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault()
        fnRef.current.save()
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [])

  // ---------------------------------------------------------------------------
  // Chat - post update callback for ChatPanel
  // ---------------------------------------------------------------------------

  const handleUpdate = useCallback(
    (newContent: string) => {
      setPost((prev) =>
        prev
          ? { ...prev, content: newContent, body: newContent }
          : {
              content: newContent,
              hook: newContent.split("\n")[0] || "",
              body: newContent,
              cta: "",
              role,
            }
      )
      setActiveTab("write")
      showToast("Post updated from chat")
    },
    [role, showToast]
  )

  // ---------------------------------------------------------------------------
  // Derived values
  // ---------------------------------------------------------------------------

  const draftsLow = usage.plan === "free" && usage.remaining > 0 && usage.remaining < 3
  const isPaidUser = usage.plan !== "free"

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-6 text-zinc-950 sm:px-6 lg:px-8">
      {/* Toast notification */}
      {toast && (
        <div
          className={`fixed right-4 top-4 z-50 rounded-xl px-5 py-3 text-sm font-semibold shadow-lg transition-all ${
            toast.error ? "bg-red-600 text-white" : "bg-zinc-900 text-white"
          }`}
        >
          {toast.text}
        </div>
      )}

      <div className="mx-auto max-w-7xl space-y-5">
        {/* ----------------------------------------------------------------- */}
        {/* Header                                                             */}
        {/* ----------------------------------------------------------------- */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-teal">Qalam Writer</p>
            <h1 className="text-3xl font-black tracking-tight">Write a sharper LinkedIn post</h1>
            <p className="mt-1 text-xs text-zinc-400">Ctrl+Enter to generate · Ctrl+S to save</p>
          </div>
          <div className="flex rounded-xl border border-zinc-200 bg-white p-1 shadow-sm">
            {(["write", "chat", "history"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`rounded-lg px-4 py-2 text-sm font-bold capitalize transition-colors ${
                  activeTab === tab ? "bg-zinc-950 text-white" : "text-zinc-500 hover:text-zinc-900"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Draft warning */}
        {draftsLow && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-800">
            Almost out of drafts - {usage.remaining} remaining.{" "}
            <a href="/pricing" className="underline hover:text-red-900">
              Upgrade to Pro for PKR 1,899/mo.
            </a>
          </div>
        )}

        {/* ----------------------------------------------------------------- */}
        {/* Write tab                                                          */}
        {/* ----------------------------------------------------------------- */}
        {activeTab === "write" && (
          <div className="space-y-5">
            {/* Hook cards - TOP, full width, shown after first generation */}
            {hooks.length > 0 && (
              <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h2 className="font-black text-zinc-900">Hook options</h2>
                  <button
                    onClick={() => void generatePost()}
                    disabled={isGenerating}
                    className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-bold hover:bg-zinc-50 disabled:opacity-50"
                  >
                    {isGenerating ? "Fetching..." : "Generate new hooks"}
                  </button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {hooks.map((h, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setSelectedHook(h.hook)
                        void generatePost(h.hook)
                      }}
                      disabled={isGenerating}
                      className={`rounded-xl border p-4 text-left transition-colors hover:bg-zinc-50 disabled:opacity-50 ${
                        selectedHook === h.hook ? "border-teal bg-teal/5" : "border-zinc-200"
                      }`}
                    >
                      <span className="inline-block rounded-full bg-teal/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-teal">
                        {h.style}
                      </span>
                      <p className="mt-2.5 text-sm font-semibold leading-relaxed text-zinc-800">{h.hook}</p>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* Two-column: form left, output right */}
            <div className="grid gap-5 lg:grid-cols-[390px_minmax(0,1fr)]">
              {/* ----------------------------------------------------------- */}
              {/* Input form                                                   */}
              {/* ----------------------------------------------------------- */}
              <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
                <div className="space-y-4">
                  {/* Topic */}
                  <label className="block">
                    <span className="text-xs font-bold uppercase tracking-wide text-zinc-400">Topic</span>
                    <textarea
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      rows={5}
                      placeholder="What should this post be about?"
                      className="mt-2 w-full resize-none rounded-xl border border-zinc-200 px-4 py-3 text-base font-semibold outline-none transition-colors focus:border-teal"
                    />
                  </label>

                  {/* Role */}
                  <label className="block">
                    <span className="text-xs font-bold uppercase tracking-wide text-zinc-400">Role</span>
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      className="mt-2 w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm font-semibold outline-none transition-colors focus:border-teal"
                    >
                      {ROLES.map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>

                  {/* Format toggle */}
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wide text-zinc-400">Format</span>
                    <div className="mt-2 grid grid-cols-3 gap-2">
                      {FORMATS.map((f) => (
                        <button
                          key={f}
                          onClick={() => setFormat(f)}
                          className={`rounded-xl border py-2 text-sm font-bold capitalize transition-colors ${
                            format === f
                              ? "border-zinc-950 bg-zinc-950 text-white"
                              : "border-zinc-200 bg-white hover:bg-zinc-50"
                          }`}
                        >
                          {f}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Goal */}
                  <label className="block">
                    <span className="text-xs font-bold uppercase tracking-wide text-zinc-400">
                      Goal{" "}
                      <span className="font-normal normal-case text-zinc-300">(optional)</span>
                    </span>
                    <input
                      value={goal}
                      onChange={(e) => setGoal(e.target.value)}
                      placeholder="e.g. Get DMs from founders"
                      className="mt-2 w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm outline-none transition-colors focus:border-teal"
                    />
                  </label>

                  {/* Draft counter */}
                  <div className="flex items-center justify-between rounded-xl bg-zinc-50 px-4 py-3">
                    <span className="text-xs font-semibold text-zinc-500">
                      {usage.limit > 0
                        ? `${usage.current} of ${usage.limit} drafts used`
                        : "Loading usage..."}
                    </span>
                    {usage.limit > 0 && (
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-black ${
                          usage.remaining <= 2
                            ? "bg-red-100 text-red-600"
                            : "bg-teal/10 text-teal"
                        }`}
                      >
                        {usage.remaining} left
                      </span>
                    )}
                  </div>

                  {/* Primary generate button */}
                  <button
                    onClick={() => void generatePost()}
                    disabled={isGenerating || topic.trim().length < 3}
                    className="w-full rounded-xl bg-teal py-3 text-sm font-black text-white transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isGenerating ? "Generating..." : "Generate Post"}
                  </button>

                  {/* Generate Hooks button (shown before first generation) */}
                  {hooks.length === 0 && !isGenerating && topic.trim().length >= 3 && (
                    <button
                      onClick={() => void generatePost()}
                      className="w-full rounded-xl border border-zinc-200 py-2.5 text-sm font-bold transition-colors hover:bg-zinc-50"
                    >
                      Generate Hooks
                    </button>
                  )}
                </div>
              </section>

              {/* ----------------------------------------------------------- */}
              {/* Generated post output                                        */}
              {/* ----------------------------------------------------------- */}
              <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
                {!post ? (
                  <div className="flex min-h-[420px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-zinc-200 text-center">
                    <p className="text-sm font-semibold text-zinc-400">Your generated post will appear here.</p>
                    <p className="text-xs text-zinc-300">Ctrl+Enter to generate</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Hook - distinct box */}
                    <article className="rounded-xl border-l-4 border-teal bg-teal/5 px-4 py-3">
                      <p className="text-[10px] font-black uppercase tracking-widest text-teal">Hook</p>
                      <p className="mt-2 text-sm font-bold leading-relaxed">{post.hook}</p>
                    </article>

                    {/* Body */}
                    <article className="rounded-xl border border-zinc-200 px-4 py-3">
                      <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Body</p>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-zinc-700">{post.body}</p>
                    </article>

                    {/* CTA */}
                    <article className="rounded-xl border border-zinc-200 px-4 py-3">
                      <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">CTA</p>
                      <p className="mt-2 text-sm font-semibold leading-relaxed">{post.cta}</p>
                    </article>

                    {/* Hashtags */}
                    {(post.hashtags?.length ?? 0) > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {post.hashtags!.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-bold text-zinc-600"
                          >
                            #{tag.replace(/^#/, "")}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Quality score badge */}
                    {score && (
                      <div
                        className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold ${scoreChip(score.total_score)}`}
                      >
                        <span className="font-black">{score.total_score}/100</span>
                        {score.feedback && (
                          <span className="font-normal text-inherit/70">{score.feedback}</span>
                        )}
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex flex-wrap gap-2 pt-1">
                      {isPaidUser && (
                        <button
                          onClick={() => void generatePost(selectedHook, true)}
                          disabled={isImproving}
                          className="rounded-lg bg-zinc-950 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-zinc-700 disabled:opacity-40"
                        >
                          {isImproving ? "Improving..." : "Push to 90+"}
                        </button>
                      )}
                      <button
                        onClick={() => void copyPost()}
                        className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-bold transition-colors hover:bg-zinc-50"
                      >
                        Copy
                      </button>
                      <button
                        onClick={() => void saveToLibrary()}
                        className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-bold transition-colors hover:bg-zinc-50"
                      >
                        Save to Library
                      </button>
                    </div>

                    {/* Upgrade nudge for free users */}
                    {!isPaidUser && (
                      <p className="text-xs text-zinc-400">
                        Push to 90+ is available on{" "}
                        <a href="/pricing" className="font-semibold text-teal underline">
                          Solo and Pro plans
                        </a>
                        .
                      </p>
                    )}
                  </div>
                )}
              </section>
            </div>
          </div>
        )}

        {/* ----------------------------------------------------------------- */}
        {/* Chat tab                                                           */}
        {/* ----------------------------------------------------------------- */}
        {activeTab === "chat" && (
          <ChatPanel initialTopic={topic} onUpdatePost={handleUpdate} />
        )}

        {/* ----------------------------------------------------------------- */}
        {/* History tab                                                        */}
        {/* ----------------------------------------------------------------- */}
        {activeTab === "history" && (
          <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 font-black">Post History</h2>

            {isLoadingHistory ? (
              <p className="py-8 text-center text-sm text-zinc-400">Loading...</p>
            ) : history.length === 0 ? (
              <div className="rounded-xl border border-dashed border-zinc-200 py-12 text-center text-sm text-zinc-400">
                No posts yet. Generate your first post in the Write tab.
              </div>
            ) : (
              <div className="grid gap-3">
                {history.map((item) => {
                  const title = item.hook || (item.content || "").split("\n")[0] || "Untitled"
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setPost({
                          id: item.id,
                          content: item.content || "",
                          hook: item.hook || title,
                          body: item.content || "",
                          cta: "",
                          role: item.role || role,
                        })
                        setTopic(title.slice(0, 200))
                        if (item.role) setRole(item.role)
                        setActiveTab("write")
                      }}
                      className="rounded-xl border border-zinc-200 p-4 text-left transition-colors hover:bg-zinc-50"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p className="line-clamp-1 flex-1 text-sm font-bold text-zinc-900">{title}</p>
                        {item.role && (
                          <span className="shrink-0 rounded-full bg-zinc-100 px-2.5 py-0.5 text-[11px] font-bold text-zinc-500">
                            {item.role}
                          </span>
                        )}
                      </div>
                      {item.created_at && (
                        <p className="mt-1.5 text-xs text-zinc-400">
                          {new Date(item.created_at).toLocaleDateString("en-PK", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </p>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  )
}
