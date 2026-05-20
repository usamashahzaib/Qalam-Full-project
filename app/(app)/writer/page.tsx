"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/components/providers/AuthProvider"
import { useWorkspace } from "@/components/providers/WorkspaceProvider"
import type { ContentAnalysis } from "@/lib/content-intelligence"
import { shareToLinkedIn } from "@/lib/api/client"
import { withClientParam, withWorkspaceKey } from "@/lib/workspace-navigation"

const POST_TYPES = ["LinkedIn - Text post", "LinkedIn - Carousel", "LinkedIn - Visual"]
const POST_FILTERS = [
  { key: "all", label: "All" },
  { key: "draft", label: "Drafts" },
  { key: "scheduled", label: "Scheduled" },
  { key: "pending_approval", label: "In review" },
  { key: "published", label: "Published" },
] as const

type PublishState = { status: "idle" | "loading" | "success" | "error"; message: string; postUrn: string | null }
type WriterBootstrapPost = { id?: string; title?: string; content?: string; type?: string; externalPostUrn?: string | null }
type WriterBootstrap = { post: WriterBootstrapPost | null; scheduleDate: string; parseFailed: boolean; hasWriterLoad: boolean; hasWriterScheduleDate: boolean }
type GenerateResponse = { text?: string; error?: string }
type IntelligenceResponse = { analysis?: ContentAnalysis; commentReplies?: { comment: string; reply: string }[]; error?: string }

const normalizeLinkedInUrn = (value: string) => {
  const urn = value.trim()
  if (!urn) return ""
  return urn.startsWith("urn:") ? urn : `urn:li:share:${urn}`
}

const readWriterBootstrap = (): WriterBootstrap => {
  if (typeof window === "undefined") return { post: null, scheduleDate: "", parseFailed: false, hasWriterLoad: false, hasWriterScheduleDate: false }
  const rawPost = sessionStorage.getItem("writerLoad")
  const rawDate = sessionStorage.getItem("writerScheduleDate")
  if (!rawPost) return { post: null, scheduleDate: rawDate || "", parseFailed: false, hasWriterLoad: false, hasWriterScheduleDate: Boolean(rawDate) }
  try {
    return { post: JSON.parse(rawPost) as WriterBootstrapPost, scheduleDate: rawDate || "", parseFailed: false, hasWriterLoad: true, hasWriterScheduleDate: Boolean(rawDate) }
  } catch {
    return { post: null, scheduleDate: rawDate || "", parseFailed: true, hasWriterLoad: true, hasWriterScheduleDate: Boolean(rawDate) }
  }
}

const copyText = async (value: string) => {
  if (!value) return
  await navigator.clipboard.writeText(value)
}

const filterLabel = (value: (typeof POST_FILTERS)[number]["key"]) => POST_FILTERS.find((item) => item.key === value)?.label.toLowerCase() || "items"

export default function WriterPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const { posts, profile, saveDraft, schedulePost, publishPost, isLoadingPosts, workspaceId, state } = useWorkspace()
  const activeClientId = (state as { agency?: { activeClientId?: string | null } }).agency?.activeClientId || null
  const bootstrap = useMemo(() => readWriterBootstrap(), [])
  const isClientWorkspace = Boolean(activeClientId)

  const [editingId, setEditingId] = useState<string | null>(bootstrap.post?.id || null)
  const [title, setTitle] = useState(bootstrap.post?.title || "")
  const [aiPrompt, setAiPrompt] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [isThinking, setIsThinking] = useState(false)
  const [content, setContent] = useState(bootstrap.post?.content || "")
  const [postType, setPostType] = useState(bootstrap.post?.type || POST_TYPES[0])
  const [scheduleDate, setScheduleDate] = useState(bootstrap.scheduleDate)
  const [scheduleTime, setScheduleTime] = useState("09:00")
  const [status, setStatus] = useState<string | null>(bootstrap.parseFailed ? "Could not load requested draft" : bootstrap.scheduleDate ? `Drafting for ${bootstrap.scheduleDate}` : null)
  const [publish, setPublish] = useState<PublishState>(bootstrap.post?.externalPostUrn ? { status: "success", message: "Already published", postUrn: String(bootstrap.post.externalPostUrn) } : { status: "idle", message: "", postUrn: null })
  const [postFilter, setPostFilter] = useState<(typeof POST_FILTERS)[number]["key"]>("all")
  const [commentsText, setCommentsText] = useState("")
  const [analysis, setAnalysis] = useState<ContentAnalysis | null>(null)
  const [commentReplies, setCommentReplies] = useState<{ comment: string; reply: string }[]>([])
  const [insightNote, setInsightNote] = useState<string | null>(null)

  const wordCount = useMemo(() => (content.trim() ? content.trim().split(/\s+/).length : 0), [content])
  const characterCount = content.length
  const resolveTitle = () => title.trim() || content.trim().split("\n")[0]?.slice(0, 80) || "Untitled post"
  const currentDraftLabel = editingId ? `Editing ${editingId.slice(0, 8)}` : "New draft"
  const publishLabel = user?.linkedinMemberId ? "LinkedIn connected" : "LinkedIn needs connection"
  const filteredPosts = useMemo(() => {
    const ordered = [...posts].sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))
    return postFilter === "all" ? ordered : ordered.filter((post) => post.status === postFilter)
  }, [postFilter, posts])

  useEffect(() => {
    if (searchParams.get("compose") !== "new") return
    setEditingId(null)
    setTitle("")
    setAiPrompt("")
    setContent("")
    setPostType(POST_TYPES[0])
    setScheduleDate("")
    setScheduleTime("09:00")
    setPublish({ status: "idle", message: "", postUrn: null })
    setCommentsText("")
    setAnalysis(null)
    setCommentReplies([])
    setStatus("Fresh draft ready")
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("writerLoad")
      sessionStorage.removeItem("writerScheduleDate")
    }
    router.replace(withClientParam("/writer", activeClientId))
  }, [activeClientId, router, searchParams])

  useEffect(() => {
    if (!content.trim()) {
      setAnalysis(null)
      setCommentReplies([])
      setInsightNote(null)
      return
    }
    const timeout = window.setTimeout(async () => {
      setIsThinking(true)
      try {
        const res = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode: "intelligence",
            title: resolveTitle(),
            content,
            comments: commentsText,
            postType,
            profile,
          }),
        })
        const data = (await res.json().catch(() => ({}))) as IntelligenceResponse
        if (!res.ok) throw new Error(data.error || "Insights unavailable")
        setAnalysis(data.analysis || null)
        setCommentReplies(data.commentReplies || [])
        setInsightNote("Insights refreshed")
      } catch (error) {
        setInsightNote((error as Error).message || "Insights unavailable")
      } finally {
        setIsThinking(false)
      }
    }, 550)
    return () => window.clearTimeout(timeout)
  }, [commentsText, content, postType, profile, title])

  const createCarousel = async (postId: string) => {
    const res = await fetch(withWorkspaceKey("/api/carousel", workspaceId), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postId, title: resolveTitle(), content, workspaceKey: workspaceId }),
    })
    return res.json().catch(() => ({}))
  }

  const onSaveDraft = async () => {
    if (!content.trim()) { setStatus("Write content first"); return }
    try {
      const id = await saveDraft({ id: editingId, title: resolveTitle(), content, type: postType })
      setEditingId(id)
      setStatus("Draft saved")
    } catch (e) {
      setStatus("Save failed: " + (e as Error).message)
    }
  }

  const onSchedule = async () => {
    if (!content.trim()) { setStatus("Write content first"); return }
    if (!scheduleDate || !scheduleTime) { setStatus("Select date and time"); return }
    try {
      if (postType.toLowerCase().includes("carousel")) {
        setStatus("Scheduling and generating carousel...")
        const id = await schedulePost({ id: editingId, title: resolveTitle(), content, type: postType, date: scheduleDate, time: scheduleTime })
        setEditingId(id)
        const data = await createCarousel(id).catch(() => ({}))
        if (data.projectId) {
          setStatus("Carousel ready - opening editor")
          router.push(withClientParam(`/carousels/${data.projectId}`, activeClientId))
        } else setStatus(`Scheduled for ${scheduleDate} at ${scheduleTime}`)
      } else {
        const id = await schedulePost({ id: editingId, title: resolveTitle(), content, type: postType, date: scheduleDate, time: scheduleTime })
        setEditingId(id)
        setStatus(`Scheduled for ${scheduleDate} at ${scheduleTime}`)
      }
    } catch (e) {
      setStatus("Schedule failed: " + (e as Error).message)
    }
  }

  const openLinkedInComposer = () => {
    const linkedInUrl = `https://www.linkedin.com/feed/?shareActive=true&text=${encodeURIComponent(content)}`
    window.open(linkedInUrl, "_blank", "noopener,noreferrer")
    setPublish({
      status: "success",
      message: "Opened LinkedIn composer. Client only needs to review and click Post there.",
      postUrn: null,
    })
  }

  const onPublish = async () => {
    if (!content.trim()) { setPublish({ status: "error", message: "Write content first", postUrn: null }); return }
    const publishDirectly = window.confirm("Publish directly from Qalam?\n\nOK = publish now from Qalam.\nCancel = open LinkedIn with this draft ready for manual review.")
    if (!publishDirectly) return openLinkedInComposer()
    if (!user?.linkedinMemberId) {
      setPublish({ status: "error", message: "Connect LinkedIn first or use manual handoff.", postUrn: null })
      return
    }
    setPublish({ status: "loading", message: "Publishing to LinkedIn...", postUrn: null })
    try {
      let postId = editingId
      if (!postId) {
        postId = await saveDraft({ id: null, title: resolveTitle(), content, type: postType })
        setEditingId(postId)
      }
      const result = await shareToLinkedIn({ content, postId, workspaceKey: workspaceId })
      const postUrn = normalizeLinkedInUrn(result.postUrn || "") || null
      const id = await publishPost({ id: postId, title: resolveTitle(), content, type: postType, publishedAt: new Date().toISOString(), externalPostUrn: postUrn })
      setEditingId(id)
      setPublish({ status: "success", message: "Published to LinkedIn", postUrn })
      if (postType.toLowerCase().includes("carousel")) {
        const data = await createCarousel(id).catch(() => ({}))
        if (data.projectId) router.push(withClientParam(`/carousels/${data.projectId}`, activeClientId))
      }
    } catch (error) {
      setPublish({ status: "error", message: (error as Error).message || "LinkedIn publish failed", postUrn: null })
    }
  }

  const onGenerate = async () => {
    const prompt = aiPrompt.trim()
    if (!prompt) { setStatus("Add a prompt first"); return }
    setIsGenerating(true)
    setStatus("Generating post via AI...")
    try {
      const res = await fetch("/api/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt, postType, title: title.trim(), profile }) })
      const data = (await res.json().catch(() => ({}))) as GenerateResponse
      if (!res.ok) throw new Error(data.error || "Generation failed")
      const nextContent = String(data.text || "").trim()
      if (!nextContent) throw new Error("AI returned an empty draft")
      setContent(nextContent)
      setStatus(postType.includes("Carousel") ? "Draft ready. Save or schedule to build slides." : "AI draft ready")
    } catch (error) {
      setStatus((error as Error).message || "Failed to generate content")
    } finally {
      setIsGenerating(false)
    }
  }

  const onLoadPost = (postId: string) => {
    const post = posts.find((item) => item.id === postId)
    if (!post) return
    setEditingId(post.id)
    setTitle(post.title)
    setContent(post.content)
    setPostType(post.type)
    setScheduleDate(post.scheduledTime?.split("T")[0] || (/^\d{4}-\d{2}-\d{2}$/.test(post.date) ? post.date : ""))
    setScheduleTime(post.scheduledTime?.split("T")[1]?.slice(0, 5) || "09:00")
    setPublish({ status: "idle", message: "", postUrn: post.externalPostUrn })
    setStatus(`Loaded ${post.status} post`)
  }

  const onSendForApproval = async () => {
    if (!content.trim()) { setStatus("Write content first"); return }
    if (!isClientWorkspace) {
      setStatus("Approvals are for client workspaces. In your personal workspace, save, schedule, or publish directly.")
      return
    }
    try {
      setStatus("Sending for approval...")
      const id = await saveDraft({ id: editingId, title: resolveTitle(), content, type: postType })
      const res = await fetch(`/api/posts?id=${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "pending_approval", workspaceKey: workspaceId }) })
      if (!res.ok) throw new Error("Failed to update status")
      setEditingId(id)
      setStatus("Sent for approval")
    } catch (e) {
      setStatus("Approval request failed: " + (e as Error).message)
    }
  }

  return (
    <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-6 py-8 lg:grid-cols-[minmax(0,1fr)_340px]">
      <section className="flex flex-col gap-0 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        {/* Writer header bar */}
        <div className="border-b border-zinc-100 bg-zinc-50/60 px-6 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div>
                <h1 className="text-base font-bold text-zinc-900">AI Writer</h1>
                <p className="text-xs text-zinc-500">{currentDraftLabel}</p>
              </div>
              <select value={postType} onChange={(e) => setPostType(e.target.value)} className="cursor-pointer rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 shadow-sm outline-none focus:border-teal">
                {POST_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={onSaveDraft} className="cursor-pointer rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 transition-colors hover:bg-zinc-50 hover:border-zinc-400">Save draft</button>
              {isClientWorkspace && (
                <button onClick={onSendForApproval} className="cursor-pointer rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800 transition-colors hover:bg-amber-100">Send for approval</button>
              )}
              <button onClick={onPublish} disabled={publish.status === "loading"} className="cursor-pointer rounded-lg bg-teal px-4 py-1.5 text-xs font-bold text-white shadow-sm transition-colors hover:bg-teal-600 disabled:opacity-60">
                {publish.status === "loading" ? "Publishing..." : "Publish"}
              </button>
            </div>
          </div>
        </div>

        <div className="p-6">
          {/* Title + AI prompt */}
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Working title (optional)" className="mb-3 w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-4 py-2.5 text-sm font-medium text-zinc-900 outline-none transition-all focus:border-teal focus:bg-white focus:ring-4 focus:ring-teal/10" />
          <div className="mb-5 flex flex-col gap-2 sm:flex-row">
            <input value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)} placeholder="Topic, angle, or instruction for AI Draft" className="flex-1 rounded-xl border border-teal/25 bg-teal/[0.03] px-4 py-2.5 text-sm text-zinc-900 outline-none transition-all focus:border-teal focus:ring-4 focus:ring-teal/10" onKeyDown={(e) => e.key === "Enter" && !isGenerating && aiPrompt.trim() && onGenerate()} />
            <button onClick={onGenerate} disabled={isGenerating || !aiPrompt.trim()} className="cursor-pointer whitespace-nowrap rounded-xl bg-teal/10 px-5 py-2.5 text-sm font-bold text-teal transition-colors hover:bg-teal/20 disabled:opacity-50">
              {isGenerating ? "Writing..." : "Generate Draft"}
            </button>
          </div>

          {/* Score cards */}
          <div className="mb-5 grid gap-3 sm:grid-cols-3">
            <MetricCard label="Content score" value={analysis ? `${analysis.overallScore}/100` : "--"} note={analysis?.overallLabel || "Waiting for draft"} accent="teal" />
            <MetricCard label="Hook type" value={analysis?.hookType || "--"} note={analysis ? (analysis.scores[0]?.note || "First line") : "First line analysis"} accent="amber" />
            <MetricCard label="Voice fit" value={analysis ? `${analysis.scores.find((item) => item.label === "Voice fit")?.score ?? 0}/100` : "--"} note={profile.name || profile.title ? "Using saved profile" : "Add voice profile for better fit"} accent="zinc" />
          </div>

          {/* Post textarea */}
          <div className="relative w-full overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition-all focus-within:border-teal/40 focus-within:ring-4 focus-within:ring-teal/10">
            <textarea value={content} onChange={(e) => { setContent(e.target.value); e.target.style.height = "auto"; e.target.style.height = `${e.target.scrollHeight}px` }} placeholder="Write your post here, or generate one above..." className="min-h-[400px] w-full resize-none bg-transparent px-5 py-5 text-base leading-[1.8] text-zinc-900 outline-none" style={{ overflow: "hidden" }} />
            <div className="flex items-center gap-4 border-t border-zinc-100 bg-zinc-50/60 px-5 py-2.5 text-xs text-zinc-400">
              <span>{wordCount} words</span>
              <span>{characterCount} chars</span>
              <span className="ml-auto">{publishLabel}</span>
            </div>
          </div>

          {/* Score analysis + hashtags + replies */}
          <div className="mt-5 grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
            <div className="rounded-2xl border border-zinc-100 bg-zinc-50/70 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-zinc-900">Improve this draft</h2>
                <span className={`text-xs ${isThinking ? "animate-pulse text-teal" : "text-zinc-400"}`}>{isThinking ? "Analyzing..." : insightNote || "Live insights"}</span>
              </div>
              {(analysis?.scores || []).length === 0 ? (
                <p className="py-4 text-center text-xs text-zinc-400">Write a post to see dimension scores.</p>
              ) : (
                <div className="space-y-2.5">
                  {(analysis?.scores || []).map((item) => {
                    const barColor = item.score >= 82 ? "bg-teal" : item.score >= 68 ? "bg-teal/60" : item.score >= 52 ? "bg-amber-400" : "bg-red-400"
                    return (
                      <div key={item.label} className="rounded-xl border border-zinc-200 bg-white p-3">
                        <div className="mb-1.5 flex items-center justify-between">
                          <span className="text-[11px] font-bold uppercase tracking-wide text-zinc-500">{item.label}</span>
                          <span className={`text-sm font-bold ${item.score >= 68 ? "text-teal" : item.score >= 52 ? "text-amber-600" : "text-red-500"}`}>{item.score}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-zinc-100">
                          <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${item.score}%` }} />
                        </div>
                        <p className="mt-1.5 text-[11px] leading-snug text-zinc-500">{item.note}</p>
                      </div>
                    )
                  })}
                </div>
              )}
              {analysis?.improvements?.length ? (
                <ul className="mt-3 space-y-1.5">
                  {analysis.improvements.map((item) => (
                    <li key={item} className="flex items-start gap-2 rounded-lg bg-white px-3 py-2 text-xs text-zinc-600">
                      <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
                      {item}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-zinc-200 bg-white p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-zinc-900">Hashtags</h2>
                  <button onClick={() => copyText((analysis?.hashtags || []).join(" "))} className="cursor-pointer text-xs font-semibold text-teal transition-colors hover:text-teal-700">Copy all</button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {(analysis?.hashtags || []).length ? analysis!.hashtags.map((tag) => (
                    <button key={tag} onClick={() => copyText(tag)} className="cursor-pointer rounded-full border border-teal/20 bg-teal/5 px-2.5 py-1 text-xs font-medium text-teal transition-colors hover:bg-teal/10">
                      {tag}
                    </button>
                  )) : <p className="text-xs text-zinc-400">Write more to unlock hashtags.</p>}
                </div>
              </div>

              <div className="rounded-2xl border border-zinc-200 bg-white p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-zinc-900">Comment replies</h2>
                  <button onClick={() => setCommentsText("")} className="cursor-pointer text-xs font-semibold text-zinc-400 transition-colors hover:text-zinc-700">Clear</button>
                </div>
                <textarea value={commentsText} onChange={(e) => setCommentsText(e.target.value)} rows={4} placeholder="Paste comments here. Qalam drafts short replies." className="w-full resize-none rounded-xl border border-zinc-200 bg-zinc-50/50 px-3 py-2.5 text-sm text-zinc-900 outline-none transition-all focus:border-teal focus:bg-white focus:ring-4 focus:ring-teal/10" />
                <div className="mt-3 space-y-2">
                  {commentReplies.length ? commentReplies.map((item, index) => (
                    <div key={`${item.comment}-${index}`} className="rounded-xl border border-zinc-100 bg-zinc-50 p-3">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-400">Comment</p>
                      <p className="mt-1 text-xs text-zinc-600">{item.comment}</p>
                      <div className="mt-2 flex items-start justify-between gap-2 border-t border-zinc-100 pt-2">
                        <p className="flex-1 text-sm font-medium leading-snug text-zinc-900">{item.reply}</p>
                        <button onClick={() => copyText(item.reply)} className="cursor-pointer shrink-0 text-xs font-semibold text-teal transition-colors hover:text-teal-700">Copy</button>
                      </div>
                    </div>
                  )) : <p className="text-xs text-zinc-400">Paste comments to get context-aware replies.</p>}
                </div>
              </div>
            </div>
          </div>

          {/* Schedule bar */}
          <div className="mt-5 flex flex-col items-stretch gap-3 overflow-hidden rounded-2xl border border-zinc-200 bg-gradient-to-r from-zinc-50/80 to-white p-4 shadow-sm sm:flex-row sm:items-center">
            <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <label className="absolute -top-2.5 left-3 inline-block bg-white px-1 text-[9px] font-bold uppercase tracking-wider text-teal">Publish Date</label>
                <input type="date" value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)} className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm text-zinc-900 shadow-sm transition-all focus:border-teal focus:outline-none focus:ring-4 focus:ring-teal/10" />
              </div>
              <div className="relative sm:w-36">
                <label className="absolute -top-2.5 left-3 inline-block bg-white px-1 text-[9px] font-bold uppercase tracking-wider text-teal">Time</label>
                <input type="time" value={scheduleTime} onChange={(e) => setScheduleTime(e.target.value)} className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm text-zinc-900 shadow-sm transition-all focus:border-teal focus:outline-none focus:ring-4 focus:ring-teal/10" />
              </div>
            </div>
            <button onClick={onSchedule} className="cursor-pointer rounded-xl bg-zinc-900 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-zinc-800">Schedule Post</button>
          </div>

          {status && <p className={`mt-3 text-sm ${status.toLowerCase().includes("fail") ? "text-red-600" : "text-zinc-500"}`}>{status}</p>}
          {publish.status !== "idle" && (
            <div className={`mt-3 rounded-xl px-4 py-3 text-sm ${publish.status === "error" ? "border border-red-200 bg-red-50 text-red-700" : publish.status === "success" ? "border border-emerald-200 bg-emerald-50 text-emerald-700" : "bg-zinc-50 text-zinc-600"}`}>
              {publish.message}{publish.postUrn && <span className="ml-2 font-mono text-xs opacity-70">{publish.postUrn}</span>}
            </div>
          )}
        </div>
      </section>

      <aside className="space-y-4">
        {/* Workspace posts */}
        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-zinc-100 bg-zinc-50/60 px-4 py-3">
            <h2 className="text-sm font-semibold text-zinc-900">Workspace posts</h2>
            <button onClick={() => router.push(withClientParam("/library", activeClientId))} className="cursor-pointer text-xs font-semibold text-teal transition-colors hover:text-teal-700">Library &rarr;</button>
          </div>
          <div className="border-b border-zinc-100 px-4 py-2.5">
            <div className="flex flex-wrap gap-1.5">
              {POST_FILTERS.map((filter) => (
                <button key={filter.key} onClick={() => setPostFilter(filter.key)} className={`cursor-pointer rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide transition-colors ${postFilter === filter.key ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200"}`}>
                  {filter.label}
                </button>
              ))}
            </div>
          </div>
          <div className="p-3">
            {isLoadingPosts ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => <div key={i} className="h-14 animate-pulse rounded-xl bg-zinc-100" />)}
              </div>
            ) : filteredPosts.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-center">
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100">
                  <svg className="h-5 w-5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                </div>
                <p className="text-sm font-medium text-zinc-700">No {postFilter === "all" ? "posts" : filterLabel(postFilter)} yet</p>
                <p className="mt-0.5 text-xs text-zinc-400">Create one using the writer.</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {filteredPosts.slice(0, 20).map((post) => (
                  <button key={post.id} onClick={() => onLoadPost(post.id)} className={`w-full cursor-pointer rounded-xl border px-3 py-2.5 text-left transition-all hover:shadow-sm ${editingId === post.id ? "border-teal/30 bg-teal/5 shadow-sm" : "border-zinc-100 hover:border-zinc-200 hover:bg-zinc-50"}`}>
                    <p className="truncate text-sm font-medium text-zinc-900">{post.title}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${post.status === "published" ? "bg-emerald-50 text-emerald-700" : post.status === "scheduled" ? "bg-amber-50 text-amber-700" : post.status === "pending_approval" ? "bg-blue-50 text-blue-700" : post.status === "rejected" ? "bg-red-50 text-red-600" : "bg-zinc-100 text-zinc-500"}`}>
                        {post.status.replaceAll("_", " ")}
                      </span>
                      <span className="truncate text-[10px] text-zinc-400">{post.type?.replace("LinkedIn - ", "")}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick guide */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-4">
          <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-zinc-500">Publish flow</h2>
          <div className="space-y-2">
            {[
              { label: "Save draft", desc: "Stores to workspace without publishing" },
              { label: "Schedule", desc: "Adds to planner with date and time" },
              { label: "Publish now", desc: "Sends to LinkedIn or opens manual handoff" },
              { label: "Approvals", desc: "Client workspaces only" },
            ].map((item) => (
              <div key={item.label} className="flex items-start gap-2">
                <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-teal" />
                <div>
                  <span className="text-xs font-semibold text-zinc-800">{item.label}</span>
                  <span className="ml-1 text-xs text-zinc-500">{item.desc}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </aside>
    </div>
  )
}

function MetricCard({ label, value, note, accent }: { label: string; value: string; note: string; accent: "teal" | "amber" | "zinc" }) {
  const leftBorder = accent === "amber" ? "border-l-amber-400" : accent === "zinc" ? "border-l-zinc-300" : "border-l-teal"
  const valueColor = accent === "amber" ? "text-amber-700" : accent === "zinc" ? "text-zinc-700" : "text-teal"
  return (
    <div className={`rounded-2xl border border-zinc-200 border-l-[3px] bg-white p-4 ${leftBorder}`}>
      <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">{label}</p>
      <p className={`mt-2 text-xl font-bold ${valueColor}`}>{value}</p>
      <p className="mt-1 text-[11px] leading-snug text-zinc-500">{note}</p>
    </div>
  )
}
