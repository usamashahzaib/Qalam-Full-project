"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/components/providers/AuthProvider"
import { useWorkspace } from "@/components/providers/WorkspaceProvider"
import type { ContentAnalysis } from "@/lib/content-intelligence"
import { shareToLinkedIn } from "@/lib/api/client"
import { withClientParam, withWorkspaceKey } from "@/lib/workspace-navigation"
import { cleanErrorMessage, sanitizeGeneratedText } from "@/lib/content-guard"
import { canAccessPlan, getEffectivePlanLimits } from "@/lib/entitlements"
import { DraftCounter, incrementDraftUsage, readDraftUsage } from "@/components/DraftCounter"
import { LockedFeature } from "@/components/LockedFeature"
import { UpgradeModal } from "@/components/UpgradeModal"
import { HookCard } from "@/components/writer/HookCard"

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
type GenerateResponse = { text?: string; error?: string; analysis?: ContentAnalysis; metTarget?: boolean; usageCost?: number; needsPolish?: boolean; visual?: { imagePrompt?: string } }
type IntelligenceResponse = { analysis?: ContentAnalysis; hookSuggestions?: string[]; error?: string }
type RichReply = { comment: string; style: string; reply: string }
type DraftVersion = { content: string; createdAt: string }
type CarouselScore = { hookSlideScore: number; flowScore: number; ctaSlideScore: number; overallScore: number; notes?: string[] }
type CarouselSlidePreview = { title: string; body?: string; content?: string; visualDirection?: string }
type CarouselResponse = { projectId?: string; slides?: CarouselSlidePreview[]; score?: CarouselScore; error?: string }

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
const todayInput = () => {
  const d = new Date()
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 10)
}
const nowTimeInput = () => {
  const d = new Date()
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset() + 1)
  return d.toISOString().slice(11, 16)
}
const scheduleError = (date: string, time: string) => {
  if (!date || !time) return "Select date and time"
  const selected = new Date(`${date}T${time}:00`)
  if (Number.isNaN(selected.getTime())) return "Select a valid date and time"
  return selected.getTime() <= Date.now() ? "Choose a future time. Past dates and current minutes are locked." : null
}
const usageMonthKey = () => new Date().toISOString().slice(0, 7)
const pushAttemptKey = (workspaceId: string) => `qalam-push-90:${workspaceId}:${usageMonthKey()}`
const readPushAttempts = (workspaceId: string) => {
  if (typeof window === "undefined") return 0
  const value = Number(localStorage.getItem(pushAttemptKey(workspaceId)) || 0)
  return Number.isFinite(value) ? value : 0
}
const incrementPushAttempts = (workspaceId: string) => {
  if (typeof window === "undefined") return 0
  const next = readPushAttempts(workspaceId) + 1
  localStorage.setItem(pushAttemptKey(workspaceId), String(next))
  return next
}
const termsKey = (workspaceId: string) => `qalam-publish-terms:${workspaceId}`
const readPublishTerms = (workspaceId: string) => typeof window !== "undefined" && localStorage.getItem(termsKey(workspaceId)) === "accepted"
const profileTopics = (profile: { title?: string; industry?: string; goals?: string[] }) => {
  const role = profile.title || "your role"
  const industry = profile.industry || "your industry"
  const goal = profile.goals?.[0] || "building trust"
  return [
    `A hard lesson from ${role}`,
    `What ${industry} teams get wrong about ${goal}`,
    `One contrarian take from your work in ${industry}`,
  ]
}

export default function WriterPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const { posts, profile, saveDraft, schedulePost, publishPost, isLoadingPosts, workspaceId, state, billing } = useWorkspace()
  const canPublish = canAccessPlan(billing.plan, "Solo") || Boolean(billing.featureFlags?.scheduling)
  const canUseProTools = canAccessPlan(billing.plan, "Pro")
  const availablePostTypes = useMemo(() => canUseProTools ? POST_TYPES : POST_TYPES.filter((type) => !type.includes("Carousel") && !type.includes("Visual")), [canUseProTools])
  const activeClientId = (state as { agency?: { activeClientId?: string | null } }).agency?.activeClientId || null
  const bootstrap = useMemo(() => readWriterBootstrap(), [])
  const isClientWorkspace = Boolean(activeClientId)

  const [editingId, setEditingId] = useState<string | null>(bootstrap.post?.id || null)
  const [title, setTitle] = useState(bootstrap.post?.title || "")
  const [aiPrompt, setAiPrompt] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [isThinking, setIsThinking] = useState(false)
  const [isRepairingDraft, setIsRepairingDraft] = useState(false)
  const [content, setContent] = useState(bootstrap.post?.content || "")
  const [, setVersions] = useState<DraftVersion[]>([])
  const [postType, setPostType] = useState(bootstrap.post?.type || POST_TYPES[0])
  const [scheduleDate, setScheduleDate] = useState(bootstrap.scheduleDate)
  const [scheduleTime, setScheduleTime] = useState("09:00")
  const [status, setStatus] = useState<string | null>(bootstrap.parseFailed ? "Could not load requested draft" : bootstrap.scheduleDate ? `Drafting for ${bootstrap.scheduleDate}` : null)
  const [publish, setPublish] = useState<PublishState>(bootstrap.post?.externalPostUrn ? { status: "success", message: "Already published", postUrn: String(bootstrap.post.externalPostUrn) } : { status: "idle", message: "", postUrn: null })
  const [postFilter, setPostFilter] = useState<(typeof POST_FILTERS)[number]["key"]>("all")
  const [commentsText, setCommentsText] = useState("")
  const [originalPostText, setOriginalPostText] = useState("")
  const [analysis, setAnalysis] = useState<ContentAnalysis | null>(null)
  const [hookAlternatives, setHookAlternatives] = useState<string[]>([])
  const [isGeneratingHooks, setIsGeneratingHooks] = useState(false)
  const [isRewritingCta, setIsRewritingCta] = useState(false)
  const [richReplies, setRichReplies] = useState<RichReply[]>([])
  const [isGeneratingReplies, setIsGeneratingReplies] = useState(false)
  const [replyPanelOpen, setReplyPanelOpen] = useState(false)
  const [insightNote, setInsightNote] = useState<string | null>(null)
  const [upgradePrompt, setUpgradePrompt] = useState<"publish" | null>(null)
  const [carouselSlides, setCarouselSlides] = useState<CarouselSlidePreview[]>([])
  const [carouselScore, setCarouselScore] = useState<CarouselScore | null>(null)
  const [carouselProjectId, setCarouselProjectId] = useState<string | null>(null)
  const [activeCarouselSlide, setActiveCarouselSlide] = useState(0)
  const [localDraftUsage, setLocalDraftUsage] = useState(0)
  const [pushAttempts, setPushAttempts] = useState(0)
  const [profileTopicSuggestions, setProfileTopicSuggestions] = useState<string[]>([])
  const [visualPrompt, setVisualPrompt] = useState("")
  const [visualPreviewUrl, setVisualPreviewUrl] = useState("")

  // Step flow state variables
  const [selectedHook, setSelectedHook] = useState<string | null>(null)
  const [inlineHookPanelOpen, setInlineHookPanelOpen] = useState(false)
  const [inlineHookSuggestions, setInlineHookSuggestions] = useState<string[]>([])
  const [isImprovingInlineHook, setIsImprovingInlineHook] = useState(false)
  const [showPublishTerms, setShowPublishTerms] = useState(false)
  const [publishTermsAccepted, setPublishTermsAccepted] = useState(false)

  const wordCount = useMemo(() => (content.trim() ? content.trim().split(/\s+/).length : 0), [content])
  const characterCount = content.length
  const resolveTitle = useCallback(() => title.trim() || content.trim().split("\n")[0]?.slice(0, 80) || "Untitled post", [content, title])
  const currentDraftLabel = editingId ? `Editing ${editingId.slice(0, 8)}` : "New draft"
  const publishLabel = user?.linkedinMemberId ? "LinkedIn connected" : "LinkedIn needs connection"
  const isCarouselMode = postType.includes("Carousel")
  const isVisualMode = postType.includes("Visual")
  const generateLabel = postType.includes("Carousel") ? "Generate Carousel Draft" : postType.includes("Visual") ? "Generate Visual Caption" : "Generate hooks"
  const scoreGap = analysis ? Math.max(0, 90 - analysis.overallScore) : 0
  const filteredPosts = useMemo(() => postFilter === "all" ? posts : posts.filter((post) => post.status === postFilter), [postFilter, posts])
  const currentDraftLimit = getEffectivePlanLimits(billing.plan, billing.limits).aiDraftsPerMonth
  const currentMonth = new Date().toISOString().slice(0, 7)
  const currentServerUsed = posts.filter((post) => String(post.updatedAt || "").startsWith(currentMonth)).length
  const currentDraftUsed = Math.max(localDraftUsage, currentServerUsed)
  const draftLimitHit = typeof currentDraftLimit === "number" && currentDraftUsed >= currentDraftLimit
  const noDraftsMessage = "0 drafts left. Upgrade to Solo for 25 more."
  const freePushLimitHit = billing.plan === "Free" && pushAttempts >= 1
  const pushDisabledMessage = draftLimitHit ? noDraftsMessage : freePushLimitHit ? "Free includes 1 Push to 90+ attempt. Upgrade to Solo for more." : null
  const hasProfileContext = Boolean(profile.title || profile.industry || profile.goals.length)
  const canGenerate = Boolean(aiPrompt.trim() || content.trim() || (isCarouselMode && title.trim())) && !draftLimitHit
  const canStartFlow = (isCarouselMode || isVisualMode ? canGenerate : Boolean(aiPrompt.trim() || title.trim() || hasProfileContext)) && !draftLimitHit
  const draftText = content
  const draftHookLine = draftText.split("\n").find((line) => line.trim())?.trim() || ""

  useEffect(() => {
    setLocalDraftUsage(readDraftUsage(workspaceId))
    setPushAttempts(readPushAttempts(workspaceId))
    setPublishTermsAccepted(readPublishTerms(workspaceId))
    const sync = () => setLocalDraftUsage(readDraftUsage(workspaceId))
    window.addEventListener("qalam:draft-usage", sync)
    return () => window.removeEventListener("qalam:draft-usage", sync)
  }, [workspaceId])

  useEffect(() => {
    if (!availablePostTypes.includes(postType)) setPostType(POST_TYPES[0])
  }, [availablePostTypes, postType])

  const applyInlineHook = (hookText: string) => {
    const lines = content.split("\n")
    const firstNonEmpty = lines.findIndex((l) => l.trim())
    if (firstNonEmpty >= 0) {
      lines[firstNonEmpty] = hookText
    } else {
      lines.unshift(hookText)
    }
    setContent(lines.join("\n"))
    setInlineHookPanelOpen(false)
    setStatus("Hook replaced")
  }

  const applyInlineHookAndRegenerate = async (hookText: string) => {
    const prompt = aiPrompt.trim() || title.trim() || resolveTitle()
    applyInlineHook(hookText)
    setIsImprovingInlineHook(true)
    setStatus("Regenerating from selected hook...")
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, postType, title: title.trim(), profile, hook: hookText, previousDraft: content, variation: true }),
      })
      const data = (await res.json().catch(() => ({}))) as GenerateResponse
      if (!res.ok) throw new Error(data.error || "Could not regenerate draft")
      if (!data.text?.trim()) throw new Error("Regeneration returned an empty draft")
      const next = sanitizeGeneratedText(data.text)
      setContent(next)
      setVersions((prev) => [...prev, { content: next, createdAt: new Date().toISOString() }])
      if (data.analysis) setAnalysis(data.analysis)
      setStatus(data.needsPolish ? "Draft regenerated. Push to 90+ if needed." : "Draft regenerated")
    } catch (error) {
      setStatus(cleanErrorMessage((error as Error).message))
    } finally {
      setIsImprovingInlineHook(false)
    }
  }

  const onGenerateHooks = async (topicOverride?: string) => {
    const topic = topicOverride?.trim() || aiPrompt.trim() || title.trim() || content.trim().split("\n")[0]?.trim()
    if (!topic) {
      if (hasProfileContext) {
        setProfileTopicSuggestions(profileTopics(profile))
        setStatus("Pick a topic to start.")
      } else setStatus("Enter a topic first")
      return
    }
    if (!canUseDraftCredit()) return
    setIsGeneratingHooks(true)
    setHookAlternatives([])
    setSelectedHook(null)
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "hooks", content: topic, title: topic, profile }),
      })
      const data = (await res.json().catch(() => ({}))) as { hooks?: string[]; error?: string; usageCost?: number }
      if (!res.ok) throw new Error(data.error || "Could not generate hooks")
      setHookAlternatives((data.hooks || []).slice(0, 5))
      setProfileTopicSuggestions([])
      useDraftCredit(data.usageCost || 1)
    } catch (e) {
      setStatus(cleanErrorMessage((e as Error).message))
    } finally {
      setIsGeneratingHooks(false)
    }
  }

  const onGenerateFromHook = async () => {
    if (!selectedHook) return
    const prompt = aiPrompt.trim() || title.trim()
    if (!prompt) { setStatus("Add a topic first"); return }
    if (!canUseDraftCredit()) return
    setIsGenerating(true)
    setStatus("Generating post from your selected hook...")
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, postType, title: title.trim(), profile, hook: selectedHook }),
      })
      const data = (await res.json().catch(() => ({}))) as GenerateResponse
      if (!res.ok) throw new Error(data.error || "Generation failed")
      const nextContent = String(data.text || "").trim()
      if (!nextContent) throw new Error("AI returned an empty draft")
      const cleanContent = sanitizeGeneratedText(nextContent)
      setContent(cleanContent)
      setVersions((prev) => [...prev, { content: cleanContent, createdAt: new Date().toISOString() }])
      useDraftCredit(data.usageCost || 1)
      if (data.analysis) setAnalysis(data.analysis)
      setStatus(data.metTarget ? "Draft ready at 90+ quality." : "Draft ready. One more quality pass is available.")
    } catch (error) {
      setStatus(cleanErrorMessage((error as Error).message))
    } finally {
      setIsGenerating(false)
    }
  }

  const onImproveHookInline = async () => {
    if (!content.trim()) return
    if (!canUseDraftCredit()) return
    if (!canUsePushAttempt()) return
    setIsImprovingInlineHook(true)
    setInlineHookPanelOpen(true)
    setInlineHookSuggestions([])
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "hooks", content, title: resolveTitle(), profile }),
      })
      const data = (await res.json().catch(() => ({}))) as { hooks?: string[]; error?: string; usageCost?: number }
      if (!res.ok) throw new Error(data.error || "Could not generate hooks")
      setInlineHookSuggestions((data.hooks || []).slice(0, 3))
      useDraftCredit(data.usageCost || 1)
    } catch (e) {
      setStatus(cleanErrorMessage((e as Error).message))
      setInlineHookPanelOpen(false)
    } finally {
      setIsImprovingInlineHook(false)
    }
  }

  const createCarousel = async (postId: string) => {
    const res = await fetch(withWorkspaceKey("/api/carousel", workspaceId), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postId, title: resolveTitle(), content, workspaceKey: workspaceId }),
    })
    return res.json().catch(() => ({}))
  }

  const canUseDraftCredit = () => {
    if (!draftLimitHit) return true
    setStatus(noDraftsMessage)
    window.dispatchEvent(new CustomEvent("qalam:draft-limit-hit"))
    return false
  }

  const useDraftCredit = (count = 1) => {
    for (let i = 0; i < count; i += 1) incrementDraftUsage(workspaceId)
    setLocalDraftUsage(readDraftUsage(workspaceId))
  }

  const canUsePushAttempt = () => {
    if (!pushDisabledMessage) return true
    setStatus(pushDisabledMessage)
    if (draftLimitHit) window.dispatchEvent(new CustomEvent("qalam:draft-limit-hit"))
    return false
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
    const invalidSchedule = scheduleError(scheduleDate, scheduleTime)
    if (invalidSchedule) { setStatus(invalidSchedule); return }
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
    setShowPublishTerms(false)
    setPublish({
      status: "success",
      message: "Opened LinkedIn composer. Client only needs to review and click Post there.",
      postUrn: null,
    })
  }

  const onPublish = async (forceAccepted = false) => {
    if (!content.trim()) { setPublish({ status: "error", message: "Write content first", postUrn: null }); return }
    if (!forceAccepted && !publishTermsAccepted) {
      setShowPublishTerms(true)
      return
    }
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

  const acceptTermsAndPublish = () => {
    localStorage.setItem(termsKey(workspaceId), "accepted")
    setPublishTermsAccepted(true)
    setShowPublishTerms(false)
    void onPublish(true)
  }

  const onGenerate = async () => {
    const prompt = aiPrompt.trim() || title.trim()
    if (!prompt) { setStatus("Add a prompt first"); return }
    setIsGenerating(true)
    setStatus(isCarouselMode ? "Generating carousel outline..." : "Generating post via AI...")
    try {
      if (isCarouselMode) {
        const res = await fetch(withWorkspaceKey("/api/carousel", workspaceId), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: title.trim() || prompt.slice(0, 80), content: prompt, workspaceKey: workspaceId }),
        })
        const data = (await res.json().catch(() => ({}))) as CarouselResponse
        if (!res.ok) throw new Error(data.error || "Carousel generation failed")
        const slides = data.slides || []
        if (!slides.length) throw new Error("AI returned an empty carousel")
        setCarouselSlides(slides)
        setCarouselScore(data.score || null)
        setCarouselProjectId(data.projectId || null)
        setActiveCarouselSlide(0)
        setContent("")
        setAnalysis(null)
        useDraftCredit()
        setStatus(data.score ? `Carousel outline ready at ${data.score.overallScore}/100.` : "Carousel outline ready.")
        return
      }
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, postType, title: title.trim(), profile }),
      })
      const data = (await res.json().catch(() => ({}))) as GenerateResponse
      if (!res.ok) throw new Error(data.error || "Generation failed")
      const nextContent = String(data.text || "").trim()
      if (!nextContent) throw new Error("AI returned an empty draft")
      const cleanContent = sanitizeGeneratedText(nextContent)
      setContent(cleanContent)
      setVersions((prev) => [...prev, { content: cleanContent, createdAt: new Date().toISOString() }])
      useDraftCredit(data.usageCost || 1)
      if (data.analysis) setAnalysis(data.analysis)
      if (data.visual?.imagePrompt) setVisualPrompt(data.visual.imagePrompt)
      setStatus(isVisualMode ? "Visual caption ready" : data.metTarget ? "Draft ready at 90+ quality." : "Draft ready. One more quality pass is available.")
    } catch (error) {
      setStatus(cleanErrorMessage((error as Error).message))
    } finally {
      setIsGenerating(false)
    }
  }

  const onPushToNinety = async () => {
    if (!content.trim()) { setStatus("Write a draft first"); return }
    if (!canUseDraftCredit()) return
    if (!canUsePushAttempt()) return
    setIsRepairingDraft(true)
    setStatus("Improving draft toward 90+...")
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "repair",
          prompt: aiPrompt.trim() || title.trim() || resolveTitle(),
          title: title.trim(),
          content,
          postType,
          profile,
        }),
      })
      const data = (await res.json().catch(() => ({}))) as GenerateResponse
      if (!res.ok) throw new Error(data.error || "Could not improve draft")
      if (!data.text?.trim()) throw new Error("Repair returned an empty draft")
      setContent(sanitizeGeneratedText(data.text))
      useDraftCredit(data.usageCost || 1)
      setPushAttempts(incrementPushAttempts(workspaceId))
      if (data.analysis) setAnalysis(data.analysis)
      setStatus(data.metTarget ? "Draft improved to 90+ quality." : "Draft improved. Review the remaining weak dimensions.")
    } catch (error) {
      setStatus(cleanErrorMessage((error as Error).message))
    } finally {
      setIsRepairingDraft(false)
    }
  }

  const onLoadPost = (postId: string) => {
    const post = posts.find((item) => item.id === postId)
    if (!post) return
    setEditingId(post.id)
    setTitle(post.title)
    setContent(post.content)
    setVersions([])
    setPostType(post.type)
    setScheduleDate(post.scheduledTime?.split("T")[0] || (/^\d{4}-\d{2}-\d{2}$/.test(post.date) ? post.date : ""))
    setScheduleTime(post.scheduledTime?.split("T")[1]?.slice(0, 5) || "09:00")
    setPublish({ status: "idle", message: "", postUrn: post.externalPostUrn })
    setStatus(`Loaded ${post.status} post`)
  }

  const onRewriteCta = async () => {
    if (!content.trim()) { setStatus("Write a draft first"); return }
    if (!canUseDraftCredit()) return
    setIsRewritingCta(true)
    setStatus("Rewriting CTA...")
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "repair",
          prompt: "Rewrite only the CTA or final paragraph. Keep the rest of the post as unchanged as possible.",
          title: title.trim(),
          content,
          postType,
          profile,
        }),
      })
      const data = (await res.json().catch(() => ({}))) as GenerateResponse
      if (!res.ok) throw new Error(data.error || "Could not rewrite CTA")
      if (!data.text?.trim()) throw new Error("CTA rewrite returned an empty draft")
      setContent(sanitizeGeneratedText(data.text))
      useDraftCredit(data.usageCost || 1)
      if (data.analysis) setAnalysis(data.analysis)
      setStatus("CTA rewritten")
    } catch (error) {
      setStatus(cleanErrorMessage((error as Error).message))
    } finally {
      setIsRewritingCta(false)
    }
  }

  const onGenerateReplies = async () => {
    const comments = commentsText.trim()
    if (!comments) { setStatus("Add comments first"); return }
    setIsGeneratingReplies(true)
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "comment-replies",
          originalPost: originalPostText || content,
          comments,
          profile,
        }),
      })
      const data = (await res.json().catch(() => ({}))) as { replies?: RichReply[]; error?: string }
      if (!res.ok) throw new Error(data.error || "Reply generation failed")
      setRichReplies(data.replies || [])
    } catch (e) {
      setStatus(cleanErrorMessage((e as Error).message))
    } finally {
      setIsGeneratingReplies(false)
    }
  }

  const onSendForApproval = async () => {
    if (!content.trim()) { setStatus("Write content first"); return }
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
    <>
    <div className="mx-auto grid max-w-[1200px] grid-cols-1 gap-6 px-6 py-8 lg:grid-cols-[minmax(0,1fr)_340px]">
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
                {availablePostTypes.map((type) => <option key={type} value={type}>{type}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={onSaveDraft} className="cursor-pointer rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 transition-colors hover:bg-zinc-50 hover:border-zinc-400">Save draft</button>
              {!postType.includes("Carousel") && !postType.includes("Visual") ? (
                <button onClick={onPushToNinety} disabled={isRepairingDraft || Boolean(pushDisabledMessage) || !content.trim() || Boolean(analysis && analysis.overallScore >= 90)} className="cursor-pointer rounded-lg border border-teal/25 bg-teal/8 px-3 py-1.5 text-xs font-bold text-teal transition-colors hover:bg-teal/12 disabled:opacity-45">
                  {pushDisabledMessage || (isRepairingDraft ? "Improving..." : analysis?.overallScore && analysis.overallScore >= 90 ? "90+ ready" : "Push to 90+ (uses 1 draft)")}
                </button>
              ) : null}
              {isClientWorkspace && (
                <LockedFeature feature="Approval workflow" requiredPlan="Pro" className="inline-block rounded-lg">
                  <button onClick={onSendForApproval} className="cursor-pointer rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800 transition-colors hover:bg-amber-100">Send for approval</button>
                </LockedFeature>
              )}
              {canPublish
                ? <button onClick={() => void onPublish()} disabled={publish.status === "loading"} className="cursor-pointer rounded-lg bg-teal px-4 py-1.5 text-xs font-bold text-white shadow-sm transition-colors hover:bg-teal-600 disabled:opacity-60">{publish.status === "loading" ? "Publishing..." : "Publish"}</button>
                : <button onClick={() => setUpgradePrompt("publish")} className="cursor-pointer rounded-lg bg-teal px-4 py-1.5 text-xs font-bold text-white shadow-sm transition-colors hover:bg-teal-600">Unlock in Solo</button>
              }
            </div>
          </div>
        </div>

        <div className="p-6">
          {/* Title + topic prompt */}
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Working title (optional)" className="mb-3 w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-4 py-2.5 text-sm font-medium text-zinc-900 outline-none transition-all focus:border-teal focus:bg-white focus:ring-4 focus:ring-teal/10" />
          <div className="mb-5">
            <div className="flex flex-col gap-2 sm:flex-row">
            <input
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder={isCarouselMode ? "Topic for carousel slides..." : "Topic, angle, or instruction..."}
              className="flex-1 rounded-xl border border-teal/25 bg-teal/[0.03] px-4 py-2.5 text-sm text-zinc-900 outline-none transition-all focus:border-teal focus:ring-4 focus:ring-teal/10"
              onKeyDown={(e) => {
                if (e.key !== "Enter") return
                if (isCarouselMode || isVisualMode) { if (!isGenerating && canStartFlow) onGenerate() }
                else { if (!isGeneratingHooks && canStartFlow) void onGenerateHooks() }
              }}
            />
            <div className="flex flex-col items-stretch sm:items-end">
              <button
                onClick={() => isCarouselMode || isVisualMode ? void onGenerate() : void onGenerateHooks()}
                disabled={isGenerating || isGeneratingHooks || !canStartFlow}
                className="cursor-pointer whitespace-nowrap rounded-xl bg-teal/10 px-5 py-2.5 text-sm font-bold text-teal transition-colors hover:bg-teal/20 disabled:opacity-50"
              >
                {isGenerating || isGeneratingHooks ? "Generating..." : draftLimitHit ? "Upgrade to Solo" : generateLabel}
              </button>
            </div>
            </div>
            {profileTopicSuggestions.length ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {profileTopicSuggestions.map((topic) => (
                  <button
                    key={topic}
                    onClick={() => { setAiPrompt(topic); setProfileTopicSuggestions([]); void onGenerateHooks(topic) }}
                    className="cursor-pointer rounded-full border border-teal/20 bg-teal/5 px-3 py-1.5 text-xs font-semibold text-teal transition-colors hover:bg-teal/10"
                  >
                    {topic}
                  </button>
                ))}
              </div>
            ) : null}
            <DraftCounter compact className="mt-2" />
          </div>

          {isCarouselMode ? (
            <CarouselPreview
              activeIndex={activeCarouselSlide}
              projectId={carouselProjectId}
              score={carouselScore}
              slides={carouselSlides}
              onBuild={(projectId) => router.push(withClientParam(`/carousels/${projectId}`, activeClientId))}
              onSelect={setActiveCarouselSlide}
            />
          ) : isVisualMode ? (
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50/60 p-5">
              <div className="grid gap-5 lg:grid-cols-[1fr_280px]">
                <div className="rounded-2xl border border-zinc-200 bg-white p-5">
                  <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">Visual caption</p>
                  <textarea value={content} onChange={(e) => setContent(e.target.value)} maxLength={150} placeholder="Generate a short visual caption..." className="mt-3 min-h-[140px] w-full resize-none rounded-xl border border-zinc-200 px-4 py-3 text-sm leading-relaxed text-zinc-900 outline-none focus:border-teal focus:ring-4 focus:ring-teal/10" />
                  <p className="mt-2 text-right text-xs text-zinc-400">{content.length}/150</p>
                  <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Image prompt</p>
                    <p className="mt-2 text-sm leading-relaxed text-zinc-700">{visualPrompt || "Generate a visual caption to get an image direction."}</p>
                  </div>
                </div>
                <div className="rounded-2xl border border-zinc-200 bg-white p-5">
                  <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">Upload visual</p>
                  <label className="mt-3 flex min-h-[220px] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border border-dashed border-zinc-300 bg-zinc-50 text-center text-sm text-zinc-500">
                    {visualPreviewUrl ? <img src={visualPreviewUrl} alt="Visual preview" className="h-full max-h-[260px] w-full object-cover" /> : <span>Upload image preview</span>}
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) setVisualPreviewUrl(URL.createObjectURL(file))
                    }} />
                  </label>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Hook selection row */}
              {(hookAlternatives.length > 0 || isGeneratingHooks) && (
                <div className="mb-6 rounded-2xl border border-zinc-200 bg-zinc-50/50 p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <h2 className="text-sm font-bold text-zinc-900">Choose your opening hook</h2>
                      <p className="mt-0.5 text-xs text-zinc-500">
                        {selectedHook ? "Hook selected - generate your full post below" : "Click a hook to select it, then generate your post"}
                      </p>
                    </div>
                    <button
                      onClick={() => void onGenerateHooks()}
                      disabled={isGeneratingHooks || (!aiPrompt.trim() && !title.trim() && !content.trim())}
                      className="cursor-pointer rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-600 transition-colors hover:border-zinc-300 hover:bg-zinc-50 disabled:opacity-50"
                    >
                      {isGeneratingHooks ? "..." : "Regenerate"}
                    </button>
                  </div>

                  {isGeneratingHooks ? (
                    <div className="flex gap-3 overflow-x-auto pb-2 sm:grid sm:grid-cols-2 sm:overflow-visible sm:pb-0 lg:grid-cols-5">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="h-36 w-64 shrink-0 animate-pulse rounded-2xl bg-zinc-200/60 sm:w-auto" />
                      ))}
                    </div>
                  ) : (
                    <div className="flex gap-3 overflow-x-auto pb-2 sm:grid sm:grid-cols-2 sm:overflow-visible sm:pb-0 lg:grid-cols-5">
                      {hookAlternatives.slice(0, 5).map((hook) => (
                        <HookCard
                          key={hook}
                          hook={hook}
                          selected={selectedHook === hook}
                          onSelect={() => setSelectedHook(selectedHook === hook ? null : hook)}
                        />
                      ))}
                    </div>
                  )}

                  <div className="mt-4">
                    <button
                      onClick={() => void onGenerateFromHook()}
                      disabled={!selectedHook || isGenerating || draftLimitHit}
                      className="w-full cursor-pointer rounded-xl bg-teal py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-teal-600 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {isGenerating ? "Generating post..." : draftLimitHit ? "Upgrade to Solo for more drafts" : "Generate full post from this hook"}
                    </button>
                  </div>
                </div>
              )}

              {/* Draft view */}
              {draftText.trim() && (
                <>
                  {/* Score cards */}
                  <div className="mb-5 grid gap-3 sm:grid-cols-3">
                    <MetricCard label="Content score" value={analysis ? `${analysis.overallScore}/100` : "--"} note={draftLimitHit ? noDraftsMessage : analysis ? (analysis.overallScore >= 90 ? "Copy-paste ready" : `${scoreGap} points short of 90`) : "Waiting for draft"} accent="teal" action={analysis && analysis.overallScore < 90 && !postType.includes("Carousel") && !postType.includes("Visual") ? { label: draftLimitHit ? noDraftsMessage : "Push to 90+ (uses 1 draft)", onClick: onPushToNinety, loading: isRepairingDraft, disabled: draftLimitHit } : undefined} />
                    <MetricCard
                      label="Hook type"
                      value={analysis?.hookType || "--"}
                      note={analysis ? (analysis.scores[0]?.note || "First line") : "First line analysis"}
                      accent="amber"
                    />
                    <MetricCard label="Voice fit" value={analysis ? `${analysis.scores.find((item) => item.label === "Voice fit")?.score ?? 0}/100` : "--"} note={profile.name || profile.title ? "Using saved profile" : "Add voice profile for better fit"} accent="zinc" />
                  </div>

                  {/* Post textarea */}
                  <div className="relative w-full overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition-all focus-within:border-teal/40 focus-within:ring-4 focus-within:ring-teal/10">
                    <div className="border-b border-zinc-100 bg-zinc-50/60 px-5 py-4">
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm font-semibold leading-relaxed text-zinc-900">{draftHookLine || "Hook line"}</p>
                        <button onClick={() => { if (inlineHookPanelOpen) { setInlineHookPanelOpen(false) } else { void onImproveHookInline() } }} disabled={Boolean(pushDisabledMessage)} className="shrink-0 cursor-pointer rounded-lg border border-teal/25 bg-teal/8 px-3 py-1.5 text-xs font-bold text-teal transition-colors hover:bg-teal/15 disabled:cursor-not-allowed disabled:opacity-45">
                          {pushDisabledMessage || (inlineHookPanelOpen ? "Close" : "Improve hook (uses 1 draft)")}
                        </button>
                      </div>
                      <div className={`overflow-hidden transition-all duration-200 ${inlineHookPanelOpen ? "mt-3 max-h-96 opacity-100" : "max-h-0 opacity-0"}`}>
                        <div className="rounded-xl border border-zinc-200 bg-white">
                          {isImprovingInlineHook ? (
                            <div className="px-4 py-5 text-sm text-zinc-500">Generating stronger hook alternatives...</div>
                          ) : inlineHookSuggestions.length ? (
                            inlineHookSuggestions.map((hook) => (
                              <div key={hook} className="flex cursor-pointer items-start gap-4 border-b border-zinc-100 px-4 py-3.5 last:border-b-0 hover:bg-zinc-50" onClick={() => void applyInlineHookAndRegenerate(hook)}>
                                <div className="flex-1">
                                  <p className="text-sm font-semibold leading-relaxed text-zinc-900">{hook}</p>
                                  <p className="mt-1 text-xs leading-relaxed text-zinc-500">{[hook, ...content.split("\n").filter((line) => line.trim()).slice(1, 2)].join(" ")}</p>
                                </div>
                                <button onClick={(e) => { e.stopPropagation(); void applyInlineHookAndRegenerate(hook) }} disabled={isImprovingInlineHook} className="cursor-pointer shrink-0 rounded-lg bg-teal px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-teal-600 disabled:opacity-50">Use</button>
                              </div>
                            ))
                          ) : (
                            <p className="px-4 py-5 text-sm text-zinc-400">No alternatives generated. Try again.</p>
                          )}
                        </div>
                      </div>
                    </div>
                    <textarea value={draftText} onChange={(e) => { setContent(e.target.value); e.target.style.height = "auto"; e.target.style.height = `${e.target.scrollHeight}px` }} placeholder="Write your post here, or generate one above..." className="min-h-[400px] w-full resize-none bg-transparent px-5 py-5 text-base leading-[1.8] text-zinc-900 outline-none" style={{ overflow: "hidden" }} />
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
                            const scoreColor = item.score >= 68 ? "text-teal" : item.score >= 52 ? "text-amber-600" : "text-red-500"
                            const isHook = item.label === "Hook" || item.label === "Hook strength"
                            return (
                              <div key={item.label} className="rounded-xl border border-zinc-200 bg-white p-3">
                                <div className="mb-1.5 flex items-center justify-between gap-2">
                                  <span className="text-[11px] font-bold uppercase tracking-wide text-zinc-500">{item.label}</span>
                                  <div className="flex items-center gap-2">
                                    {isHook && item.score < 70 && (
                                      <button onClick={() => void onGenerateHooks()} disabled={isGeneratingHooks || (!aiPrompt.trim() && !title.trim() && !content.trim())} className="cursor-pointer rounded-full border border-teal/25 bg-teal/8 px-2.5 py-0.5 text-[10px] font-bold text-teal transition-colors hover:bg-teal/15 disabled:opacity-50">
                                        {isGeneratingHooks ? "..." : "Suggest hooks"}
                                      </button>
                                    )}
                                    <span className={`text-sm font-bold ${scoreColor}`}>{item.score}</span>
                                  </div>
                                </div>
                                <div className="h-1.5 rounded-full bg-zinc-100">
                                  <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${item.score}%` }} />
                                </div>
                                <p className="mt-1.5 text-[11px] leading-snug text-zinc-500">{item.note}</p>
                                {item.actionHint && item.label !== "Hook" && (
                                  <p className="mt-1.5 rounded-lg bg-zinc-50 px-2.5 py-1.5 text-[10px] font-medium text-zinc-500">{item.actionHint}</p>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )}
                      {analysis && analysis.overallScore < 90 && !postType.includes("Carousel") && !postType.includes("Visual") ? (
                        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-xs text-amber-800">
                          <p className="font-bold">Quality gate not met yet</p>
                          <p className="mt-1 leading-relaxed">This draft is {scoreGap} points short of the 90+ copy-ready target. Run another quality pass or regenerate from the same prompt.</p>
                        </div>
                      ) : null}
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
                      {/* Hashtags */}
                      <div className="rounded-2xl border border-zinc-200 bg-white p-4">
                        <div className="mb-3 flex items-center justify-between">
                          <h2 className="text-sm font-semibold text-zinc-900">Hashtags</h2>
                          {(analysis?.hashtags || []).length > 0 && (
                            <button onClick={() => copyText((analysis?.hashtags || []).join(" "))} className="cursor-pointer text-xs font-semibold text-teal transition-colors hover:text-teal-700">Copy all</button>
                          )}
                        </div>
                        {(analysis?.hashtags || []).length ? (
                          <div className="flex flex-wrap gap-1.5">
                            {analysis!.hashtags.map((tag) => (
                              <button key={tag} onClick={() => copyText(tag)} className="cursor-pointer rounded-full border border-teal/20 bg-teal/5 px-2.5 py-1 text-xs font-medium text-teal transition-colors hover:bg-teal/10">
                                {tag}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-zinc-400">Write more to generate real hashtags.</p>
                        )}
                      </div>

                      {/* Comment replies */}
                      <div className="rounded-2xl border border-zinc-200 bg-white">
                        <button onClick={() => setReplyPanelOpen((v) => !v)} className="flex w-full cursor-pointer items-center justify-between px-4 py-3.5 text-left">
                          <div>
                            <h2 className="text-sm font-semibold text-zinc-900">Comment replies</h2>
                            {richReplies.length > 0 && <p className="mt-0.5 text-[10px] text-zinc-400">{Math.ceil(richReplies.length / 3)} comment{Math.ceil(richReplies.length / 3) !== 1 ? "s" : ""} covered</p>}
                          </div>
                          <span className="text-xs text-zinc-400">{replyPanelOpen ? "Hide" : "Show"}</span>
                        </button>

                        {replyPanelOpen && (
                          <div className="border-t border-zinc-100 p-4">
                            <div className="mb-3 space-y-3">
                              <div>
                                <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-zinc-400">Your post (optional, adds context)</label>
                                <textarea value={originalPostText} onChange={(e) => setOriginalPostText(e.target.value)} rows={3} placeholder="Paste the post you published (optional, helps replies feel more grounded)..." className="w-full resize-none rounded-xl border border-zinc-200 bg-zinc-50/50 px-3 py-2.5 text-xs text-zinc-900 outline-none transition-all focus:border-teal focus:bg-white focus:ring-4 focus:ring-teal/10" />
                              </div>
                              <div>
                                <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-zinc-400">Comments to reply to</label>
                                <textarea value={commentsText} onChange={(e) => setCommentsText(e.target.value)} rows={4} placeholder={"Paste comments here, one per line.\nExample:\nThis is exactly what I needed to hear.\nHow do you handle pushback from senior leadership?"} className="w-full resize-none rounded-xl border border-zinc-200 bg-zinc-50/50 px-3 py-2.5 text-xs text-zinc-900 outline-none transition-all focus:border-teal focus:bg-white focus:ring-4 focus:ring-teal/10" />
                              </div>
                              <div className="flex items-center gap-2">
                                <button onClick={onGenerateReplies} disabled={isGeneratingReplies || !commentsText.trim()} className="cursor-pointer flex-1 rounded-xl bg-teal px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-teal-600 disabled:opacity-50">
                                  {isGeneratingReplies ? "Generating replies..." : "Generate replies"}
                                </button>
                                {richReplies.length > 0 && (
                                  <button onClick={() => { setRichReplies([]); setCommentsText(""); setOriginalPostText("") }} className="cursor-pointer rounded-xl border border-zinc-200 px-3 py-2.5 text-xs font-semibold text-zinc-500 hover:bg-zinc-50">Clear</button>
                                )}
                              </div>
                            </div>

                            {richReplies.length > 0 && (
                              <div className="mt-4 space-y-4">
                                {Array.from(new Set(richReplies.map((r) => r.comment))).map((comment) => {
                                  const replies = richReplies.filter((r) => r.comment === comment)
                                  return (
                                    <div key={comment} className="overflow-hidden rounded-xl border border-zinc-100 bg-zinc-50">
                                      <div className="border-b border-zinc-100 bg-white px-3 py-2.5">
                                        <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-400">Comment</p>
                                        <p className="mt-1 text-xs leading-relaxed text-zinc-600">{comment}</p>
                                      </div>
                                      <div className="divide-y divide-zinc-100">
                                        {replies.map((r) => {
                                          const styleColor = r.style === "Thoughtful" ? "text-blue-700 bg-blue-50 border-blue-100" : r.style === "Warm" ? "text-emerald-700 bg-emerald-50 border-emerald-100" : r.style === "Sharp" ? "text-red-600 bg-red-50 border-red-100" : "text-zinc-600 bg-zinc-100 border-zinc-200"
                                          return (
                                            <div key={r.style} className="flex items-start gap-3 px-3 py-2.5">
                                              <span className={`mt-0.5 shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${styleColor}`}>{r.style}</span>
                                              <p className="flex-1 text-xs leading-relaxed text-zinc-900">{r.reply}</p>
                                              <button onClick={() => copyText(r.reply)} className="cursor-pointer shrink-0 text-[10px] font-bold text-teal transition-colors hover:text-teal-700">Copy</button>
                                            </div>
                                          )
                                        })}
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            )}
                            {!richReplies.length && !isGeneratingReplies && (
                              <p className="mt-2 text-xs text-zinc-400">Paste one or more comments above and tap Generate replies. Each comment gets 3 styles: Thoughtful, Warm, and Sharp.</p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Schedule bar */}
                  <div className="mt-5 flex flex-col items-stretch gap-3 overflow-hidden rounded-2xl border border-zinc-200 bg-gradient-to-r from-zinc-50/80 to-white p-4 shadow-sm sm:flex-row sm:items-center">
                    <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
                      <div className="relative flex-1">
                        <label className="absolute -top-2.5 left-3 inline-block bg-white px-1 text-[9px] font-bold uppercase tracking-wider text-teal">Publish Date</label>
                        <input type="date" min={todayInput()} value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)} className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm text-zinc-900 shadow-sm transition-all focus:border-teal focus:outline-none focus:ring-4 focus:ring-teal/10" />
                      </div>
                      <div className="relative sm:w-36">
                        <label className="absolute -top-2.5 left-3 inline-block bg-white px-1 text-[9px] font-bold uppercase tracking-wider text-teal">Time</label>
                        <input type="time" min={scheduleDate === todayInput() ? nowTimeInput() : undefined} value={scheduleTime} onChange={(e) => setScheduleTime(e.target.value)} className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm text-zinc-900 shadow-sm transition-all focus:border-teal focus:outline-none focus:ring-4 focus:ring-teal/10" />
                      </div>
                    </div>
                    <LockedFeature feature="Scheduling" requiredPlan="Solo" className="sm:w-auto">
                      <button onClick={onSchedule} className="cursor-pointer rounded-xl bg-zinc-900 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-zinc-800">Schedule Post</button>
                    </LockedFeature>
                  </div>
                </>
              )}
            </>
          )}

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
            <button onClick={() => router.push(withClientParam("/library", activeClientId))} className="cursor-pointer text-xs font-semibold text-teal transition-colors hover:text-teal-700">Library</button>
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

        {/* Quick actions */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-4">
          <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-zinc-500">Publish flow</h2>
          <div className="space-y-2">
            {[
              { label: "Save draft", desc: "Stores to workspace", onClick: onSaveDraft, disabled: !content.trim() },
              { label: "Schedule", desc: "Adds to planner", onClick: onSchedule, disabled: !content.trim() },
              { label: "Publish now", desc: "LinkedIn or handoff", onClick: () => void onPublish(), disabled: !content.trim() },
              { label: "Approvals", desc: "Client workspaces", onClick: onSendForApproval, disabled: !isClientWorkspace || !content.trim() },
            ].map((item) => (
              <button key={item.label} onClick={item.onClick} disabled={item.disabled} className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl border border-zinc-200 px-3 py-2.5 text-left transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-45">
                <div>
                  <span className="text-xs font-semibold text-zinc-800">{item.label}</span>
                  <span className="ml-1 text-xs text-zinc-500">{item.desc}</span>
                </div>
                <span className="text-xs font-bold text-teal">&gt;</span>
              </button>
            ))}
          </div>
        </div>
      </aside>
    </div>
    {showPublishTerms ? (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/40 px-4">
        <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-5 shadow-xl">
          <h2 className="text-lg font-bold text-zinc-900">Confirm LinkedIn publish</h2>
          <p className="mt-2 text-sm leading-relaxed text-zinc-600">You are responsible for reviewing this post before it goes live. Qalam will publish exactly what is in the editor.</p>
          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            <button onClick={openLinkedInComposer} className="cursor-pointer rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50">Open composer</button>
            <button onClick={acceptTermsAndPublish} className="cursor-pointer rounded-xl bg-teal px-4 py-2.5 text-sm font-bold text-white hover:bg-teal-600">Accept and publish</button>
          </div>
          <button onClick={() => setShowPublishTerms(false)} className="mt-3 w-full cursor-pointer text-xs font-semibold text-zinc-400 hover:text-zinc-600">Cancel</button>
        </div>
      </div>
    ) : null}
    {upgradePrompt ? <UpgradeModal currentPlan={billing.plan} requiredPlan="Solo" reason="linkedin publish locked" onClose={() => setUpgradePrompt(null)} /> : null}
    </>
  )
}

function CarouselPreview({ activeIndex, projectId, score, slides, onBuild, onSelect }: {
  activeIndex: number
  projectId: string | null
  score: CarouselScore | null
  slides: CarouselSlidePreview[]
  onBuild: (projectId: string) => void
  onSelect: (index: number) => void
}) {
  const activeSlide = slides[activeIndex] || slides[0]
  return (
    <div className="rounded-2xl border border-zinc-200 bg-zinc-50/70 p-4">
      {score ? (
        <div className="mb-4 grid gap-3 sm:grid-cols-4">
          <MetricCard label="Hook slide" value={`${score.hookSlideScore}/100`} note="Slide 1 scroll-stop" accent="teal" />
          <MetricCard label="Flow" value={`${score.flowScore}/100`} note="Story progression" accent="amber" />
          <MetricCard label="CTA slide" value={`${score.ctaSlideScore}/100`} note="Final action" accent="zinc" />
          <MetricCard label="Overall" value={`${score.overallScore}/100`} note={score.overallScore >= 85 ? "Quality gate passed" : "Needs another pass"} accent="teal" />
        </div>
      ) : null}

      {activeSlide ? (
        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-zinc-100 bg-white px-5 py-3">
            <span className="text-xs font-bold uppercase tracking-wider text-teal">Slide {activeIndex + 1} of {slides.length}</span>
            <div className="flex gap-1.5">
              {slides.map((_, index) => (
                <button
                  key={index}
                  aria-label={`Show slide ${index + 1}`}
                  onClick={() => onSelect(index)}
                  className={`h-2.5 w-2.5 cursor-pointer rounded-full transition-colors ${index === activeIndex ? "bg-teal" : "bg-zinc-200 hover:bg-zinc-300"}`}
                />
              ))}
            </div>
          </div>
          <div className="grid min-h-[360px] gap-5 p-5 md:grid-cols-[minmax(0,1fr)_260px]">
            <div className="flex min-h-[300px] flex-col justify-between rounded-xl border border-zinc-200 bg-zinc-900 p-6 text-white">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-teal-200">LinkedIn carousel</p>
                <h2 className="mt-4 text-3xl font-bold leading-tight">{activeSlide.title}</h2>
                <p className="mt-5 text-lg leading-relaxed text-zinc-100">{activeSlide.body || activeSlide.content}</p>
              </div>
              <p className="mt-8 text-sm text-zinc-400">Qalam draft preview</p>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Visual suggestion</p>
              <p className="mt-3 text-sm leading-relaxed text-zinc-700">{activeSlide.visualDirection || "Simple supporting visual"}</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-white px-5 py-16 text-center">
          <p className="text-sm font-semibold text-zinc-700">No carousel generated yet</p>
          <p className="mt-1 text-xs text-zinc-400">Add a topic and generate a 5-7 slide outline.</p>
        </div>
      )}

      <button
        onClick={() => projectId && onBuild(projectId)}
        disabled={!projectId}
        className="mt-4 w-full cursor-pointer rounded-xl bg-teal px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-teal-600 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Build slides
      </button>
    </div>
  )
}

function MetricCard({ label, value, note, accent, action }: {
  label: string
  value: string
  note: string
  accent: "teal" | "amber" | "zinc"
  action?: { label: string; onClick: () => void; loading?: boolean; disabled?: boolean }
}) {
  const leftBorder = accent === "amber" ? "border-l-amber-400" : accent === "zinc" ? "border-l-zinc-300" : "border-l-teal"
  const valueColor = accent === "amber" ? "text-amber-700" : accent === "zinc" ? "text-zinc-700" : "text-teal"
  return (
    <div className={`rounded-2xl border border-zinc-200 border-l-[3px] bg-white p-4 ${leftBorder}`}>
      <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">{label}</p>
      <p className={`mt-2 text-xl font-bold ${valueColor}`}>{value}</p>
      <p className="mt-1 text-[11px] leading-snug text-zinc-500">{note}</p>
      {action && (
        <button onClick={action.onClick} disabled={action.loading || action.disabled} className="mt-2 cursor-pointer rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[10px] font-bold text-amber-700 transition-colors hover:bg-amber-100 disabled:opacity-50">
          {action.loading ? "..." : action.label}
        </button>
      )}
    </div>
  )
}
