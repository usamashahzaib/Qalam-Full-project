"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useWorkspace } from "@/components/providers/WorkspaceProvider"
import { withClientParam } from "@/lib/workspace-navigation"
import { useBilling } from "@/lib/hooks/useBilling"
import { usePosts } from "@/lib/hooks/usePosts"
import { useProfile } from "@/lib/hooks/useProfile"
import { canAccessPlan, getEffectivePlanLimits } from "@/lib/entitlements"
import { DraftCounter } from "@/components/DraftCounter"
import { LockedFeature } from "@/components/LockedFeature"
import { UpgradeModal } from "@/components/UpgradeModal"
import {
  useWriterLogic,
  scoreBarColor,
  scoreTextColor,
  formatVersionTime,
  copyText,
  todayInput,
  nowTimeInput,
  scheduleValidationError,
} from "@/lib/hooks/useWriterLogic"
import { HookCard } from "@/components/writer/HookCard"
import { WriterScheduleModal } from "@/components/writer/WriterScheduleModal"
import { WriterDeleteConfirm } from "@/components/writer/WriterDeleteConfirm"
import { QueueOverlay } from "@/components/QueueOverlay"

import type { Role, FormatKey, HookStyle, HookItem, SlideItem, ScoreData } from "@/lib/hooks/useWriterLogic"

// ─── Constants ────────────────────────────────────────────────────────────────

const ROLE_SUGGESTIONS: string[] = [
  "CEO", "Consultant", "Designer", "Founder", "Freelancer", "HR Leader",
  "Marketer", "Product Manager", "Recruiter", "Sales Leader", "Software Developer",
]

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

// ─── Main Component ───────────────────────────────────────────────────────────

export default function WriterPage() {
  const draftRef = useRef<HTMLTextAreaElement>(null)
  const { workspaceId, activeClientId } = useWorkspace()
  const router = useRouter()
  const { billing } = useBilling()
  const { saveDraft, schedulePost, publishPost } = usePosts()
  const { profile } = useProfile()
  const canPublish = canAccessPlan(billing.plan, "Solo") || Boolean(billing.featureFlags?.scheduling)
  const canUseProTools = canAccessPlan(billing.plan, "Pro")
  const canUseSolo = canAccessPlan(billing.plan, "Solo")
  const canUseCarousel = canUseSolo
  const currentDraftLimit = getEffectivePlanLimits(billing.plan, billing.limits).aiDraftsPerMonth
  const carouselLimit = getEffectivePlanLimits(billing.plan, billing.limits).carouselGenerationsPerMonth

  const searchParams = useSearchParams()
  const initialTopic = searchParams.get("topic") || ""
  const initialFormat: FormatKey = searchParams.get("mode") === "carousel" ? "Carousel" : "Medium"

  const w = useWriterLogic({
    workspaceId,
    billing,
    draftLimit: currentDraftLimit,
    carouselLimit,
    saveDraft,
    schedulePost,
    publishPost,
    initialTopic,
    initialFormat,
    initialRole: profile.title || undefined,
  })

  const {
    topic, setTopic, role, setRole, format, setFormat, goal, setGoal,
    hooks, selectedHook, setSelectedHook, isGeneratingHooks,
    draftContent, setDraftContent, isGeneratingPost,
    versions, editingId, scheduleDate, setScheduleDate, scheduleTime, setScheduleTime, isSaving,
    scores, isScoring, isImproving,
    hookAltOpen, setHookAltOpen, hookAlts, isGeneratingAlts,
    repliesOpen, setRepliesOpen, replyMode, setReplyMode, commentInput, setCommentInput,
    parentCommentInput, setParentCommentInput, replies, isGeneratingReplies, repliesError,
    scheduleModalOpen, setScheduleModalOpen, isPublishing, upgradeModal, setUpgradeModal, upgradeProModal, setUpgradeProModal,
    ctaAltOpen, setCtaAltOpen, ctaAlts, isGeneratingCtaAlts,
    versionsOpen, setVersionsOpen, deleteConfirmIdx, setDeleteConfirmIdx, versionsRef,
    slides, setSlides, isGeneratingSlides, localCarouselUsage,
    approvalModalOpen, setApprovalModalOpen,
    researchNotes, setResearchNotes, researchNotesOpen, setResearchNotesOpen,
    status, showStatus, localDraftUsage, draftLimitHit,
    wordCount, currentVersionIdx, draftHookLine, resolveTitle,
    onGenerateHooks, onGeneratePost, onRegenerate,
    onPushTo90, onImproveHook, applyHookAlt,
    onSaveDraft, onSchedule, onPublish,
    onGenerateReplies,
    onExportText, onExportPdf,
    onRewriteCta, applyCtaAlt,
    loadVersion, deleteVersion,
    onGenerateCarousel, onSaveCarousel,
    demand,
  } = w

  const isCarouselMode = format === "Carousel"
  const step2Visible = !isCarouselMode && (hooks.length > 0 || isGeneratingHooks)
  const step3Visible = !isCarouselMode && draftContent.trim().length > 0
  const slidesVisible = isCarouselMode && (slides.length > 0 || isGeneratingSlides)
  const [mobileTab, setMobileTab] = useState<"writer" | "score" | "slides">("writer")
  const [isPdfDownloading, setIsPdfDownloading] = useState(false)

  useEffect(() => {
    if ((slides.length > 0 || isGeneratingSlides) && isCarouselMode) setMobileTab("slides")
  }, [slides.length, isGeneratingSlides, isCarouselMode])

  const updateSlide = (idx: number, field: "title" | "body", value: string) =>
    setSlides((prev) => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s))

  const deleteSlide = (idx: number) =>
    setSlides((prev) => prev.filter((_, i) => i !== idx).map((s, i) => ({ ...s, number: i + 1 })))

  const addSlide = () =>
    setSlides((prev) => [...prev, { number: prev.length + 1, title: "New slide", body: "", visual_suggestion: "" }])

  const onDownloadCarouselPdf = async () => {
    if (!slides.length) return
    setIsPdfDownloading(true)
    try {
      const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib")
      const pdfDoc = await PDFDocument.create()
      const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
      const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica)

      const wrapText = (text: string, font: typeof boldFont, fontSize: number, maxWidth: number): string[] => {
        const words = text.split(/\s+/)
        const lines: string[] = []
        let current = ""
        for (const word of words) {
          const test = current ? `${current} ${word}` : word
          if (font.widthOfTextAtSize(test, fontSize) > maxWidth && current) {
            lines.push(current)
            current = word
          } else {
            current = test
          }
        }
        if (current) lines.push(current)
        return lines
      }

      const PAGE = 540, PAD = 48, CW = PAGE - PAD * 2

      for (let i = 0; i < slides.length; i++) {
        const slide = slides[i]
        const isFirst = i === 0, isLast = i === slides.length - 1
        const page = pdfDoc.addPage([PAGE, PAGE])

        page.drawRectangle({
          x: 0, y: 0, width: PAGE, height: PAGE,
          color: isFirst ? rgb(0.051, 0.58, 0.533) : isLast ? rgb(0.851, 0.467, 0.024) : rgb(1, 1, 1),
        })

        const titleColor = isFirst || isLast ? rgb(1, 1, 1) : rgb(0.094, 0.094, 0.118)
        const bodyColor = isFirst || isLast ? rgb(0.85, 0.98, 0.96) : rgb(0.322, 0.322, 0.357)
        const muteColor = isFirst || isLast ? rgb(0.85, 0.98, 0.96) : rgb(0.4, 0.4, 0.45)

        const badge = isFirst ? "COVER" : isLast ? "CTA" : `SLIDE ${slide.number}`
        page.drawText(badge, { x: PAD, y: PAGE - 64, size: 9, font: boldFont, color: muteColor })

        const titleLines = wrapText(slide.title || "", boldFont, 26, CW)
        let yPos = PAGE - 96
        for (const line of titleLines.slice(0, 4)) {
          page.drawText(line, { x: PAD, y: yPos, size: 26, font: boldFont, color: titleColor })
          yPos -= 36
        }

        if (slide.body?.trim()) {
          yPos -= 14
          const bodyLines = wrapText(slide.body, regularFont, 13, CW)
          for (const line of bodyLines.slice(0, 10)) {
            page.drawText(line, { x: PAD, y: yPos, size: 13, font: regularFont, color: bodyColor })
            yPos -= 21
          }
        }
      }

      const pdfBytes = await pdfDoc.save()
      const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${(slides[0]?.title ?? "carousel").replace(/[^\w\s-]/g, "").trim().slice(0, 60)}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      setTimeout(() => URL.revokeObjectURL(url), 5000)
      showStatus("PDF downloaded", "success")
    } catch {
      showStatus("PDF generation failed. Try again.", "error")
    } finally {
      setIsPdfDownloading(false)
    }
  }

  const onCreateCarousel = () => {
    if (!draftContent.trim()) return
    try {
      sessionStorage.setItem("carouselSeed", JSON.stringify({ content: draftContent, title: resolveTitle() }))
    } catch { /* ignore */ }
    router.push(withClientParam("/carousels", activeClientId))
  }

  useEffect(() => {
    const el = draftRef.current
    if (!el || !step3Visible) return
    el.style.height = "auto"
    el.style.height = `${el.scrollHeight}px`
  }, [draftContent, step3Visible])

  return (
    <>
      <div className="mx-auto max-w-[1280px] px-4 py-6 lg:px-6">

        {/* Mobile tab bar */}
        {isCarouselMode ? (
          <div className="qalam-writer-tabs mb-4 flex lg:hidden rounded-xl border border-zinc-200 bg-zinc-50 p-1 gap-1">
            <button
              type="button"
              onClick={() => setMobileTab("writer")}
              className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-colors ${mobileTab === "writer" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700"}`}
            >
              Setup
            </button>
            <button
              type="button"
              onClick={() => setMobileTab("slides")}
              className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-colors ${mobileTab === "slides" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700"}`}
            >
              {slides.length > 0 ? `Slides · ${slides.length}` : "Slides"}
            </button>
          </div>
        ) : (
          <div className="qalam-writer-tabs mb-4 flex lg:hidden rounded-xl border border-zinc-200 bg-zinc-50 p-1 gap-1">
            <button
              type="button"
              onClick={() => setMobileTab("writer")}
              className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-colors ${mobileTab === "writer" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700"}`}
            >
              Writer
            </button>
            <button
              type="button"
              onClick={() => setMobileTab("score")}
              className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-colors ${mobileTab === "score" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700"}`}
            >
              {scores ? `Score · ${scores.overall}` : "Score"}
            </button>
          </div>
        )}

        <div className={`grid grid-cols-1 gap-6 ${isCarouselMode ? "" : "lg:grid-cols-[minmax(0,1fr)_360px]"}`}>

        {/* ── LEFT: Writer flow ────────────────────────────────────────── */}
        <div className={`flex flex-col gap-5 ${mobileTab !== "writer" ? "hidden lg:flex" : ""}`}>

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
                  <input
                    type="text"
                    list="role-suggestions"
                    value={role}
                    onChange={(e) => setRole(e.target.value as Role)}
                    placeholder="e.g. Software Engineer, Plumber, Teacher..."
                    className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm font-medium text-zinc-700 outline-none focus:border-teal focus:ring-4 focus:ring-teal/10"
                  />
                  <datalist id="role-suggestions">
                    {ROLE_SUGGESTIONS.map((r) => <option key={r} value={r} />)}
                  </datalist>
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

              {/* Active profile pill */}
              {(profile.name || profile.title) ? (
                <div className="mb-4 flex items-center gap-2">
                  <div className={`flex items-center gap-2 rounded-full border px-3 py-1.5 ${canUseProTools ? "border-teal/25 bg-teal/5" : "border-zinc-200 bg-zinc-50"}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${canUseProTools ? "bg-teal" : "bg-zinc-400"}`} />
                    <span className="text-[11px] font-semibold text-zinc-700">
                      Writing as {[profile.name, profile.title].filter(Boolean).join(", ")}
                    </span>
                    {canUseProTools && (
                      <span className="rounded-full bg-teal/10 px-1.5 py-0.5 text-[9px] font-bold text-teal">Voice active</span>
                    )}
                  </div>
                  <a href="/voice" className="text-[11px] font-semibold text-zinc-400 hover:text-teal transition-colors">Edit</a>
                </div>
              ) : (
                <div className="mb-4">
                  <a href="/voice" className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-zinc-300 px-3 py-1.5 text-[11px] font-semibold text-zinc-400 transition-colors hover:border-teal hover:text-teal">
                    <svg className="h-3 w-3" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="6" r="3" stroke="currentColor" strokeWidth="1.5"/><path d="M2 14c0-3.314 2.686-6 6-6s6 2.686 6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                    Set up your profile - posts will match your voice
                  </a>
                </div>
              )}

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
                      Carousel generation requires <span className="font-bold">Solo</span> or higher. Upgrade to unlock.
                    </div>
                  ) : null}
                  <button
                    onClick={() => void onGenerateCarousel()}
                    disabled={isGeneratingSlides || !topic.trim() || !canUseCarousel}
                    className="w-full cursor-pointer rounded-xl bg-teal py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-teal-600 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isGeneratingSlides ? "Generating slides..." : !canUseCarousel ? "Carousel (Solo+)" : "Generate Carousel"}
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
                    {isGeneratingHooks ? "Generating hooks..." : draftLimitHit ? `Draft limit reached - Upgrade to ${billing.plan === "Free" ? "Solo" : billing.plan === "Solo" ? "Pro" : "a higher plan"}` : "Generate Hooks"}
                  </button>
                  <DraftCounter compact className="mt-2" />
                </>
              )}
              {status && !step2Visible && !step3Visible && !slidesVisible && (
                <p className={`mt-2 text-xs font-medium ${status.type === "error" ? "text-red-600" : status.type === "success" ? "text-emerald-600" : "text-zinc-500"}`}>
                  {status.text}
                </p>
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
                {isGeneratingHooks && demand && (
                  <div className="mb-4">
                    <QueueOverlay
                      message={demand.highDemand ? `High demand - you're approximately #${demand.position} in queue` : "Generating your hooks..."}
                      plan={billing.plan}
                      highDemand={demand.highDemand}
                      position={demand.position}
                      estimatedWaitSeconds={demand.estimatedWaitSeconds}
                      onUpgrade={() => setUpgradeModal(true)}
                    />
                  </div>
                )}
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
                  {isGeneratingPost && demand && (
                    <div className="mt-3">
                      <QueueOverlay
                        message={demand.highDemand ? `High demand - you're approximately #${demand.position} in queue` : "Generating your post..."}
                        plan={billing.plan}
                        highDemand={demand.highDemand}
                        position={demand.position}
                        estimatedWaitSeconds={demand.estimatedWaitSeconds}
                        onUpgrade={() => setUpgradeModal(true)}
                      />
                    </div>
                  )}
                </div>
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
                  ref={draftRef}
                  value={draftContent}
                  onChange={(e) => setDraftContent(e.target.value)}
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
                  <button
                    onClick={onCreateCarousel}
                    className="cursor-pointer rounded-xl border border-teal/25 bg-teal/5 px-4 py-2 text-xs font-semibold text-teal transition-colors hover:bg-teal/10"
                  >
                    Make Carousel →
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

                <p className="mt-3 text-xs text-zinc-400">
                  Stay visible between posts with the{" "}
                  <Link href="/comment-generator" className="font-medium text-teal hover:text-teal-700">
                    Comment Generator
                  </Link>
                  .
                </p>
              </div>
            </section>
          )}
        </div>

        {/* ── CAROUSEL EDITOR ─────────────────────────────────────────── */}
        {isCarouselMode && (slides.length > 0 || isGeneratingSlides) && (
          <div className={`${mobileTab !== "slides" ? "hidden lg:block" : ""}`}>
            {isGeneratingSlides ? (
              <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
                <div className="border-b border-zinc-100 bg-zinc-50/60 px-5 py-4">
                  <div className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-teal text-[10px] font-bold text-white">2</span>
                    <span className="text-sm font-bold text-zinc-900">Generating slides...</span>
                    <span className="animate-pulse text-xs text-teal">Working</span>
                  </div>
                </div>
                <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="aspect-square animate-pulse rounded-2xl bg-zinc-100" />
                  ))}
                </div>
              </section>
            ) : (
              <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
                {/* Header */}
                <div className="border-b border-zinc-100 bg-zinc-50/60 px-5 py-3.5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-teal text-[10px] font-bold text-white">2</span>
                      <h2 className="text-sm font-bold text-zinc-900">Carousel slides</h2>
                      <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold text-zinc-500">{slides.length} slides</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={addSlide}
                        className="cursor-pointer rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-zinc-600 transition-colors hover:bg-zinc-50"
                      >
                        + Add slide
                      </button>
                      <button
                        onClick={() => void onGenerateCarousel()}
                        disabled={isGeneratingSlides}
                        className="cursor-pointer rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-zinc-600 transition-colors hover:bg-zinc-50 disabled:opacity-50"
                      >
                        Regenerate
                      </button>
                    </div>
                  </div>
                  <p className="mt-0.5 pl-7 text-xs text-zinc-500">Click any title or body to edit · hover a card to delete</p>
                </div>

                {/* Slide cards */}
                <div className="p-5">
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {slides.map((slide, idx) => {
                      const isFirst = idx === 0
                      const isLast = idx === slides.length - 1
                      return (
                        <div
                          key={slide.number}
                          className={`group relative flex min-h-[220px] flex-col overflow-hidden rounded-2xl border-2 ${
                            isFirst
                              ? "border-teal bg-gradient-to-br from-teal to-teal-700"
                              : isLast
                                ? "border-amber-400 bg-gradient-to-br from-amber-500 to-amber-700"
                                : "border-zinc-200 bg-white"
                          }`}
                        >
                          {/* Badge + delete */}
                          <div className="flex items-center justify-between px-4 pb-2 pt-4">
                            <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                              isFirst || isLast ? "bg-white/20 text-white" : "bg-zinc-900 text-white"
                            }`}>
                              {isFirst ? "Cover" : isLast ? "CTA" : slide.number}
                            </span>
                            <button
                              onClick={() => deleteSlide(idx)}
                              className={`cursor-pointer rounded-lg p-1 opacity-0 transition-opacity group-hover:opacity-100 ${
                                isFirst || isLast
                                  ? "text-white/60 hover:bg-white/10 hover:text-white"
                                  : "text-zinc-300 hover:bg-red-50 hover:text-red-500"
                              }`}
                              aria-label="Delete slide"
                            >
                              <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none">
                                <path d="M2 4h12M5.333 4V2.667a1.333 1.333 0 0 1 1.334-1.334h2.666a1.333 1.333 0 0 1 1.334 1.334V4m2 0v9.333a1.333 1.333 0 0 1-1.334 1.334H4.667a1.333 1.333 0 0 1-1.334-1.334V4h9.334Z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            </button>
                          </div>

                          {/* Editable content */}
                          <div className="flex flex-1 flex-col px-4 pb-3">
                            <textarea
                              value={slide.title}
                              onChange={(e) => updateSlide(idx, "title", e.target.value)}
                              placeholder="Slide title..."
                              rows={2}
                              className={`w-full resize-none bg-transparent text-[15px] font-bold leading-snug outline-none ${
                                isFirst || isLast ? "text-white placeholder:text-white/40" : "text-zinc-900 placeholder:text-zinc-300"
                              }`}
                            />
                            <textarea
                              value={slide.body ?? ""}
                              onChange={(e) => updateSlide(idx, "body", e.target.value)}
                              placeholder="Supporting copy..."
                              rows={3}
                              className={`mt-2 w-full resize-none bg-transparent text-xs leading-relaxed outline-none ${
                                isFirst || isLast ? "text-white/80 placeholder:text-white/30" : "text-zinc-600 placeholder:text-zinc-300"
                              }`}
                            />
                          </div>

                          {/* Visual suggestion */}
                          {slide.visual_suggestion && (
                            <div className={`mt-auto border-t px-4 py-2.5 text-[10px] ${
                              isFirst || isLast ? "border-white/15 text-white/45" : "border-zinc-100 text-zinc-400"
                            }`}>
                              <svg className="mr-1 inline-block h-3 w-3 -translate-y-px" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                <rect x="3" y="7" width="18" height="13" rx="2" strokeLinecap="round" strokeLinejoin="round" />
                                <path d="M8 7l1.5-2.5h5L16 7" strokeLinecap="round" strokeLinejoin="round" />
                                <circle cx="12" cy="13.5" r="3.2" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>{slide.visual_suggestion}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Actions */}
                <div className="border-t border-zinc-100 px-5 py-4">
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => void onSaveCarousel()}
                      disabled={isSaving}
                      className="cursor-pointer rounded-xl bg-teal px-4 py-2.5 text-xs font-bold text-white shadow-sm transition-colors hover:bg-teal-600 disabled:opacity-50"
                    >
                      {isSaving ? "Saving..." : "Save carousel"}
                    </button>
                    <button
                      onClick={() => void onDownloadCarouselPdf()}
                      disabled={isPdfDownloading}
                      className="cursor-pointer rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-xs font-semibold text-zinc-600 transition-colors hover:bg-zinc-50 disabled:opacity-50"
                    >
                      {isPdfDownloading ? "Generating PDF..." : "Download PDF"}
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
                    <button
                      onClick={() => {
                        try {
                          sessionStorage.setItem("carouselSeed", JSON.stringify({
                            content: slides.map((s) => `${s.title}${s.body ? `\n${s.body}` : ""}`).join("\n\n"),
                            title: slides[0]?.title || "Carousel",
                          }))
                        } catch { /* ignore */ }
                        router.push(withClientParam("/carousels", activeClientId))
                      }}
                      className="cursor-pointer rounded-xl border border-teal/25 bg-teal/5 px-4 py-2.5 text-xs font-semibold text-teal transition-colors hover:bg-teal/10"
                    >
                      Open in Carousel Studio →
                    </button>
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
        )}

        {/* ── RIGHT: Sidebar ───────────────────────────────────────────── */}
        {!isCarouselMode && (
        <aside className={`space-y-4 ${mobileTab !== "score" ? "hidden lg:block" : ""}`}>

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
                {scores.overall >= 90 ? (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-center">
                    <p className="text-sm font-bold text-emerald-700">90+ Score Achieved</p>
                    <p className="mt-0.5 text-xs text-emerald-600">This post is ready to publish. Top 5% of LinkedIn content.</p>
                  </div>
                ) : canUseProTools ? (
                  <button
                    onClick={() => void onPushTo90()}
                    disabled={isImproving || !draftContent.trim() || draftLimitHit}
                    className="w-full cursor-pointer rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs font-bold text-amber-800 transition-colors hover:bg-amber-100 disabled:opacity-45"
                  >
                    {isImproving ? "Improving..." : draftLimitHit ? "Upgrade for more drafts" : `Push to 90+ · currently ${scores.overall} (uses 1 draft)`}
                  </button>
                ) : (
                  <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Push to 90+ · Pro only</span>
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-bold text-amber-700">locked</span>
                    </div>
                    <p className="text-xs text-zinc-500 mb-2">Qalam rewrites your draft to fix the lowest-scoring dimension and targets a 90+ overall score - hook sharpness, authority, specificity, and CTA all lifted in one pass.</p>
                    <div className="rounded-lg border border-zinc-100 bg-white px-3 py-2 mb-2">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-400 mb-1">What changes at 90+</p>
                      <ul className="space-y-0.5 text-[10px] text-zinc-600">
                        <li className="flex items-start gap-1.5"><span className="mt-0.5 h-1 w-1 shrink-0 rounded-full bg-amber-400" />Hook rewritten to stop the scroll in the first 2 words</li>
                        <li className="flex items-start gap-1.5"><span className="mt-0.5 h-1 w-1 shrink-0 rounded-full bg-amber-400" />Specific numbers and outcomes added where generic now</li>
                        <li className="flex items-start gap-1.5"><span className="mt-0.5 h-1 w-1 shrink-0 rounded-full bg-amber-400" />CTA tightened to a single clear action</li>
                      </ul>
                    </div>
                    <button
                      onClick={() => setUpgradeProModal(true)}
                      className="w-full cursor-pointer rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-amber-700"
                    >
                      Unlock Pro to push your {scores.overall} to 90+
                    </button>
                  </div>
                )}
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
                  onClick={async () => { await copyText(scores.hashtags.join(" ")); showStatus("Hashtags copied", "success") }}
                  className="cursor-pointer text-xs font-semibold text-teal transition-colors hover:text-teal-700"
                >
                  Copy all
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {scores.hashtags.map((tag) => (
                  <button
                    key={tag}
                    onClick={async () => { await copyText(tag); showStatus(`${tag} copied`, "success") }}
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
                  <div className="mb-3 flex items-center gap-1 rounded-xl border border-zinc-200 bg-zinc-50/50 p-1">
                    <button
                      onClick={() => setReplyMode("comment")}
                      className={`flex-1 cursor-pointer rounded-lg px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-colors ${
                        replyMode === "comment" ? "bg-white text-teal shadow-sm" : "text-zinc-400 hover:text-zinc-600"
                      }`}
                    >
                      Reply to a comment
                    </button>
                    <button
                      onClick={() => setReplyMode("reply")}
                      className={`flex-1 cursor-pointer rounded-lg px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-colors ${
                        replyMode === "reply" ? "bg-white text-teal shadow-sm" : "text-zinc-400 hover:text-zinc-600"
                      }`}
                    >
                      Reply to a reply
                    </button>
                  </div>
                  {replyMode === "reply" && (
                    <div className="mb-3">
                      <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-zinc-400">Original comment (optional, for context)</label>
                      <textarea
                        value={parentCommentInput}
                        onChange={(e) => setParentCommentInput(e.target.value)}
                        rows={2}
                        placeholder="Paste the original comment your reply was under..."
                        className="w-full resize-none rounded-xl border border-zinc-200 bg-zinc-50/50 px-3 py-2.5 text-xs text-zinc-900 outline-none transition-all focus:border-teal focus:bg-white focus:ring-4 focus:ring-teal/10"
                      />
                    </div>
                  )}
                  <div className="mb-3">
                    <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                      {replyMode === "reply" ? "Paste the reply you received" : "Paste a comment to reply to"}
                    </label>
                    <textarea
                      value={commentInput}
                      onChange={(e) => setCommentInput(e.target.value)}
                      rows={3}
                      placeholder={replyMode === "reply" ? "Paste the reply here..." : "Paste a comment here..."}
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
                  {repliesError && (
                    <p className="mt-2 text-xs text-red-600">{repliesError}</p>
                  )}
                  {replies.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {replies.map((r, i) => (
                        <div key={i} className="overflow-hidden rounded-xl border border-zinc-100 bg-zinc-50 p-3">
                          <div className="mb-2 flex items-center justify-between gap-2">
                            <span className="shrink-0 rounded-full border border-zinc-200 bg-white px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-zinc-500">{r.style}</span>
                            <button onClick={() => copyText(r.text)} className="cursor-pointer shrink-0 text-[10px] font-bold text-teal hover:text-teal-700">Copy</button>
                          </div>
                          <p className="w-full break-words text-xs leading-relaxed text-zinc-700">{r.text}</p>
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
        )}
        </div>{/* end grid */}
      </div>

      {scheduleModalOpen && (
        <WriterScheduleModal
          scheduleDate={scheduleDate}
          scheduleTime={scheduleTime}
          setScheduleDate={setScheduleDate}
          setScheduleTime={setScheduleTime}
          todayInput={todayInput}
          nowTimeInput={nowTimeInput}
          onConfirm={() => void onSchedule()}
          onClose={() => setScheduleModalOpen(false)}
        />
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
        <WriterDeleteConfirm
          versionIdx={deleteConfirmIdx}
          onConfirm={deleteVersion}
          onClose={() => setDeleteConfirmIdx(null)}
        />
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
        <p className="mt-1 text-sm text-zinc-500">Share this draft with a colleague, manager, or client before it goes live. They will receive an email with a private link to review the post and either approve it or send back feedback - no Qalam account required.</p>
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

