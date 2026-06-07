"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { ChatPanel, type ChatConversation } from "@/components/chat-panel"

type Format = "short" | "medium" | "long"
type Tab = "write" | "chat" | "history"
type GeneratedPost = {
  id?: string | null
  content: string
  hook: string
  body: string
  cta: string
  hashtags?: string[]
  role: string
}
type HookOption = { hook: string; style: string }
type Usage = { current: number; limit: number; remaining: number; plan: string }
type Score = { total_score: number; feedback?: string }
type HistoryPost = GeneratedPost & { createdAt: string; score?: Score | null }

const roles = [
  ["ai_engineer", "AI Engineer", "ML"],
  ["ceo", "CEO", "CEO"],
  ["hr", "HR", "HR"],
  ["sales", "Sales", "SLS"],
  ["designer", "Designer", "UX"],
  ["consultant", "Consultant", "CON"],
  ["founder", "Founder", "FND"],
  ["developer", "Developer", "DEV"],
] as const

const formats: Format[] = ["short", "medium", "long"]
const historyKey = "qalam-write-history"
const toast = {
  success: (message: string) => console.info(message),
  error: (message: string) => console.error(message),
}

export default function WritePage() {
  const [topic, setTopic] = useState("")
  const [role, setRole] = useState("founder")
  const [format, setFormat] = useState<Format>("medium")
  const [goal, setGoal] = useState("")
  const [post, setPost] = useState<GeneratedPost | null>(null)
  const [hooks, setHooks] = useState<HookOption[]>([])
  const [selectedHook, setSelectedHook] = useState("")
  const [usage, setUsage] = useState<Usage | null>(null)
  const [score, setScore] = useState<Score | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isImproving, setIsImproving] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>("write")
  const [hookCards, setHookCards] = useState(true)
  const [history, setHistory] = useState<HistoryPost[]>([])
  const [historyRole, setHistoryRole] = useState("all")
  const [conversationName, setConversationName] = useState("New conversation")
  const [conversations, setConversations] = useState<ChatConversation[]>([])

  const loadUsage = useCallback(async () => {
    const res = await fetch("/api/generate")
    const data = await res.json().catch(() => ({}))
    if (res.ok) setUsage({ current: data.current, limit: data.limit, remaining: data.remaining, plan: data.plan })
  }, [])

  useEffect(() => {
    loadUsage().catch(() => toast.error("Could not load usage"))
    fetch("/api/voice-profile").catch(() => undefined)
    try {
      setHistory(JSON.parse(localStorage.getItem(historyKey) || "[]"))
    } catch {
      setHistory([])
    }
  }, [loadUsage])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
        event.preventDefault()
        generatePost()
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault()
        saveToLibrary()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  })

  useEffect(() => {
    if (topic.trim()) setConversationName(topic.trim().slice(0, 30))
  }, [topic])

  const saveHistory = (nextPost: GeneratedPost, nextScore?: Score | null) => {
    const item = { ...nextPost, createdAt: new Date().toISOString(), score: nextScore }
    const next = [item, ...history.filter((post) => post.id !== nextPost.id)].slice(0, 50)
    setHistory(next)
    localStorage.setItem(historyKey, JSON.stringify(next))
  }

  const generatePost = async (hook = selectedHook, improve = false) => {
    if (topic.trim().length < 3) return toast.error("Topic must be at least 3 characters")
    improve ? setIsImproving(true) : setIsGenerating(true)
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: hook ? `${topic}\nUse this hook: ${hook}` : topic,
          role,
          format,
          goal,
          qualityCheck: improve || usage?.plan !== "free",
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Generation failed")
      setPost(data.post)
      setHooks(data.hooks || [])
      setScore(data.score || null)
      if (data.usage) setUsage(data.usage)
      saveHistory(data.post, data.score)
      setActiveTab("write")
      toast.success("Post generated")
    } catch (error) {
      toast.error((error as Error).message)
    } finally {
      setIsGenerating(false)
      setIsImproving(false)
    }
  }

  const saveToLibrary = async () => {
    if (!post?.id) return toast.error("No saved post id")
    const res = await fetch("/api/generate", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: post.id, confirmOnly: true }),
    })
    toast[res.ok ? "success" : "error"](res.ok ? "Saved to library" : "Save failed")
  }

  const copyPost = async () => {
    if (!post?.content) return
    await navigator.clipboard.writeText(post.content)
    toast.success("Copied")
  }

  const filteredHistory = useMemo(
    () => history.filter((item) => historyRole === "all" || item.role === historyRole),
    [history, historyRole]
  )

  const draftsLow = usage?.plan === "free" && usage.remaining < 3

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-6 text-zinc-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-teal">Qalam Writer</p>
            <h1 className="text-3xl font-black tracking-tight">Write a sharper LinkedIn post</h1>
          </div>
          <div className="flex rounded-xl border border-zinc-200 bg-white p-1">
            {(["write", "chat", "history"] as Tab[]).map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`rounded-lg px-4 py-2 text-sm font-bold capitalize ${activeTab === tab ? "bg-zinc-950 text-white" : "text-zinc-500 hover:text-zinc-950"}`}>
                {tab}
              </button>
            ))}
          </div>
        </div>

        {draftsLow ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-semibold text-amber-900">
            Only {usage.remaining} drafts left. <a href="/pricing" className="underline">Upgrade to Pro</a>
          </div>
        ) : null}

        {activeTab === "chat" ? (
          <ChatPanel
            topic={topic}
            conversationName={conversationName}
            conversations={conversations}
            onConversationsChange={setConversations}
          />
        ) : null}

        {activeTab === "history" ? (
          <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-lg font-black">History</h2>
              <select value={historyRole} onChange={(event) => setHistoryRole(event.target.value)} className="rounded-lg border border-zinc-200 px-3 py-2 text-sm">
                <option value="all">All roles</option>
                {roles.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </div>
            <div className="grid gap-3">
              {filteredHistory.map((item) => (
                <button key={`${item.id}-${item.createdAt}`} onClick={() => { setPost(item); setScore(item.score || null); setActiveTab("write") }} className="rounded-xl border border-zinc-200 p-4 text-left hover:bg-zinc-50">
                  <div className="flex items-center justify-between gap-3">
                    <p className="line-clamp-1 font-bold">{item.hook || item.content}</p>
                    <span className="rounded-full bg-zinc-100 px-2 py-1 text-xs font-bold">{item.role}</span>
                  </div>
                  <p className="mt-2 text-xs text-zinc-500">{new Date(item.createdAt).toLocaleString()}</p>
                </button>
              ))}
              {!filteredHistory.length ? <p className="rounded-xl border border-dashed border-zinc-200 p-8 text-center text-sm text-zinc-400">No posts yet.</p> : null}
            </div>
          </section>
        ) : null}

        {activeTab === "write" ? (
          <div className="grid gap-5 lg:grid-cols-[390px_minmax(0,1fr)]">
            <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
              <div className="space-y-4">
                <label className="block">
                  <span className="text-xs font-bold uppercase tracking-wide text-zinc-500">Topic</span>
                  <textarea value={topic} onChange={(event) => setTopic(event.target.value)} rows={5} placeholder="What should this post be about?" className="mt-2 w-full resize-none rounded-xl border border-zinc-200 px-4 py-3 text-base font-semibold outline-none focus:border-teal" />
                </label>
                <label className="block">
                  <span className="text-xs font-bold uppercase tracking-wide text-zinc-500">Role</span>
                  <select value={role} onChange={(event) => setRole(event.target.value)} className="mt-2 w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm font-semibold outline-none focus:border-teal">
                    {roles.map(([value, label, icon]) => <option key={value} value={value}>{icon} - {label}</option>)}
                  </select>
                </label>
                <div>
                  <span className="text-xs font-bold uppercase tracking-wide text-zinc-500">Format</span>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {formats.map((item) => (
                      <button key={item} onClick={() => setFormat(item)} className={`rounded-xl border px-3 py-2 text-sm font-bold capitalize ${format === item ? "border-zinc-950 bg-zinc-950 text-white" : "border-zinc-200 bg-white"}`}>
                        {item}
                      </button>
                    ))}
                  </div>
                </div>
                <label className="block">
                  <span className="text-xs font-bold uppercase tracking-wide text-zinc-500">Goal</span>
                  <input value={goal} onChange={(event) => setGoal(event.target.value)} placeholder="Optional context" className="mt-2 w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-teal" />
                </label>
                <div className="rounded-xl bg-zinc-50 px-4 py-3 text-xs font-bold text-zinc-600">
                  {usage ? `${usage.current} of ${usage.limit} drafts used - ${usage.remaining} remaining` : "Loading usage"}
                </div>
                <button onClick={() => generatePost()} disabled={isGenerating} className="w-full rounded-xl bg-teal px-4 py-3 text-sm font-black text-white hover:bg-teal-700 disabled:opacity-50">
                  {isGenerating ? "Generating..." : "Generate Post"}
                </button>
              </div>
            </section>

            <section className="space-y-5">
              {hookCards ? (
                <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <h2 className="font-black">Hook options</h2>
                    <div className="flex gap-2">
                      <button onClick={() => generatePost()} disabled={isGenerating} className="rounded-lg border border-zinc-200 px-3 py-2 text-xs font-bold hover:bg-zinc-50">Generate new hooks</button>
                      <button onClick={() => setHookCards(false)} className="rounded-lg border border-zinc-200 px-3 py-2 text-xs font-bold hover:bg-zinc-50">Hide</button>
                    </div>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    {hooks.length ? hooks.map((item) => (
                      <button key={item.hook} onClick={() => { setSelectedHook(item.hook); generatePost(item.hook) }} className={`rounded-xl border p-4 text-left hover:bg-zinc-50 ${selectedHook === item.hook ? "border-teal" : "border-zinc-200"}`}>
                        <span className="rounded-full bg-teal/10 px-2 py-1 text-[10px] font-black uppercase text-teal">{item.style}</span>
                        <p className="mt-3 text-sm font-bold leading-6">{item.hook}</p>
                      </button>
                    )) : <p className="rounded-xl border border-dashed border-zinc-200 p-6 text-sm text-zinc-400 md:col-span-2">Hooks appear after generation.</p>}
                  </div>
                </div>
              ) : null}

              <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
                {!post ? (
                  <div className="flex min-h-[380px] items-center justify-center rounded-xl border border-dashed border-zinc-200">
                    <p className="text-sm text-zinc-400">Your generated post will appear here.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <PostSection title="Hook" value={post.hook} />
                    <PostSection title="Body" value={post.body} />
                    <PostSection title="CTA" value={post.cta} />
                    <div className="flex flex-wrap gap-2">
                      {(post.hashtags || []).map((tag) => <span key={tag} className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-bold">#{tag.replace(/^#/, "")}</span>)}
                    </div>
                    {score ? <div className="rounded-xl border border-zinc-200 p-4 text-sm"><b>Quality score:</b> {score.total_score}/100 {score.feedback ? `- ${score.feedback}` : ""}</div> : null}
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => generatePost(selectedHook, true)} disabled={isImproving || usage?.plan === "free"} className="rounded-lg bg-zinc-950 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{isImproving ? "Improving..." : "Push to 90+"}</button>
                      <button onClick={copyPost} className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-bold">Copy</button>
                      <button onClick={saveToLibrary} className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-bold">Save to library</button>
                    </div>
                  </div>
                )}
              </div>
            </section>
          </div>
        ) : null}
      </div>
    </main>
  )
}

function PostSection({ title, value }: { title: string; value: string }) {
  return (
    <article className="rounded-xl border border-zinc-200 p-4">
      <p className="text-xs font-black uppercase tracking-wide text-zinc-400">{title}</p>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-7">{value}</p>
    </article>
  )
}
