"use client"
import { useEffect, useMemo, useState } from "react"
import { useAuth } from "@/components/providers/AuthProvider"
import { useWorkspace } from "@/components/providers/WorkspaceProvider"
import { shareToLinkedIn } from "@/lib/api/client"

const POST_TYPES = ["LinkedIn - Text post", "LinkedIn - Carousel", "LinkedIn - Visual"]

type PublishState = { status: "idle" | "loading" | "success" | "error"; message: string; postUrn: string | null }
type WriterBootstrapPost = { id?: string; title?: string; content?: string; type?: string; externalPostUrn?: string | null }
type WriterBootstrap = { post: WriterBootstrapPost | null; scheduleDate: string; parseFailed: boolean; hasWriterLoad: boolean; hasWriterScheduleDate: boolean }

type GenerateResponse = { text?: string; error?: string }

const normalizeLinkedInUrn = (value: string) => {
  const urn = value.trim()
  if (!urn) return ""
  return urn.startsWith("urn:") ? urn : `urn:li:share:${urn}`
}

const readWriterBootstrap = (): WriterBootstrap => {
  if (typeof window === "undefined") {
    return { post: null, scheduleDate: "", parseFailed: false, hasWriterLoad: false, hasWriterScheduleDate: false }
  }

  const rawPost = sessionStorage.getItem("writerLoad")
  const rawDate = sessionStorage.getItem("writerScheduleDate")

  if (!rawPost) {
    return {
      post: null,
      scheduleDate: rawDate || "",
      parseFailed: false,
      hasWriterLoad: false,
      hasWriterScheduleDate: Boolean(rawDate),
    }
  }

  try {
    return {
      post: JSON.parse(rawPost) as WriterBootstrapPost,
      scheduleDate: rawDate || "",
      parseFailed: false,
      hasWriterLoad: true,
      hasWriterScheduleDate: Boolean(rawDate),
    }
  } catch {
    return {
      post: null,
      scheduleDate: rawDate || "",
      parseFailed: true,
      hasWriterLoad: true,
      hasWriterScheduleDate: Boolean(rawDate),
    }
  }
}

export default function WriterPage() {
  const { user } = useAuth()
  const { state, saveDraft, schedulePost, publishPost, createJob } = useWorkspace()
  const bootstrap = useMemo(() => readWriterBootstrap(), [])

  const [editingId, setEditingId] = useState<string | null>(bootstrap.post?.id || null)
  const [title, setTitle] = useState(bootstrap.post?.title || "")
  const [aiPrompt, setAiPrompt] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [content, setContent] = useState(bootstrap.post?.content || "")
  const [postType, setPostType] = useState(bootstrap.post?.type || POST_TYPES[0])
  const [scheduleDate, setScheduleDate] = useState(bootstrap.scheduleDate)
  const [scheduleTime, setScheduleTime] = useState("09:00")
  const [status, setStatus] = useState<string | null>(
    bootstrap.parseFailed ? "Could not load requested draft" : bootstrap.scheduleDate ? `Drafting for ${bootstrap.scheduleDate}` : null
  )
  const [publish, setPublish] = useState<PublishState>(
    bootstrap.post?.externalPostUrn
      ? { status: "success", message: "Already published", postUrn: String(bootstrap.post.externalPostUrn) }
      : { status: "idle", message: "", postUrn: null }
  )

  useEffect(() => {
    if (bootstrap.hasWriterLoad) {
      sessionStorage.removeItem("writerLoad")
    }
    if (bootstrap.hasWriterScheduleDate) {
      sessionStorage.removeItem("writerScheduleDate")
    }
  }, [bootstrap.hasWriterLoad, bootstrap.hasWriterScheduleDate])

  const wordCount = useMemo(() => (content.trim() ? content.trim().split(/\s+/).length : 0), [content])
  const characterCount = content.length

  const resolveTitle = () => title.trim() || content.trim().split("\n")[0]?.slice(0, 80) || "Untitled post"

  const onSaveDraft = () => {
    if (!content.trim()) {
      setStatus("Write content first")
      return
    }
    const id = saveDraft({ id: editingId, title: resolveTitle(), content, type: postType })
    setEditingId(id)
    setStatus("Draft saved")
  }

  const onSchedule = () => {
    if (!content.trim()) {
      setStatus("Write content first")
      return
    }
    if (!scheduleDate || !scheduleTime) {
      setStatus("Select date and time")
      return
    }
    const id = schedulePost({ id: editingId, title: resolveTitle(), content, type: postType, date: scheduleDate, time: scheduleTime })
    setEditingId(id)
    if (postType.toLowerCase().includes("carousel")) {
      createJob({
        type: "carousel_generation",
        status: "queued",
        title: "Carousel generation",
        payload: { postId: id, title: resolveTitle(), content },
      }).catch(() => undefined)
    }
    setStatus(`Scheduled for ${scheduleDate} at ${scheduleTime}`)
  }

  const onPublish = async () => {
    if (!content.trim()) {
      setPublish({ status: "error", message: "Write content first", postUrn: null })
      return
    }

    setPublish({ status: "loading", message: "Publishing to LinkedIn...", postUrn: null })
    try {
      const result = await shareToLinkedIn({ content })
      const postUrn = normalizeLinkedInUrn(result.postUrn || "") || null
      const id = publishPost({
        id: editingId,
        title: resolveTitle(),
        content,
        type: postType,
        publishedAt: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        externalPostUrn: postUrn,
      })
      setEditingId(id)
      setPublish({ status: "success", message: "Published to LinkedIn", postUrn })
      if (postType.toLowerCase().includes("carousel")) {
        createJob({
          type: "carousel_generation",
          status: "queued",
          title: "Carousel asset generation",
          payload: { postId: id, postUrn, title: resolveTitle() },
        }).catch(() => undefined)
      }
    } catch (error) {
      setPublish({ status: "error", message: (error as Error).message || "LinkedIn publish failed", postUrn: null })
    }
  }

  const onGenerate = async () => {
    const prompt = aiPrompt.trim()
    if (!prompt) {
      setStatus("Add a prompt first")
      return
    }

    setIsGenerating(true)
    setStatus("Generating post via AI...")

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          postType,
          title: title.trim(),
          profile: state.profile,
        }),
      })
      const data = (await res.json().catch(() => ({}))) as GenerateResponse
      if (!res.ok) throw new Error(data.error || "Generation failed")
      const nextContent = String(data.text || "").trim()
      if (!nextContent) throw new Error("AI returned an empty draft")
      setContent(nextContent)
      setStatus("AI draft ready")
    } catch (error) {
      setStatus((error as Error).message || "Failed to generate content")
    } finally {
      setIsGenerating(false)
    }
  }

  const onLoadPost = (postId: string) => {
    const post = state.posts.find((item) => item.id === postId)
    if (!post) return
    setEditingId(post.id)
    setTitle(post.title)
    setContent(post.content)
    setPostType(post.type)
    setScheduleDate(post.date || "")
    setScheduleTime(post.scheduledTime || "09:00")
    setPublish({ status: "idle", message: "", postUrn: post.externalPostUrn })
    setStatus(`Loaded ${post.status} post`)
  }

  return (
    <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-6 py-8 lg:grid-cols-[1fr_320px]">
      <section className="rounded-2xl border border-zinc-200 bg-white p-5 sm:p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold text-zinc-900">Writer</h1>
          <div className="flex flex-wrap items-center gap-2">
            <select value={postType} onChange={(e) => setPostType(e.target.value)} className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-700">
              {POST_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
            <button onClick={onSaveDraft} className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-50">Save draft</button>
            <button onClick={onPublish} disabled={publish.status === "loading"} className="rounded-lg bg-teal px-3 py-2 text-sm font-semibold text-white hover:bg-teal-600 disabled:opacity-60">
              {publish.status === "loading" ? "Publishing..." : "Publish now"}
            </button>
          </div>
        </div>

        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Working title"
          className="mb-3 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900"
        />

        <div className="mb-3 flex items-center gap-2">
           <input 
             value={aiPrompt}
             onChange={(e) => setAiPrompt(e.target.value)}
             placeholder="What should this post be about? (e.g. 3 tips for remote work)"
             className="w-full rounded-lg border border-teal/30 bg-teal/5 px-3 py-2 text-sm text-zinc-900 focus:border-teal/50 focus:ring-1 focus:ring-teal/30"
           />
           <button 
             onClick={onGenerate}
             disabled={isGenerating || !aiPrompt.trim()}
             className="shrink-0 rounded-lg bg-teal/10 px-3 py-2 text-sm font-semibold text-teal hover:bg-teal/20 disabled:opacity-50"
           >
             {isGenerating ? "Writing..." : "Generate AI Draft"}
           </button>
        </div>

        <div className="relative mt-2 w-full rounded-2xl border border-zinc-200 bg-white p-1 shadow-sm transition-all focus-within:border-teal/50 focus-within:ring-4 focus-within:ring-teal/10">
          <textarea
            value={content}
            onChange={(e) => {
              setContent(e.target.value)
              e.target.style.height = 'auto'
              e.target.style.height = `${e.target.scrollHeight}px`
            }}
            placeholder="Write your post..."
            className="min-h-[420px] w-full resize-none bg-transparent px-4 py-5 text-base leading-relaxed text-zinc-900 outline-none"
            style={{ overflow: 'hidden' }}
          />
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-500">
          <span>{wordCount} words</span>
          <span>{characterCount} characters</span>
          <span>{editingId ? `Editing ${editingId.slice(0, 8)}` : "New draft"}</span>
          <span>{user?.linkedinMemberId ? "LinkedIn connected" : "LinkedIn session required for publish"}</span>
        </div>

        <div className="mt-6 flex flex-col sm:flex-row items-center gap-3 rounded-2xl border border-zinc-200/60 bg-gradient-to-r from-zinc-50/50 to-white p-4 shadow-sm">
          <div className="relative w-full sm:flex-1">
            <label className="absolute -top-2.5 left-3 inline-block bg-white px-1 text-[10px] font-bold uppercase tracking-wider text-teal">Publish Date</label>
            <input type="date" value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)} className="w-full rounded-xl border border-zinc-200/80 bg-white px-4 py-2.5 text-sm font-medium text-zinc-900 shadow-sm transition-all focus:border-teal focus:outline-none focus:ring-4 focus:ring-teal/10" />
          </div>
          <div className="relative w-full sm:w-[140px]">
            <label className="absolute -top-2.5 left-3 inline-block bg-white px-1 text-[10px] font-bold uppercase tracking-wider text-teal">Time</label>
            <input type="time" value={scheduleTime} onChange={(e) => setScheduleTime(e.target.value)} className="w-full rounded-xl border border-zinc-200/80 bg-white px-4 py-2.5 text-sm font-medium text-zinc-900 shadow-sm transition-all focus:border-teal focus:outline-none focus:ring-4 focus:ring-teal/10" />
          </div>
          <button onClick={onSchedule} className="w-full shrink-0 rounded-xl bg-zinc-900 px-6 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:scale-[1.02] hover:bg-zinc-800 hover:shadow-lg active:scale-[0.98] sm:w-auto">
            Schedule Post
          </button>
        </div>

        {status && <p className="mt-3 text-sm text-zinc-600">{status}</p>}
        {publish.status !== "idle" && (
          <p className={`mt-2 text-sm ${publish.status === "error" ? "text-red-600" : "text-zinc-700"}`}>
            {publish.message}
            {publish.postUrn ? ` - ${publish.postUrn}` : ""}
          </p>
        )}
      </section>

      <aside className="rounded-2xl border border-zinc-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-zinc-900">Workspace posts</h2>
        <div className="space-y-2">
          {state.posts.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-teal/10 to-teal/5">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-teal" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                </svg>
              </div>
              <p className="text-sm font-medium text-zinc-700">No posts yet</p>
              <p className="mt-1 text-xs text-zinc-400">Start writing above to see your posts here.</p>
            </div>
          ) : (
            state.posts.slice(0, 20).map((post) => (
              <button key={post.id} onClick={() => onLoadPost(post.id)} className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-left hover:bg-zinc-50">
                <p className="truncate text-sm font-medium text-zinc-900">{post.title}</p>
                <p className="mt-0.5 text-xs text-zinc-500">{post.status} - {post.type}</p>
              </button>
            ))
          )}
        </div>
      </aside>
    </div>
  )
}


