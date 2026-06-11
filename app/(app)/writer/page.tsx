"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useSearchParams } from "next/navigation"
import { useWorkspace } from "@/components/providers/WorkspaceProvider"
import { sanitizeGeneratedText } from "@/lib/content-guard"
import { canAccessPlan, getEffectivePlanLimits } from "@/lib/entitlements"
import { DraftCounter, incrementDraftUsage, readDraftUsage } from "@/components/DraftCounter"
import { LockedFeature } from "@/components/LockedFeature"
import { UpgradeModal } from "@/components/UpgradeModal"
import { HookCard } from "@/components/writer/HookCard"

// ─── Types ───────────────────────────────────────────────────────────────────

type Role = "HR" | "Marketing" | "Founder" | "Consultant" | "Sales" | "Tech" | "Other"
type FormatKey = "Short" | "Medium" | "Long" | "Carousel"
type HookStyle = "SHARP" | "AUTHORITY" | "STORY" | "CURIOSITY" | "DIRECT"
type HookItem = { style: HookStyle; text: string }
type SlideItem = { number: number; title: string; body: string; visual_suggestion: string }
type ScoreData = {
  hook: number
  readability: number
  authority: number
  specificity: number
  cta: number
  human: number
  voiceFit: number
  overall: number
  tips: Record<string, string>
  hashtags: string[]
}
type DraftVersion = { content: string; timestamp: string }
type StatusMsg = { text: string; type: "info" | "error" | "success" }

// ─── Constants ────────────────────────────────────────────────────────────────

const ROLES: Role[] = ["HR", "Marketing", "Founder", "Consultant", "Sales", "Tech", "Other"]

const FORMATS: { key: FormatKey; words: string }[] = [
  { key: "Short", words: "150-200w" },
  { key: "Medium", words: "250-350w" },
  { key: "Long", words: "400-500w" },
  { key: "Carousel", words: "5-7 slides" },
]

const SCORE_LABELS: Array<{ key: keyof Omit<ScoreData, "overall" | "tips" | "hashtags">; label: string }> = [
  { key: "hook", label: "Hook" },
  { key: "readability", label: "Readability" },
  { key: "authority", label: "Authority" },
  { key: "specificity", label: "Specificity" },
  { key: "cta", label: "CTA" },
  { key: "human", label: "Human-likeness" },
  { key: "voiceFit", label: "Voice Fit" },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

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
  const s = new Date(`${date}T${time}:00`)
  if (Number.isNaN(s.getTime())) return "Select a valid date and time"
  return s.getTime() <= Date.now() ? "Choose a future time" : null
}
const scoreBarColor = (v: number) =>
  v >= 85 ? "bg-emerald-500" : v >= 50 ? "bg-amber-400" : "bg-red-400"
const scoreTextColor = (v: number) =>
  v >= 85 ? "text-emerald-600" : v >= 50 ? "text-amber-600" : "text-red-500"
const copyText = async (v: string) => {
  if (!v) return
  try {
    await navigator.clipboard.writeText(v)
  } catch {
    const el = document.createElement("textarea")
    el.value = v
    el.style.cssText = "position:fixed;top:-9999px;left:-9999px"
    document.body.appendChild(el)
    el.select()
    document.execCommand("copy")
    document.body.removeChild(el)
  }
}
const formatVersionTime = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })

// ─── Main Component ───────────────────────────────────────────────────────────

export default function WriterPage() {
  const { saveDraft, schedulePost, publishPost, workspaceId, billing } = useWorkspace()
  const canPublish = canAccessPlan(billing.plan, "Solo") || Boolean(billing.featureFlags?.scheduling)
  const canUseProTools = canAccessPlan(billing.plan, "Pro")
  const canUseSolo = canAccessPlan(billing.plan, "Solo")
  const canUseCarousel = true // All plans get carousel access; API enforces monthly limit
  const currentDraftLimit = getEffectivePlanLimits(billing.plan, billing.limits).aiDraftsPerMonth
  const carouselLimit = getEffectivePlanLimits(billing.plan, billing.limits).carouselGenerationsPerMonth

  // Pre-fill topic from ?topic= query param (e.g. dashboard writing prompts)
  const searchParams = useSearchParams()
  const initialTopic = searchParams.get("topic") || ""

  // Step 1 inputs
  const [topic, setTopic] = useState(initialTopic)
  const [role, setRole] = useState<Role>("Founder")
  const [format, setFormat] = useState<FormatKey>("Medium")
  const [goal, setGoal] = useState("")

  // Step 2 - hooks
  const [hooks, setHooks] = useState<HookItem[]>([])
  const [selectedHook, setSelectedHook] = useState<string | null>(null)
  const [isGeneratingHooks, setIsGeneratingHooks] = useState(false)

  // Step 3 - draft
  const [draftContent, setDraftContent] = useState("")
  const [isGeneratingPost, setIsGeneratingPost] = useState(false)
  const [versions, setVersions] = useState<DraftVersion[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [scheduleDate, setScheduleDate] = useState("")
  const [scheduleTime, setScheduleTime] = useState("09:00")
  const [isSaving, setIsSaving] = useState(false)

  // Scoring
  const [scores, setScores] = useState<ScoreData | null>(null)
  const [isScoring, setIsScoring] = useState(false)
  const [isImproving, setIsImproving] = useState(false)

  // Hook alt panel
  const [hookAltOpen, setHookAltOpen] = useState(false)
  const [hookAlts, setHookAlts] = useState<HookItem[]>([])
  const [isGeneratingAlts, setIsGeneratingAlts] = useState(false)

  // Comment replies
  const [repliesOpen, setRepliesOpen] = useState(false)
  const [commentInput, setCommentInput] = useState("")
  const [replies, setReplies] = useState<{ style: string; text: string }[]>([])
  const [isGeneratingReplies, setIsGeneratingReplies] = useState(false)

  // Publish
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  const [upgradeModal, setUpgradeModal] = useState(false)
  const [upgradeProModal, setUpgradeProModal] = useState(false)

  // CTA rewrite panel
  const [ctaAltOpen, setCtaAltOpen] = useState(false)
  const [ctaAlts, setCtaAlts] = useState<string[]>([])
  const [isGeneratingCtaAlts, setIsGeneratingCtaAlts] = useState(false)

  // Versions dropdown
  const [versionsOpen, setVersionsOpen] = useState(false)
  const [deleteConfirmIdx, setDeleteConfirmIdx] = useState<number | null>(null)
  const versionsRef = useRef<HTMLDivElement>(null)

  // Carousel mode
  const [slides, setSlides] = useState<SlideItem[]>([])
  const [isGeneratingSlides, setIsGeneratingSlides] = useState(false)
  const [localCarouselUsage, setLocalCarouselUsage] = useState(0)

  // Approval modal
  const [approvalModalOpen, setApprovalModalOpen] = useState(false)

  // Research notes from competitor analyzer
  const [researchNotes, setResearchNotes] = useState<{
    hookPattern?: string; hookType?: string; engagementFactors?: string[]; framework?: string; improvements?: string[]
  } | null>(null)
  const [researchNotesOpen, setResearchNotesOpen] = useState(true)

  // Status
  const [status, setStatus] = useState<StatusMsg | null>(null)
  const [localDraftUsage, setLocalDraftUsage] = useState(0)

  // Auto-dismiss status
  const statusTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const showStatus = useCallback((text: string, type: StatusMsg["type"] = "info", autoDismiss = true) => {
    clearTimeout(statusTimer.current)
    setStatus({ text, type })
    if (autoDismiss) statusTimer.current = setTimeout(() => setStatus(null), 4000)
  }, [])

  useEffect(() => {
    setLocalDraftUsage(readDraftUsage(workspaceId))
    const sync = () => setLocalDraftUsage(readDraftUsage(workspaceId))
    window.addEventListener("qalam:draft-usage", sync)
    return () => window.removeEventListener("qalam:draft-usage", sync)
  }, [workspaceId])

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("competitorInsights")
      if (raw) { setResearchNotes(JSON.parse(raw) as typeof researchNotes); sessionStorage.removeItem("competitorInsights") }
    } catch { /* ignore */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!versionsOpen) return
    const handler = (e: MouseEvent) => {
      if (versionsRef.current && !versionsRef.current.contains(e.target as Node)) setVersionsOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [versionsOpen])

  const wordCount = useMemo(() => (draftContent.trim() ? draftContent.trim().split(/\s+/).length : 0), [draftContent])

  const currentVersionIdx = useMemo(() => {
    if (!draftContent || !versions.length) return null
    for (let i = versions.length - 1; i >= 0; i--) {
      if (versions[i].content === draftContent) return i
    }
    return null
  }, [draftContent, versions])

  const resolveTitle = useCallback(
    () => draftContent.trim().split("\n")[0]?.slice(0, 80) || "Untitled post",
    [draftContent]
  )

  const draftHookLine = useMemo(
    () => draftContent.split("\n").find((l) => l.trim())?.trim() || "",
    [draftContent]
  )

  const draftLimitHit = typeof currentDraftLimit === "number" && localDraftUsage >= currentDraftLimit

  // ── Draft credit helpers ──────────────────────────────────────────────────
  const checkDraftCredit = useCallback(() => {
    if (draftLimitHit) { showStatus("Draft limit reached. Upgrade to Solo for more.", "error"); return false }
    return true
  }, [draftLimitHit, showStatus])

  const useDraftCredit = useCallback((n = 1) => {
    for (let i = 0; i < n; i++) incrementDraftUsage(workspaceId)
    setLocalDraftUsage(readDraftUsage(workspaceId))
  }, [workspaceId])

  // ── Step 1: Generate hooks ────────────────────────────────────────────────
  const onGenerateHooks = async () => {
    if (!topic.trim()) { showStatus("Enter a topic first", "error"); return }
    if (!checkDraftCredit()) return

    setIsGeneratingHooks(true)
    setHooks([])
    setSelectedHook(null)
    setDraftContent("")
    setScores(null)
    setHookAltOpen(false)

    try {
      const res = await fetch("/api/generate/hooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: topic.trim(), role, goal: goal.trim() }),
      })
      const data = await res.json().catch(() => ({})) as { hooks?: HookItem[]; error?: string }
      if (!res.ok) throw new Error(data.error || "Failed to generate hooks")
      const items = (data.hooks || []).slice(0, 5) as HookItem[]
      if (!items.length) throw new Error("No hooks returned")
      setHooks(items)
      useDraftCredit(1)
    } catch (e) {
      showStatus((e as Error).message, "error")
    } finally {
      setIsGeneratingHooks(false)
    }
  }

  // ── Step 2: Generate full post from hook ──────────────────────────────────
  const onGeneratePost = async (hookOverride?: string) => {
    const hookText = hookOverride || selectedHook
    if (!hookText) { showStatus("Select a hook first", "error"); return }
    if (!checkDraftCredit()) return

    setIsGeneratingPost(true)
    setDraftContent("")
    setScores(null)
    setHookAltOpen(false)
    showStatus("Generating post from your hook...", "info", false)

    try {
      const res = await fetch("/api/generate/post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: topic.trim(), hook: hookText, role, format, goal: goal.trim() }),
      })
      const data = await res.json().catch(() => ({})) as { content?: string; error?: string }
      if (!res.ok) throw new Error(data.error || "Post generation failed")
      const content = sanitizeGeneratedText(data.content || "")
      if (!content) throw new Error("AI returned an empty draft")
      setDraftContent(content)
      setVersions((p) => [...p, { content, timestamp: new Date().toISOString() }])
      setEditingId(null)
      useDraftCredit(1)
      showStatus("Draft ready. Scoring...", "info", false)
      void autoScore(content)
    } catch (e) {
      showStatus((e as Error).message, "error")
    } finally {
      setIsGeneratingPost(false)
    }
  }

  // ── Regenerate with same hook ─────────────────────────────────────────────
  const onRegenerate = async () => {
    if (!selectedHook) { showStatus("No hook selected", "error"); return }
    await onGeneratePost(selectedHook)
  }

  // ── Auto-score ────────────────────────────────────────────────────────────
  const autoScore = async (content: string) => {
    if (!content.trim() || isScoring) return
    setIsScoring(true)
    try {
      const res = await fetch("/api/generate/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, role }),
      })
      const data = await res.json().catch(() => null) as ScoreData | null
      if (res.ok && data) {
        setScores(data)
        showStatus("Draft scored.", "success")
      }
    } finally {
      setIsScoring(false)
    }
  }

  // Debounced re-score on edit (3 second delay)
  const scoreDebounce = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => {
    if (!draftContent.trim()) return
    clearTimeout(scoreDebounce.current)
    scoreDebounce.current = setTimeout(() => void autoScore(draftContent), 3000)
    return () => clearTimeout(scoreDebounce.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftContent])

  // ── Push to 90+ ───────────────────────────────────────────────────────────
  const onPushTo90 = async () => {
    if (!draftContent.trim()) { showStatus("No draft to improve", "error"); return }
    if (!checkDraftCredit()) return
    setIsImproving(true)
    showStatus("Improving draft toward 90+...", "info", false)
    try {
      const res = await fetch("/api/generate/improve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: draftContent, role, scores: scores || {} }),
      })
      const data = await res.json().catch(() => ({})) as { content?: string; scores?: ScoreData; error?: string }
      if (!res.ok) throw new Error(data.error || "Improvement failed")
      const improved = sanitizeGeneratedText(data.content || "")
      if (!improved) throw new Error("Returned empty content")
      setDraftContent(improved)
      setVersions((p) => [...p, { content: improved, timestamp: new Date().toISOString() }])
      if (data.scores) setScores(data.scores as ScoreData)
      useDraftCredit(1)
      showStatus("Draft improved. Check new scores.", "success")
    } catch (e) {
      showStatus((e as Error).message, "error")
    } finally {
      setIsImproving(false)
    }
  }

  // ── Hook alternatives ─────────────────────────────────────────────────────
  const onImproveHook = async () => {
    if (!draftContent.trim()) return
    if (hookAltOpen) { setHookAltOpen(false); return }
    setIsGeneratingAlts(true)
    setHookAltOpen(true)
    setHookAlts([])
    try {
      const res = await fetch("/api/generate/hook-alternatives", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: draftContent, role }),
      })
      const data = await res.json().catch(() => ({})) as { hooks?: HookItem[]; error?: string }
      if (!res.ok) throw new Error(data.error || "Failed to generate alternatives")
      setHookAlts((data.hooks || []).slice(0, 3) as HookItem[])
    } catch (e) {
      showStatus((e as Error).message, "error")
      setHookAltOpen(false)
    } finally {
      setIsGeneratingAlts(false)
    }
  }

  const applyHookAlt = (altText: string) => {
    setSelectedHook(altText)
    setHookAltOpen(false)
    void onGeneratePost(altText)
  }

  // ── Save draft ────────────────────────────────────────────────────────────
  const onSaveDraft = async () => {
    if (!draftContent.trim()) { showStatus("Write content first", "error"); return }
    setIsSaving(true)
    try {
      const id = await saveDraft({ id: editingId, title: resolveTitle(), content: draftContent, type: "LinkedIn - Text post" })
      setEditingId(id)
      showStatus("Draft saved", "success")
    } catch (e) {
      showStatus("Save failed: " + (e as Error).message, "error")
    } finally {
      setIsSaving(false)
    }
  }

  // ── Schedule ──────────────────────────────────────────────────────────────
  const onSchedule = async () => {
    if (!draftContent.trim()) { showStatus("Write content first", "error"); return }
    const err = scheduleError(scheduleDate, scheduleTime)
    if (err) { showStatus(err, "error"); return }
    try {
      const id = await schedulePost({ id: editingId, title: resolveTitle(), content: draftContent, type: "LinkedIn - Text post", date: scheduleDate, time: scheduleTime })
      setEditingId(id)
      showStatus(`Scheduled for ${scheduleDate} at ${scheduleTime}`, "success")
      setScheduleModalOpen(false)
    } catch (e) {
      showStatus("Schedule failed: " + (e as Error).message, "error")
    }
  }

  // ── Publish ───────────────────────────────────────────────────────────────
  const onPublish = async () => {
    if (!draftContent.trim()) { showStatus("Write content first", "error"); return }
    setIsPublishing(true)
    try {
      const id = await publishPost({ id: editingId, title: resolveTitle(), content: draftContent, type: "LinkedIn - Text post", publishedAt: new Date().toISOString() })
      setEditingId(id)
      showStatus("Published successfully", "success")
    } catch (e) {
      showStatus((e as Error).message || "Publish failed", "error")
    } finally {
      setIsPublishing(false)
    }
  }

  // ── Comment replies ───────────────────────────────────────────────────────
  const onGenerateReplies = async () => {
    if (!commentInput.trim()) return
    setIsGeneratingReplies(true)
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "comment-replies", originalPost: draftContent, comments: commentInput, profile: {} }),
      })
      const data = await res.json().catch(() => ({})) as { replies?: Array<{ style: string; reply: string }> }
      setReplies((data.replies || []).slice(0, 3).map((r) => ({ style: r.style, text: r.reply })))
    } finally {
      setIsGeneratingReplies(false)
    }
  }

  // ── Export ────────────────────────────────────────────────────────────────
  const onExportText = async () => {
    await copyText(draftContent)
    showStatus("Copied to clipboard", "success")
  }

  const onExportPdf = () => {
    const win = window.open("", "_blank")
    if (!win) { showStatus("Allow pop-ups to export PDF", "error"); return }
    const escaped = draftContent.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${resolveTitle().slice(0, 60)}</title><style>body{font-family:Georgia,serif;max-width:680px;margin:60px auto;line-height:1.8;color:#18181b;font-size:16px}pre{white-space:pre-wrap;word-wrap:break-word;font-family:inherit;margin:0}@media print{body{margin:20px}}</style></head><body><pre>${escaped}</pre><script>window.onload=function(){window.print()}<\/script></body></html>`)
    win.document.close()
  }

  // ── CTA rewrite ───────────────────────────────────────────────────────────
  const onRewriteCta = async () => {
    if (!draftContent.trim()) return
    if (ctaAltOpen) { setCtaAltOpen(false); return }
    if (!checkDraftCredit()) return
    setIsGeneratingCtaAlts(true)
    setCtaAltOpen(true)
    setCtaAlts([])
    try {
      const res = await fetch("/api/generate/cta-alternatives", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: draftContent, role }),
      })
      const data = await res.json().catch(() => ({})) as { alternatives?: string[]; error?: string }
      if (!res.ok) throw new Error(data.error || "Failed to generate CTA alternatives")
      setCtaAlts((data.alternatives || []).slice(0, 3))
      useDraftCredit(1)
    } catch (e) {
      showStatus((e as Error).message, "error")
      setCtaAltOpen(false)
    } finally {
      setIsGeneratingCtaAlts(false)
    }
  }

  const applyCtaAlt = (altText: string) => {
    setDraftContent((prev) => {
      const blocks = prev.trimEnd().split(/\n\n+/)
      if (!blocks.length) return prev
      const last = blocks[blocks.length - 1].trim()
      const idx = last.startsWith("#") && blocks.length > 1 ? blocks.length - 2 : blocks.length - 1
      blocks[idx] = altText
      return blocks.join("\n\n")
    })
    setCtaAltOpen(false)
    showStatus("CTA replaced.", "success")
  }

  // ── Version management ────────────────────────────────────────────────────
  const loadVersion = (idx: number) => {
    setDraftContent(versions[idx].content)
    setScores(null)
    setVersionsOpen(false)
  }

  const deleteVersion = (idx: number) => {
    setVersions((prev) => prev.filter((_, i) => i !== idx))
    setDeleteConfirmIdx(null)
  }

  // ── Generate carousel ─────────────────────────────────────────────────────
  const onGenerateCarousel = async () => {
    if (!topic.trim()) { showStatus("Enter a topic first", "error"); return }
    if (!canUseCarousel) { showStatus("Carousel is a Pro feature. Upgrade to unlock.", "error"); return }
    if (typeof carouselLimit === "number" && localCarouselUsage >= carouselLimit) {
      showStatus("Carousel limit reached. Upgrade your plan.", "error")
      return
    }

    setIsGeneratingSlides(true)
    setSlides([])
    showStatus("Generating carousel slides...", "info", false)

    try {
      const res = await fetch("/api/generate/carousel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: topic.trim(), role }),
      })
      const data = await res.json().catch(() => ({})) as { slides?: SlideItem[]; error?: string; plan?: string }
      if (!res.ok) {
        if (res.status === 403) throw new Error(data.error || "Carousel limit reached")
        throw new Error(data.error || "Carousel generation failed")
      }
      const items = data.slides || []
      if (!items.length) throw new Error("No slides returned")
      setSlides(items)
      setLocalCarouselUsage((n) => n + 1)
      showStatus("Carousel ready.", "success")
    } catch (e) {
      showStatus((e as Error).message, "error")
    } finally {
      setIsGeneratingSlides(false)
    }
  }

  const onSaveCarousel = async () => {
    if (!slides.length) return
    setIsSaving(true)
    try {
      const title = slides[0]?.title || "Untitled carousel"
      const content = JSON.stringify(slides)
      const id = await saveDraft({ id: editingId, title, content, type: "LinkedIn - Carousel" })
      setEditingId(id)
      showStatus("Carousel saved", "success")
    } catch (e) {
      showStatus("Save failed: " + (e as Error).message, "error")
    } finally {
      setIsSaving(false)
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  const isCarouselMode = format === "Carousel"
  const step2Visible = !isCarouselMode && (hooks.length > 0 || isGeneratingHooks)
  const step3Visible = !isCarouselMode && draftContent.trim().length > 0
  const slidesVisible = isCarouselMode && (slides.length > 0 || isGeneratingSlides)

  return (
    <>
      <div className="mx-auto grid max-w-[1280px] grid-cols-1 gap-6 px-4 py-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:px-6">

        {/* ── LEFT: Writer flow ────────────────────────────────────────── */}
        <div className="flex flex-col gap-5">

          {/* STEP 1 - Inputs */}
          <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
            <div className="border-b border-zinc-100 bg-zinc-50/60 px-5 py-3.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-teal text-[10px] font-bold text-white">1</span>
                  <h2 className="text-sm font-bold text-zinc-900">Your post details</h2>
                </div>
                <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${canUseProTools ? "border-gold/30 bg-gold/10 text-gold" : canUseSolo ? "border-teal/20 bg-teal/10 text-teal" : "border-zinc-200 bg-zinc-100 text-zinc-500"}`}>
                  {canUseProTools ? "Voice-Trained AI" : canUseSolo ? "Role-Aware AI" : "Basic AI Writer"}
                </span>
              </div>
            </div>

            <div className="p-5">
              {/* Topic */}
              <div className="mb-4">
                <textarea
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  rows={3}
                  placeholder="What do you want to write about?"
                  className="w-full resize-none rounded-xl border border-zinc-200 bg-zinc-50/50 px-4 py-3 text-sm leading-relaxed text-zinc-900 outline-none transition-all focus:border-teal focus:bg-white focus:ring-4 focus:ring-teal/10"
                  onKeyDown={(e) => { if (e.key === "Enter" && e.metaKey) void onGenerateHooks() }}
                />
              </div>

              {/* Role + Format row */}
              <div className="mb-4 grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-zinc-400">Role</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as Role)}
                    className="w-full cursor-pointer rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm font-medium text-zinc-700 outline-none focus:border-teal focus:ring-4 focus:ring-teal/10"
                  >
                    {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-zinc-400">Format</label>
                  <div className="flex gap-1.5">
                    {FORMATS.map(({ key, words }) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setFormat(key)}
                        className={`flex-1 cursor-pointer rounded-xl border py-2 text-xs font-semibold transition-all ${
                          format === key
                            ? "border-teal bg-teal/10 text-teal"
                            : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300"
                        }`}
                      >
                        <span className="block">{key}</span>
                        <span className={`block text-[9px] font-normal ${format === key ? "text-teal/80" : "text-zinc-400"}`}>{words}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Goal */}
              <div className="mb-5">
                <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-zinc-400">Goal <span className="font-normal normal-case text-zinc-400">(optional)</span></label>
                <input
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  placeholder="e.g. Get DMs from founders"
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-4 py-2.5 text-sm text-zinc-900 outline-none transition-all focus:border-teal focus:bg-white focus:ring-4 focus:ring-teal/10"
                />
              </div>

              {/* Generate button + counters */}
              {isCarouselMode ? (
                <>
                  {!canUseCarousel ? (
                    <div className="mb-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
                      Carousel generation requires <span className="font-bold">Pro</span>. Upgrade to unlock.
                    </div>
                  ) : null}
                  <button
                    onClick={() => void onGenerateCarousel()}
                    disabled={isGeneratingSlides || !topic.trim() || !canUseCarousel}
                    className="w-full cursor-pointer rounded-xl bg-teal py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-teal-600 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isGeneratingSlides ? "Generating slides..." : !canUseCarousel ? "Carousel (Pro only)" : "Generate Carousel"}
                  </button>
                  {canUseCarousel && typeof carouselLimit === "number" && (
                    <p className="mt-2 text-center text-xs text-zinc-400">
                      {localCarouselUsage} of {carouselLimit} carousels used this month
                    </p>
                  )}
                </>
              ) : (
                <>
                  <button
                    onClick={() => void onGenerateHooks()}
                    disabled={isGeneratingHooks || !topic.trim() || draftLimitHit}
                    className="w-full cursor-pointer rounded-xl bg-teal py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-teal-600 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isGeneratingHooks ? "Generating hooks..." : draftLimitHit ? "Draft limit reached - Upgrade to Solo" : "Generate Hooks"}
                  </button>
                  <DraftCounter compact className="mt-2" />
                </>
              )}
            </div>
          </section>

          {/* STEP 2 - Hook selection */}
          {step2Visible && (
            <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
              <div className="border-b border-zinc-100 bg-zinc-50/60 px-5 py-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-teal text-[10px] font-bold text-white">2</span>
                    <h2 className="text-sm font-bold text-zinc-900">Choose your opening hook</h2>
                  </div>
                  {hooks.length > 0 && (
                    <button
                      onClick={() => void onGenerateHooks()}
                      disabled={isGeneratingHooks}
                      className="cursor-pointer rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-600 transition-colors hover:bg-zinc-50 disabled:opacity-50"
                    >
                      {isGeneratingHooks ? "..." : "Regenerate"}
                    </button>
                  )}
                </div>
                <p className="mt-0.5 pl-7 text-xs text-zinc-500">
                  {selectedHook ? "Hook selected - generate your full post below" : "Click a card to select your hook, then generate"}
                </p>
              </div>

              <div className="p-5">
                {isGeneratingHooks ? (
                  <div className="flex gap-3 overflow-x-auto pb-2 sm:grid sm:grid-cols-3 sm:overflow-visible sm:pb-0 lg:grid-cols-5">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div key={i} className="h-36 w-64 shrink-0 animate-pulse rounded-2xl bg-zinc-100 sm:w-auto" />
                    ))}
                  </div>
                ) : (
                  <div className="flex gap-3 overflow-x-auto pb-2 sm:grid sm:grid-cols-3 sm:overflow-visible sm:pb-0 lg:grid-cols-5">
                    {hooks.map((item) => (
                      <HookCard
                        key={item.text}
                        hook={item.text}
                        style={item.style}
                        selected={selectedHook === item.text}
                        onSelect={() => setSelectedHook(selectedHook === item.text ? null : item.text)}
                      />
                    ))}
                  </div>
                )}

                <div className="mt-4">
                  <button
                    onClick={() => void onGeneratePost()}
                    disabled={!selectedHook || isGeneratingPost || draftLimitHit}
                    className={`w-full cursor-pointer rounded-xl py-3 text-sm font-bold text-white shadow-sm transition-all ${
                      selectedHook && !draftLimitHit
                        ? "bg-teal hover:bg-teal-600"
                        : "bg-zinc-300 opacity-50 cursor-not-allowed"
                    }`}
                  >
                    {isGeneratingPost ? "Generating post..." : "Generate full post from this hook"}
                  </button>
                </div>
              </div>
            </section>
          )}

          {/* STEP 2C - Carousel slides */}
          {slidesVisible && (
            <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
              <div className="border-b border-zinc-100 bg-zinc-50/60 px-5 py-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-teal text-[10px] font-bold text-white">2</span>
                    <h2 className="text-sm font-bold text-zinc-900">Carousel slides</h2>
                  </div>
                  {slides.length > 0 && (
                    <button
                      onClick={() => void onGenerateCarousel()}
                      disabled={isGeneratingSlides}
                      className="cursor-pointer rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-600 transition-colors hover:bg-zinc-50 disabled:opacity-50"
                    >
                      Regenerate
                    </button>
                  )}
                </div>
                <p className="mt-0.5 pl-7 text-xs text-zinc-500">
                  {slides.length} slide{slides.length !== 1 ? "s" : ""} - review, edit, then save
                </p>
              </div>

              <div className="p-5">
                {isGeneratingSlides ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div key={i} className="h-36 animate-pulse rounded-2xl bg-zinc-100" />
                    ))}
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {slides.map((slide) => (
                      <div
                        key={slide.number}
                        className={`rounded-2xl border p-4 ${
                          slide.number === 1
                            ? "border-teal/30 bg-teal/5"
                            : slide.title === "Follow for more" || slide.body === ""
                            ? "border-gold/30 bg-gold/5"
                            : "border-zinc-200 bg-white"
                        }`}
                      >
                        <div className="mb-2 flex items-center gap-2">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-[10px] font-bold text-white">
                            {slide.number}
                          </span>
                          {slide.number === 1 && (
                            <span className="rounded-full bg-teal px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">Hook</span>
                          )}
                          {(slide.title === "Follow for more" || slide.body === "") && slide.number > 1 && (
                            <span className="rounded-full bg-gold px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">CTA</span>
                          )}
                        </div>
                        <p className="text-sm font-bold leading-snug text-zinc-900">{slide.title}</p>
                        {slide.body && (
                          <p className="mt-1 text-xs leading-relaxed text-zinc-600">{slide.body}</p>
                        )}
                        {slide.visual_suggestion && (
                          <div className="mt-2 flex items-center gap-1.5">
                            <svg className="h-3 w-3 shrink-0 text-zinc-400" viewBox="0 0 16 16" fill="none">
                              <rect x="1" y="1" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="1.2"/>
                              <circle cx="5.5" cy="5.5" r="1.5" stroke="currentColor" strokeWidth="1"/>
                              <path d="M1 10.5l3.5-3 2.5 2.5 2.5-2.5 4.5 4.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                            <p className="text-[10px] text-zinc-400">{slide.visual_suggestion}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {slides.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      onClick={() => void onSaveCarousel()}
                      disabled={isSaving}
                      className="cursor-pointer rounded-xl bg-teal px-4 py-2.5 text-xs font-bold text-white shadow-sm transition-colors hover:bg-teal-600 disabled:opacity-50"
                    >
                      {isSaving ? "Saving..." : "Save carousel"}
                    </button>
                    <button
                      onClick={async () => {
                        const text = slides.map((s) => `Slide ${s.number}: ${s.title}${s.body ? `\n${s.body}` : ""}`).join("\n\n")
                        await copyText(text)
                        showStatus("Copied to clipboard", "success")
                      }}
                      className="cursor-pointer rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-xs font-semibold text-zinc-600 transition-colors hover:bg-zinc-50"
                    >
                      Copy all text
                    </button>
                  </div>
                )}

                {status && (
                  <p className={`mt-3 text-xs font-medium ${status.type === "error" ? "text-red-600" : status.type === "success" ? "text-emerald-600" : "text-zinc-500"}`}>
                    {status.text}
                  </p>
                )}
              </div>
            </section>
          )}

          {/* STEP 3 - Full draft */}
          {step3Visible && (
            <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
              <div className="border-b border-zinc-100 bg-zinc-50/60 px-5 py-3.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-teal text-[10px] font-bold text-white">3</span>
                    <h2 className="text-sm font-bold text-zinc-900">Your draft</h2>
                  </div>
                  {versions.length > 0 && (
                    <div className="relative" ref={versionsRef}>
                      <button
                        onClick={() => setVersionsOpen((v) => !v)}
                        className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-zinc-600 transition-colors hover:bg-zinc-50"
                      >
                        <span>
                          {currentVersionIdx !== null
                            ? `Version ${currentVersionIdx + 1} · ${formatVersionTime(versions[currentVersionIdx].timestamp)}`
                            : "Current"}
                        </span>
                        {currentVersionIdx === null && (
                          <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-700">unsaved</span>
                        )}
                        <svg className="h-3 w-3 shrink-0 text-zinc-400" viewBox="0 0 12 12" fill="none">
                          <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                      {versionsOpen && (
                        <div className="absolute right-0 top-full z-20 mt-1.5 min-w-[210px] rounded-xl border border-zinc-200 bg-white shadow-lg">
                          {currentVersionIdx === null && (
                            <div className="flex items-center justify-between border-b border-zinc-100 px-3 py-2.5">
                              <span className="text-xs font-semibold text-zinc-700">Current</span>
                              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-bold text-amber-700">unsaved</span>
                            </div>
                          )}
                          {versions.map((v, idx) => (
                            <div
                              key={idx}
                              className={`flex items-center gap-2 border-b border-zinc-100 px-3 py-2.5 last:border-b-0 ${idx === currentVersionIdx ? "bg-teal/5" : "hover:bg-zinc-50/60"}`}
                            >
                              <button
                                onClick={() => loadVersion(idx)}
                                className="flex flex-1 items-center gap-1.5 text-left"
                              >
                                <span className={`text-xs font-semibold ${idx === currentVersionIdx ? "text-teal" : "text-zinc-700"}`}>
                                  Version {idx + 1}
                                </span>
                                <span className="text-[10px] text-zinc-400">{formatVersionTime(v.timestamp)}</span>
                                {idx === currentVersionIdx && (
                                  <svg className="h-3 w-3 text-teal" viewBox="0 0 12 12" fill="none">
                                    <path d="M2 6l3.5 3.5L10 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                  </svg>
                                )}
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); setDeleteConfirmIdx(idx) }}
                                className="shrink-0 rounded p-1 text-zinc-300 transition-colors hover:bg-red-50 hover:text-red-500"
                                aria-label={`Delete version ${idx + 1}`}
                              >
                                <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none">
                                  <path d="M2 4h12M5.333 4V2.667a1.333 1.333 0 0 1 1.334-1.334h2.666a1.333 1.333 0 0 1 1.334 1.334V4m2 0v9.333a1.333 1.333 0 0 1-1.334 1.334H4.667a1.333 1.333 0 0 1-1.334-1.334V4h9.334Z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Hook header with inline alt panel */}
              <div className="border-b border-zinc-100 px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="flex-1 text-sm font-semibold leading-relaxed text-zinc-900 line-clamp-2">{draftHookLine || "Hook line"}</p>
                  <button
                    onClick={() => void onImproveHook()}
                    disabled={isGeneratingAlts}
                    className="shrink-0 cursor-pointer rounded-lg border border-teal/25 bg-teal/8 px-3 py-1.5 text-xs font-bold text-teal transition-colors hover:bg-teal/15 disabled:opacity-50"
                  >
                    {isGeneratingAlts ? "..." : hookAltOpen ? "Close" : "Improve hook"}
                  </button>
                </div>

                {/* Inline hook alternatives */}
                <div className={`overflow-hidden transition-all duration-200 ${hookAltOpen ? "mt-3 max-h-[400px] opacity-100" : "max-h-0 opacity-0"}`}>
                  <div className="rounded-xl border border-zinc-200 bg-zinc-50/60">
                    <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">3 stronger hooks</span>
                      <button
                        onClick={() => setHookAltOpen(false)}
                        className="cursor-pointer text-[10px] font-bold text-zinc-400 transition-colors hover:text-zinc-600"
                      >
                        Close
                      </button>
                    </div>
                    {isGeneratingAlts ? (
                      <div className="p-4 text-sm text-zinc-500">Generating alternatives...</div>
                    ) : hookAlts.length ? (
                      hookAlts.map((alt) => (
                        <div key={alt.text} className="flex items-start gap-3 border-b border-zinc-100 px-4 py-3 last:border-b-0">
                          <div className="flex-1">
                            <span className="mr-2 inline-flex items-center rounded border border-zinc-200 bg-white px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-zinc-500">{alt.style}</span>
                            <p className="mt-1.5 text-sm font-medium leading-snug text-zinc-800">{alt.text}</p>
                          </div>
                          <button
                            onClick={() => applyHookAlt(alt.text)}
                            className="shrink-0 cursor-pointer rounded-lg bg-teal px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-teal-600"
                          >
                            Use
                          </button>
                        </div>
                      ))
                    ) : (
                      <p className="p-4 text-sm text-zinc-400">No alternatives yet.</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Draft textarea */}
              <div className="relative">
                <textarea
                  value={draftContent}
                  onChange={(e) => {
                    setDraftContent(e.target.value)
                    e.target.style.height = "auto"
                    e.target.style.height = `${e.target.scrollHeight}px`
                  }}
                  placeholder="Your post content..."
                  className="min-h-[360px] w-full resize-none bg-transparent px-5 py-5 text-base leading-[1.8] text-zinc-900 outline-none"
                  style={{ overflow: "hidden" }}
                />
                <div className="flex items-center gap-3 border-t border-zinc-100 bg-zinc-50/60 px-5 py-2.5 text-xs text-zinc-400">
                  <span>{wordCount} words</span>
                  <span>{draftContent.length} chars</span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="border-t border-zinc-100 p-5">
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => void onRegenerate()}
                    disabled={isGeneratingPost || !selectedHook || draftLimitHit}
                    className="cursor-pointer rounded-xl border border-zinc-300 bg-white px-4 py-2 text-xs font-semibold text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-45"
                  >
                    {isGeneratingPost ? "Regenerating..." : "Regenerate (1 draft)"}
                  </button>
                  <button
                    onClick={() => void onSaveDraft()}
                    disabled={isSaving || isPublishing}
                    className="cursor-pointer rounded-xl border border-zinc-300 bg-white px-4 py-2 text-xs font-semibold text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-45"
                  >
                    {isSaving ? "Saving..." : "Save draft"}
                  </button>
                  <LockedFeature feature="Scheduling" requiredPlan="Solo">
                    <button
                      onClick={() => setScheduleModalOpen(true)}
                      disabled={isSaving || isPublishing}
                      className="cursor-pointer rounded-xl border border-zinc-300 bg-white px-4 py-2 text-xs font-semibold text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-45"
                    >
                      Schedule
                    </button>
                  </LockedFeature>
                  {canPublish ? (
                    <button
                      onClick={() => void onPublish()}
                      disabled={isPublishing || isSaving}
                      className="cursor-pointer rounded-xl bg-teal px-4 py-2 text-xs font-bold text-white shadow-sm transition-colors hover:bg-teal-600 disabled:opacity-60"
                    >
                      {isPublishing ? "Publishing..." : "Publish now"}
                    </button>
                  ) : (
                    <button
                      onClick={() => setUpgradeModal(true)}
                      className="cursor-pointer rounded-xl bg-teal px-4 py-2 text-xs font-bold text-white shadow-sm transition-colors hover:bg-teal-600"
                    >
                      Publish (Solo+)
                    </button>
                  )}
                  <button
                    onClick={() => void onExportText()}
                    className="cursor-pointer rounded-xl border border-zinc-200 bg-white px-4 py-2 text-xs font-semibold text-zinc-600 transition-colors hover:bg-zinc-50"
                  >
                    Copy text
                  </button>
                  {canUseProTools ? (
                    <button
                      onClick={() => onExportPdf()}
                      className="cursor-pointer rounded-xl border border-zinc-200 bg-white px-4 py-2 text-xs font-semibold text-zinc-600 transition-colors hover:bg-zinc-50"
                    >
                      Export PDF
                    </button>
                  ) : (
                    <button
                      onClick={() => setUpgradeProModal(true)}
                      className="cursor-pointer rounded-xl border border-zinc-200 bg-white px-4 py-2 text-xs font-semibold text-zinc-400 transition-colors hover:bg-zinc-50"
                    >
                      PDF (Pro)
                    </button>
                  )}
                  <LockedFeature feature="Approval workflow" requiredPlan="Pro">
                    <button
                      onClick={() => setApprovalModalOpen(true)}
                      disabled={!draftContent.trim()}
                      className="cursor-pointer rounded-xl border border-zinc-200 bg-white px-4 py-2 text-xs font-semibold text-zinc-600 transition-colors hover:bg-zinc-50 disabled:opacity-45"
                    >
                      Send for approval
                    </button>
                  </LockedFeature>
                </div>

                {status && (
                  <p className={`mt-3 text-xs font-medium ${status.type === "error" ? "text-red-600" : status.type === "success" ? "text-emerald-600" : "text-zinc-500"}`}>
                    {status.text}
                  </p>
                )}
              </div>
            </section>
          )}
        </div>

        {/* ── RIGHT: Sidebar ───────────────────────────────────────────── */}
        <aside className="space-y-4">

          {/* Scoring panel */}
          <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
            <div className="border-b border-zinc-100 bg-zinc-50/60 px-4 py-3.5">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-500">Content Score</h2>
                {isScoring && <span className="animate-pulse text-[10px] font-semibold text-teal">Scoring...</span>}
              </div>
              {scores ? (
                <div className="mt-2 flex items-baseline gap-1">
                  <span className={`text-4xl font-bold tabular-nums ${scoreTextColor(scores.overall)}`}>{scores.overall}</span>
                  <span className="text-sm text-zinc-400">/100</span>
                  {scores.overall >= 85 && <span className="ml-1 text-[10px] font-bold text-emerald-600">Copy-ready</span>}
                </div>
              ) : (
                <p className="mt-1 text-xs text-zinc-400">{step3Visible ? "Scoring..." : "Generate a draft to see scores"}</p>
              )}
            </div>

            {scores ? (
              <div className="divide-y divide-zinc-100">
                {SCORE_LABELS.map(({ key, label }) => {
                  const v = scores[key] as number
                  const tip = scores.tips[key] || ""
                  return (
                    <div key={key} className="px-4 py-3">
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">{label}</span>
                        <span className={`text-sm font-bold tabular-nums ${scoreTextColor(v)}`}>{v}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-zinc-100">
                        <div className={`h-full rounded-full transition-all duration-500 ${scoreBarColor(v)}`} style={{ width: `${v}%` }} />
                      </div>
                      {tip && <p className="mt-1 text-[10px] leading-snug text-zinc-400">{tip}</p>}
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="space-y-2 p-4">
                {SCORE_LABELS.map(({ label }) => (
                  <div key={label} className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wide text-zinc-300">{label}</span>
                    <div className="h-1.5 flex-1 rounded-full bg-zinc-100" />
                    <span className="text-sm font-bold text-zinc-200">--</span>
                  </div>
                ))}
              </div>
            )}

            {scores && (
              <div className="border-t border-zinc-100 p-4 space-y-2">
                <LockedFeature feature="Push to 90+" requiredPlan="Pro" className="w-full">
                  <button
                    onClick={() => void onPushTo90()}
                    disabled={isImproving || !draftContent.trim() || draftLimitHit || scores.overall >= 90}
                    className="w-full cursor-pointer rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs font-bold text-amber-800 transition-colors hover:bg-amber-100 disabled:opacity-45"
                  >
                    {isImproving ? "Improving..." : scores.overall >= 90 ? "90+ achieved" : draftLimitHit ? "Upgrade for more" : "Push to 90+ (uses 1 draft)"}
                  </button>
                </LockedFeature>
                <button
                  onClick={() => void onImproveHook()}
                  disabled={!draftContent.trim() || isGeneratingAlts}
                  className="w-full cursor-pointer rounded-xl border border-teal/25 bg-teal/8 px-4 py-2.5 text-xs font-bold text-teal transition-colors hover:bg-teal/15 disabled:opacity-45"
                >
                  {isGeneratingAlts ? "..." : hookAltOpen ? "Close hook panel" : "Improve hook"}
                </button>
                <button
                  onClick={() => void onRewriteCta()}
                  disabled={!draftContent.trim() || isGeneratingCtaAlts || draftLimitHit}
                  className="w-full cursor-pointer rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-xs font-bold text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-45"
                >
                  {isGeneratingCtaAlts ? "..." : ctaAltOpen ? "Close CTA panel" : "Rewrite CTA (1 draft)"}
                </button>
                <div className={`overflow-hidden transition-all duration-200 ${ctaAltOpen ? "max-h-[320px] opacity-100" : "max-h-0 opacity-0"}`}>
                  <div className="rounded-xl border border-zinc-200 bg-zinc-50/60">
                    <div className="flex items-center justify-between border-b border-zinc-100 px-3 py-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">3 CTA options</span>
                      <button
                        onClick={() => setCtaAltOpen(false)}
                        className="cursor-pointer text-[10px] font-bold text-zinc-400 transition-colors hover:text-zinc-600"
                      >
                        Close
                      </button>
                    </div>
                    {isGeneratingCtaAlts ? (
                      <div className="p-3 text-xs text-zinc-500">Generating alternatives...</div>
                    ) : ctaAlts.length ? (
                      ctaAlts.map((alt, i) => (
                        <div key={i} className="flex items-start gap-2 border-b border-zinc-100 px-3 py-2.5 last:border-b-0">
                          <p className="flex-1 text-xs leading-relaxed text-zinc-700">{alt}</p>
                          <button
                            onClick={() => applyCtaAlt(alt)}
                            className="shrink-0 cursor-pointer rounded-lg bg-teal px-2.5 py-1 text-[10px] font-bold text-white transition-colors hover:bg-teal-600"
                          >
                            Use
                          </button>
                        </div>
                      ))
                    ) : (
                      <p className="p-3 text-xs text-zinc-400">No alternatives yet.</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Hashtags */}
          {scores?.hashtags?.length ? (
            <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-500">Hashtags</h2>
                <button
                  onClick={() => copyText(scores.hashtags.join(" "))}
                  className="cursor-pointer text-xs font-semibold text-teal transition-colors hover:text-teal-700"
                >
                  Copy all
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {scores.hashtags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => copyText(tag)}
                    className="cursor-pointer rounded-full border border-teal/20 bg-teal/5 px-2.5 py-1 text-xs font-medium text-teal transition-colors hover:bg-teal/10"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          ) : step3Visible ? (
            <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
              <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Hashtags</h2>
              <p className="mt-2 text-xs text-zinc-400">Hashtags appear after scoring.</p>
            </div>
          ) : null}

          {/* Comment replies */}
          {step3Visible && (
            <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
              <button
                onClick={() => setRepliesOpen((v) => !v)}
                className="flex w-full cursor-pointer items-center justify-between px-4 py-3.5 text-left"
              >
                <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-500">Comment Replies</h2>
                <span className="text-xs text-zinc-400">{repliesOpen ? "Hide" : "Show"}</span>
              </button>
              {repliesOpen && (
                <div className="border-t border-zinc-100 p-4">
                  <div className="mb-3">
                    <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-zinc-400">Paste a comment to reply to</label>
                    <textarea
                      value={commentInput}
                      onChange={(e) => setCommentInput(e.target.value)}
                      rows={3}
                      placeholder="Paste a comment here..."
                      className="w-full resize-none rounded-xl border border-zinc-200 bg-zinc-50/50 px-3 py-2.5 text-xs text-zinc-900 outline-none transition-all focus:border-teal focus:bg-white focus:ring-4 focus:ring-teal/10"
                    />
                  </div>
                  <button
                    onClick={() => void onGenerateReplies()}
                    disabled={isGeneratingReplies || !commentInput.trim()}
                    className="w-full cursor-pointer rounded-xl bg-teal px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-teal-600 disabled:opacity-50"
                  >
                    {isGeneratingReplies ? "Generating..." : "Generate 3 replies"}
                  </button>
                  {replies.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {replies.map((r, i) => (
                        <div key={i} className="flex items-start gap-2.5 rounded-xl border border-zinc-100 bg-zinc-50 p-3">
                          <span className="shrink-0 rounded-full border border-zinc-200 bg-white px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-zinc-500">{r.style}</span>
                          <p className="flex-1 text-xs leading-relaxed text-zinc-700">{r.text}</p>
                          <button onClick={() => copyText(r.text)} className="cursor-pointer shrink-0 text-[10px] font-bold text-teal hover:text-teal-700">Copy</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Research notes panel (populated from Competitor Analyzer) */}
          {researchNotes && (
            <div className="overflow-hidden rounded-2xl border border-amber-200 bg-amber-50 shadow-sm">
              <button
                onClick={() => setResearchNotesOpen((v) => !v)}
                className="flex w-full cursor-pointer items-center justify-between px-4 py-3.5 text-left"
              >
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-amber-500" />
                  <h2 className="text-xs font-bold text-amber-800">Research Notes</h2>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold text-amber-600">From Competitor Analyzer</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); setResearchNotes(null) }}
                    className="cursor-pointer text-[10px] font-bold text-amber-500 hover:text-amber-700"
                  >
                    Dismiss
                  </button>
                </div>
              </button>
              {researchNotesOpen && (
                <div className="border-t border-amber-200 px-4 py-3 space-y-2">
                  {researchNotes.hookPattern && (
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wide text-amber-600">Hook pattern</p>
                      <p className="text-xs text-amber-900">{researchNotes.hookPattern} · {researchNotes.hookType}</p>
                    </div>
                  )}
                  {researchNotes.framework && (
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wide text-amber-600">Framework</p>
                      <p className="text-xs text-amber-900">{researchNotes.framework}</p>
                    </div>
                  )}
                  {researchNotes.improvements?.length ? (
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wide text-amber-600">Improvements to apply</p>
                      <ul className="mt-1 space-y-1">
                        {researchNotes.improvements.map((tip, i) => (
                          <li key={i} className="flex items-start gap-1.5 text-xs text-amber-900">
                            <span className="mt-0.5 h-1 w-1 shrink-0 rounded-full bg-amber-500" />
                            {tip}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          )}
        </aside>
      </div>

      {/* Schedule modal */}
      {scheduleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/40 px-4">
          <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-5 shadow-xl">
            <h2 className="text-base font-bold text-zinc-900">Schedule post</h2>
            <p className="mt-1 text-sm text-zinc-500">Choose when this post goes live.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="relative">
                <label className="absolute -top-2 left-2.5 bg-white px-1 text-[9px] font-bold uppercase tracking-wider text-teal">Date</label>
                <input
                  type="date"
                  min={todayInput()}
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-teal focus:ring-4 focus:ring-teal/10"
                />
              </div>
              <div className="relative">
                <label className="absolute -top-2 left-2.5 bg-white px-1 text-[9px] font-bold uppercase tracking-wider text-teal">Time</label>
                <input
                  type="time"
                  min={scheduleDate === todayInput() ? nowTimeInput() : undefined}
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-teal focus:ring-4 focus:ring-teal/10"
                />
              </div>
            </div>
            <div className="mt-5 flex gap-2">
              <button
                onClick={() => setScheduleModalOpen(false)}
                className="flex-1 cursor-pointer rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
              >
                Cancel
              </button>
              <button
                onClick={() => void onSchedule()}
                className="flex-1 cursor-pointer rounded-xl bg-teal px-4 py-2.5 text-sm font-bold text-white hover:bg-teal-600"
              >
                Confirm schedule
              </button>
            </div>
          </div>
        </div>
      )}

      {upgradeModal && (
        <UpgradeModal
          currentPlan={billing.plan}
          requiredPlan="Solo"
          reason="feature locked"
          onClose={() => setUpgradeModal(false)}
        />
      )}

      {upgradeProModal && (
        <UpgradeModal
          currentPlan={billing.plan}
          requiredPlan="Pro"
          reason="feature locked"
          onClose={() => setUpgradeProModal(false)}
        />
      )}

      {deleteConfirmIdx !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/40 px-4">
          <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-5 shadow-xl">
            <h2 className="text-base font-bold text-zinc-900">Delete Version {deleteConfirmIdx + 1}?</h2>
            <p className="mt-1.5 text-sm text-zinc-500">This cannot be undone. The content in the editor will stay as-is.</p>
            <div className="mt-5 flex gap-2">
              <button
                onClick={() => setDeleteConfirmIdx(null)}
                className="flex-1 cursor-pointer rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteVersion(deleteConfirmIdx)}
                className="flex-1 cursor-pointer rounded-xl bg-red-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-600"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {approvalModalOpen && (
        <WriterApprovalModal
          draftContent={draftContent}
          draftTitle={resolveTitle()}
          postId={editingId}
          onClose={() => setApprovalModalOpen(false)}
          onSent={() => { setApprovalModalOpen(false); showStatus("Approval request sent.", "success") }}
          onError={(msg) => { setApprovalModalOpen(false); showStatus(msg, "error") }}
        />
      )}
    </>
  )
}

// ── Inline approval modal ────────────────────────────────────────────────────

function WriterApprovalModal({ draftContent, draftTitle, postId, onClose, onSent, onError }: {
  draftContent: string
  draftTitle: string
  postId: string | null
  onClose: () => void
  onSent: () => void
  onError: (msg: string) => void
}) {
  const [reviewerEmail, setReviewerEmail] = useState("")
  const [message, setMessage] = useState("")
  const [isSending, setIsSending] = useState(false)

  const onSubmit = async () => {
    if (!reviewerEmail.trim()) return
    setIsSending(true)
    try {
      const res = await fetch("/api/approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reviewerEmail: reviewerEmail.trim(),
          postTitle: draftTitle,
          postContent: draftContent,
          message: message.trim(),
          postId,
        }),
      })
      const data = await res.json() as { error?: string }
      if (!res.ok) throw new Error(data.error || "Failed to send")
      onSent()
    } catch (e) {
      onError((e as Error).message)
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/40 px-4">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-5 shadow-xl">
        <h2 className="text-base font-bold text-zinc-900">Send for approval</h2>
        <p className="mt-1 text-sm text-zinc-500">The reviewer will get an email link to approve or request changes.</p>
        <div className="mt-4 space-y-3">
          <div>
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-zinc-400">
              Reviewer email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={reviewerEmail}
              onChange={(e) => setReviewerEmail(e.target.value)}
              placeholder="reviewer@company.com"
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-4 py-2.5 text-sm text-zinc-900 outline-none transition-all focus:border-teal focus:bg-white focus:ring-4 focus:ring-teal/10"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-zinc-400">
              Message <span className="font-normal normal-case text-zinc-400">(optional)</span>
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={2}
              placeholder="e.g. Please check tone and facts before we publish."
              className="w-full resize-none rounded-xl border border-zinc-200 bg-zinc-50/50 px-4 py-2.5 text-sm text-zinc-900 outline-none transition-all focus:border-teal focus:bg-white focus:ring-4 focus:ring-teal/10"
            />
          </div>
          <div className="rounded-xl border border-zinc-100 bg-zinc-50 px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-400">Post being sent</p>
            <p className="mt-1 line-clamp-2 text-xs text-zinc-700">{draftTitle}</p>
          </div>
        </div>
        <div className="mt-5 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 cursor-pointer rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
          >
            Cancel
          </button>
          <button
            onClick={() => void onSubmit()}
            disabled={isSending || !reviewerEmail.trim()}
            className="flex-1 cursor-pointer rounded-xl bg-teal px-4 py-2.5 text-sm font-bold text-white hover:bg-teal-600 disabled:opacity-50"
          >
            {isSending ? "Sending..." : "Send for review"}
          </button>
        </div>
      </div>
    </div>
  )
}

