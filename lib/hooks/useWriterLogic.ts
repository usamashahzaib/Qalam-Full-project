"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  generateHooks as apiGenerateHooks,
  generatePost as apiGeneratePost,
  improvePost as apiImprovePost,
  scorePost as apiScorePost,
  generateHookAlternatives as apiGenerateHookAlts,
  generateReplies as apiGenerateReplies,
  generateCtaAlternatives as apiGenerateCtaAlts,
  generateCarousel as apiGenerateCarousel,
  shareToLinkedIn,
  API_PATHS,
} from "@/lib/api/client"
import { sanitizeGeneratedText } from "@/lib/content-guard"
import { openLinkedInComposer } from "@/lib/linkedin-compose"
import { incrementDraftUsage, readDraftUsage } from "@/lib/usage-tracking"
import type {
  WriterRole as Role,
  PostFormat as FormatKey,
  HookStyle,
  HookItem,
  SlideItem,
  ScoreData,
  DraftVersion,
  StatusMsg,
} from "@/types/writer"

export type { Role, FormatKey, HookStyle, HookItem, SlideItem, ScoreData, DraftVersion, StatusMsg }

// ─── Helpers (extracted from writer/page.tsx) ─────────────────────────────────

export const todayInput = () => {
  const d = new Date()
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 10)
}

export const nowTimeInput = () => {
  const d = new Date()
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset() + 1)
  return d.toISOString().slice(11, 16)
}

export const scheduleValidationError = (date: string, time: string): string | null => {
  if (!date || !time) return "Select date and time"
  // Append local timezone offset so the browser constructs the correct UTC timestamp.
  // Without the offset, `new Date("2026-07-09T09:00:00")` is ambiguous (parsed as local
  // on some engines, UTC on others), causing posts to publish at the wrong time.
  const offsetMinutes = new Date().getTimezoneOffset()
  const sign = offsetMinutes <= 0 ? "+" : "-"
  const abs = Math.abs(offsetMinutes)
  const hh = String(Math.floor(abs / 60)).padStart(2, "0")
  const mm = String(abs % 60).padStart(2, "0")
  const s = new Date(`${date}T${time}:00${sign}${hh}:${mm}`)
  if (Number.isNaN(s.getTime())) return "Select a valid date and time"
  return s.getTime() <= Date.now() ? "Choose a future time" : null
}

export const scoreBarColor = (v: number) =>
  v >= 85 ? "bg-emerald-500" : v >= 50 ? "bg-amber-400" : "bg-red-400"

export const scoreTextColor = (v: number) =>
  v >= 85 ? "text-emerald-600" : v >= 50 ? "text-amber-600" : "text-red-500"

export const formatVersionTime = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })

export async function copyText(v: string) {
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

// ─── Deps injected by the page ────────────────────────────────────────────────

export interface WriterLogicDeps {
  workspaceId: string
  billing: { plan: string; limits?: Record<string, unknown>; featureFlags?: Record<string, boolean> }
  draftLimit: number | "unlimited"
  carouselLimit: number | "unlimited"
  saveDraft: (input: { id: string | null; title: string; content: string; type: string }) => Promise<string>
  schedulePost: (input: { id: string | null; title: string; content: string; type: string; date: string; time: string }) => Promise<string>
  publishPost: (input: { id: string | null; title: string; content: string; type: string; publishedAt: string; externalPostUrn?: string | null }) => Promise<string>
  initialTopic?: string
  initialFormat?: FormatKey
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useWriterLogic({
  workspaceId,
  draftLimit,
  carouselLimit,
  saveDraft,
  schedulePost,
  publishPost,
  initialTopic = "",
  initialFormat,
}: WriterLogicDeps) {

  // ── Step 1 inputs ────────────────────────────────────────────────────────
  const [topic, setTopic] = useState(initialTopic)
  const [role, setRole] = useState<Role>("Founder")
  const [format, setFormat] = useState<FormatKey>(initialFormat ?? "Medium")
  const [goal, setGoal] = useState("")

  // ── Hook generation ──────────────────────────────────────────────────────
  const [hooks, setHooks] = useState<HookItem[]>([])
  const [selectedHook, setSelectedHook] = useState<string | null>(null)
  const [isGeneratingHooks, setIsGeneratingHooks] = useState(false)

  // ── Draft ────────────────────────────────────────────────────────────────
  const [draftContent, setDraftContent] = useState("")
  const [isGeneratingPost, setIsGeneratingPost] = useState(false)
  const [versions, setVersions] = useState<DraftVersion[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [scheduleDate, setScheduleDate] = useState("")
  const [scheduleTime, setScheduleTime] = useState("09:00")
  const [isSaving, setIsSaving] = useState(false)

  // ── Scoring ──────────────────────────────────────────────────────────────
  const [scores, setScores] = useState<ScoreData | null>(null)
  const [isScoring, setIsScoring] = useState(false)
  const [isImproving, setIsImproving] = useState(false)

  // ── Hook alternatives panel ──────────────────────────────────────────────
  const [hookAltOpen, setHookAltOpen] = useState(false)
  const [hookAlts, setHookAlts] = useState<HookItem[]>([])
  const [isGeneratingAlts, setIsGeneratingAlts] = useState(false)

  // ── Comment replies ──────────────────────────────────────────────────────
  const [repliesOpen, setRepliesOpen] = useState(false)
  const [commentInput, setCommentInput] = useState("")
  const [replies, setReplies] = useState<{ style: string; text: string }[]>([])
  const [isGeneratingReplies, setIsGeneratingReplies] = useState(false)

  // ── Publish / scheduling ─────────────────────────────────────────────────
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  const [upgradeModal, setUpgradeModal] = useState(false)
  const [upgradeProModal, setUpgradeProModal] = useState(false)

  // ── CTA rewrite panel ────────────────────────────────────────────────────
  const [ctaAltOpen, setCtaAltOpen] = useState(false)
  const [ctaAlts, setCtaAlts] = useState<string[]>([])
  const [isGeneratingCtaAlts, setIsGeneratingCtaAlts] = useState(false)

  // ── Versions dropdown ────────────────────────────────────────────────────
  const [versionsOpen, setVersionsOpen] = useState(false)
  const [deleteConfirmIdx, setDeleteConfirmIdx] = useState<number | null>(null)
  const versionsRef = useRef<HTMLDivElement>(null)

  // ── Carousel mode ────────────────────────────────────────────────────────
  const [slides, setSlides] = useState<SlideItem[]>([])
  const [isGeneratingSlides, setIsGeneratingSlides] = useState(false)
  const [localCarouselUsage, setLocalCarouselUsage] = useState(0)

  // ── Approval ─────────────────────────────────────────────────────────────
  const [approvalModalOpen, setApprovalModalOpen] = useState(false)

  // ── Research notes ───────────────────────────────────────────────────────
  const [researchNotes, setResearchNotes] = useState<{
    hookPattern?: string; hookType?: string; engagementFactors?: string[]; framework?: string; improvements?: string[]
  } | null>(null)
  const [researchNotesOpen, setResearchNotesOpen] = useState(true)

  // ── Status ───────────────────────────────────────────────────────────────
  const [status, setStatus] = useState<StatusMsg | null>(null)
  const [localDraftUsage, setLocalDraftUsage] = useState(0)

  // Prevents debounce from re-scoring when content was just set by a generation action
  const skipDebounceScore = useRef(false)

  // ── Effects ──────────────────────────────────────────────────────────────

  useEffect(() => {
    fetch(API_PATHS.dashboardStats)
      .then((r) => r.json())
      .then((d: { carouselsUsed?: number; draftsUsed?: number }) => {
        if (typeof d.carouselsUsed === "number") setLocalCarouselUsage(d.carouselsUsed)
        if (typeof d.draftsUsed === "number") setLocalDraftUsage(d.draftsUsed)
      })
      .catch(() => undefined)
  }, [])

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("competitorInsights")
      if (raw) {
        setResearchNotes(JSON.parse(raw) as typeof researchNotes)
        sessionStorage.removeItem("competitorInsights")
      }
    } catch { /* ignore */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("writerLoad")
      if (raw) {
        sessionStorage.removeItem("writerLoad")
        const post = JSON.parse(raw) as { id?: string; title?: string; content?: string }
        if (post.content) setDraftContent(post.content)
        if (post.title) setTopic(post.title)
        if (post.id) setEditingId(post.id)
      }
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

  // ── Derived ──────────────────────────────────────────────────────────────

  const wordCount = useMemo(
    () => (draftContent.trim() ? draftContent.trim().split(/\s+/).length : 0),
    [draftContent]
  )

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

  const draftLimitHit = typeof draftLimit === "number" && localDraftUsage >= draftLimit

  // ── Status helper ─────────────────────────────────────────────────────────

  const statusTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const showStatus = useCallback((text: string, type: StatusMsg["type"] = "info", autoDismiss = true) => {
    clearTimeout(statusTimer.current)
    setStatus({ text, type })
    if (autoDismiss) statusTimer.current = setTimeout(() => setStatus(null), 4000)
  }, [])

  // ── Draft credit helpers ──────────────────────────────────────────────────

  const checkDraftCredit = useCallback(() => {
    if (draftLimitHit) { showStatus("Draft limit reached. Upgrade to Solo for more.", "error"); return false }
    return true
  }, [draftLimitHit, showStatus])

  const useDraftCredit = useCallback((n = 1) => {
    setLocalDraftUsage((prev) => prev + n)
    window.dispatchEvent(new Event("qalam:draft-consumed"))
  }, [])

  // ── Auto-score ────────────────────────────────────────────────────────────

  const autoScore = useCallback(async (content: string) => {
    if (!content.trim() || isScoring) return
    setIsScoring(true)
    try {
      const data = await apiScorePost({ content, role })
      setScores(data)
      showStatus("Draft scored.", "success")
    } finally {
      setIsScoring(false)
    }
  }, [isScoring, role, showStatus])

  // Debounced re-score on manual edits (3 second delay)
  // Skipped when content was just set programmatically by onGeneratePost / onPushTo90
  const scoreDebounce = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => {
    if (!draftContent.trim()) return
    if (skipDebounceScore.current) { skipDebounceScore.current = false; return }
    clearTimeout(scoreDebounce.current)
    scoreDebounce.current = setTimeout(() => void autoScore(draftContent), 3000)
    return () => clearTimeout(scoreDebounce.current)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftContent])

  // ── Step 1: Generate hooks ────────────────────────────────────────────────

  const onGenerateHooks = async () => {
    if (isGeneratingHooks) return
    if (!topic.trim()) { showStatus("Enter a topic first", "error"); return }
    if (!checkDraftCredit()) return

    setIsGeneratingHooks(true)
    setHooks([])
    setSelectedHook(null)
    setDraftContent("")
    setScores(null)
    setHookAltOpen(false)

    try {
      const data = await apiGenerateHooks({ topic: topic.trim(), role, goal: goal.trim() })
      const items = data.hooks.slice(0, 5)
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

  const onGeneratePost = async (hookOverride?: string, originalContent?: string) => {
    if (isGeneratingPost) return
    const hookText = hookOverride || selectedHook
    const isReplacingHook = Boolean(originalContent?.trim())
    if (!hookText) { showStatus("Select a hook first", "error"); return }
    if (!checkDraftCredit()) return

    setIsGeneratingPost(true)
    if (!isReplacingHook) setDraftContent("")
    setScores(null)
    setHookAltOpen(false)
    showStatus(isReplacingHook ? "Replacing hook..." : "Generating post from your hook...", "info", false)

    try {
      const data = await apiGeneratePost({ topic: topic.trim(), hook: hookText, originalContent, role, format, goal: goal.trim() })
      const content = sanitizeGeneratedText(data.content)
      if (!content) throw new Error("AI returned an empty draft")
      skipDebounceScore.current = true
      setDraftContent(content)
      setVersions((p) => [...p.slice(-19), { content, timestamp: new Date().toISOString() }])
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

  const onRegenerate = async () => {
    if (!selectedHook) { showStatus("No hook selected", "error"); return }
    await onGeneratePost(selectedHook)
  }

  // ── Push to 90+ ───────────────────────────────────────────────────────────

  const onPushTo90 = async () => {
    if (isImproving) return
    if (!draftContent.trim()) { showStatus("No draft to improve", "error"); return }
    if (!checkDraftCredit()) return
    setIsImproving(true)
    showStatus("Improving draft toward 90+...", "info", false)
    try {
      const data = await apiImprovePost({ content: draftContent, role, scores: scores || {} })
      const improved = sanitizeGeneratedText(data.content)
      if (!improved) throw new Error("Returned empty content")
      skipDebounceScore.current = true
      setDraftContent(improved)
      setVersions((p) => [...p.slice(-19), { content: improved, timestamp: new Date().toISOString() }])
      if (data.scores) setScores(data.scores)
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
      const data = await apiGenerateHookAlts({ content: draftContent, role })
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
    void onGeneratePost(altText, draftContent)
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
    const err = scheduleValidationError(scheduleDate, scheduleTime)
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
      const shared = await shareToLinkedIn({ content: draftContent, postId: editingId, workspaceKey: workspaceId })
      if (!shared.postUrn) throw new Error("LinkedIn did not confirm the post.")
      const id = await publishPost({
        id: editingId,
        title: resolveTitle(),
        content: draftContent,
        type: "LinkedIn - Text post",
        publishedAt: new Date().toISOString(),
        externalPostUrn: shared.postUrn,
      })
      setEditingId(id)
      showStatus("Published to LinkedIn.", "success")
    } catch (e) {
      await openLinkedInComposer(draftContent)
      showStatus(`${(e as Error).message || "Publish failed"} Text copied; LinkedIn composer opened.`, "error")
    } finally {
      setIsPublishing(false)
    }
  }

  // ── Comment replies ───────────────────────────────────────────────────────

  const onGenerateReplies = async () => {
    if (!commentInput.trim()) return
    setIsGeneratingReplies(true)
    try {
      const data = await apiGenerateReplies({ originalPost: draftContent, comments: commentInput, role })
      setReplies((data.replies || []).slice(0, 3).map((r) => ({ style: r.style, text: r.reply })))
    } catch (e) {
      showStatus((e as Error).message, "error")
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
      const data = await apiGenerateCtaAlts({ content: draftContent, role })
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

  // ── Carousel generation ───────────────────────────────────────────────────

  const onGenerateCarousel = async () => {
    if (!topic.trim()) { showStatus("Enter a topic first", "error"); return }
    if (typeof carouselLimit === "number" && localCarouselUsage >= carouselLimit) {
      showStatus("Carousel limit reached. Upgrade your plan.", "error")
      return
    }

    setIsGeneratingSlides(true)
    setSlides([])
    showStatus("Generating carousel slides...", "info", false)

    try {
      const data = await apiGenerateCarousel({ topic: topic.trim(), role })
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

  // ── Return all state + handlers ───────────────────────────────────────────

  return {
    // Inputs
    topic, setTopic,
    role, setRole,
    format, setFormat,
    goal, setGoal,

    // Hook generation
    hooks, selectedHook, setSelectedHook,
    isGeneratingHooks,

    // Draft
    draftContent, setDraftContent,
    isGeneratingPost,
    versions, editingId,
    scheduleDate, setScheduleDate,
    scheduleTime, setScheduleTime,
    isSaving,

    // Scoring
    scores, isScoring, isImproving,

    // Hook alternatives
    hookAltOpen, hookAlts, isGeneratingAlts,

    // Replies
    repliesOpen, setRepliesOpen,
    commentInput, setCommentInput,
    replies, isGeneratingReplies,

    // Publish
    scheduleModalOpen, setScheduleModalOpen,
    isPublishing,
    upgradeModal, setUpgradeModal,
    upgradeProModal, setUpgradeProModal,

    // CTA
    ctaAltOpen, ctaAlts, isGeneratingCtaAlts,

    // Versions
    versionsOpen, setVersionsOpen,
    deleteConfirmIdx, setDeleteConfirmIdx,
    versionsRef,

    // Carousel
    slides, setSlides,
    isGeneratingSlides,
    localCarouselUsage,

    // Hook alt panel setter
    setHookAltOpen,

    // CTA panel setter
    setCtaAltOpen,

    // Approval
    approvalModalOpen, setApprovalModalOpen,

    // Research notes
    researchNotes, setResearchNotes, researchNotesOpen, setResearchNotesOpen,

    // Status
    status, showStatus,
    localDraftUsage,

    // Derived
    wordCount, currentVersionIdx, draftHookLine, draftLimitHit, resolveTitle,

    // Handlers
    onGenerateHooks, onGeneratePost, onRegenerate,
    onPushTo90, onImproveHook, applyHookAlt,
    onSaveDraft, onSchedule, onPublish,
    onGenerateReplies,
    onExportText, onExportPdf,
    onRewriteCta, applyCtaAlt,
    loadVersion, deleteVersion,
    onGenerateCarousel, onSaveCarousel,
  }
}
