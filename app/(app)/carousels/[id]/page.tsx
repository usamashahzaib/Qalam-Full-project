"use client"

import { useCallback, useEffect, useRef, useState, type RefObject, type ChangeEvent } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { useWorkspace } from "@/components/providers/WorkspaceProvider"
import { LockedFeature } from "@/components/LockedFeature"
import { withClientParam, withWorkspaceKey } from "@/lib/workspace-navigation"
import {
  CANVAS,
  CAROUSEL_THEMES,
  DEFAULT_THEME_ID,
  PREMIUM_THEME_IDS,
  LEGACY_THEME_IDS,
  TONE_THEME_MAP,
  resolveTheme,
  type CarouselThemeId,
} from "@/lib/carousel-design"
import { CoverSlide } from "@/components/carousel/CoverSlide"
import { ContentSlide } from "@/components/carousel/ContentSlide"
import { CTASlide } from "@/components/carousel/CTASlide"
import { generateCarouselZip, generateCarouselPdf, captureCarouselPdfBytes } from "@/lib/carousel-generator"

const SLIDE_SCALE = 0.40
const PREVIEW_W = Math.round(CANVAS.width * SLIDE_SCALE)
const PREVIEW_H = Math.round(CANVAS.height * SLIDE_SCALE)

const ACCENT_SWATCHES = [
  { label: "Theme default", value: "" },
  { label: "Royal blue", value: "#1B3FBF" },
  { label: "Rose", value: "#F43F5E" },
  { label: "Sky", value: "#0EA5E9" },
  { label: "Lime", value: "#84CC16" },
  { label: "Violet", value: "#8B5CF6" },
  { label: "Terracotta", value: "#C85A2A" },
  { label: "Cyan", value: "#06B6D4" },
]

const BG_SWATCHES = [
  { label: "Theme default", value: "" },
  { label: "White", value: "#FFFFFF" },
  { label: "Cream", value: "#FBF5EE" },
  { label: "Ivory", value: "#F5F2EC" },
  { label: "Charcoal", value: "#1A1A1A" },
  { label: "Navy", value: "#0D1B35" },
  { label: "Forest", value: "#1A3D30" },
  { label: "Blush", value: "#F9EDE4" },
]

type Slide = { id: string; carousel_id: string; order_index: number; title: string | null; content: string | null; design_hint: string | null; image_url: string | null }
type DesignSettings = { authorName?: string; designation?: string; accentOverride?: string; customAccent?: string; bgOverride?: string; customBg?: string }
type CarouselProject = { id: string; workspace_id: string; post_id: string | null; theme: string | null; themeId: string | null; designSettings: DesignSettings | null; created_at: string; linkedinPostUrn: string | null; publishedAt: string | null }

const ALL_PREMIUM = PREMIUM_THEME_IDS.map((id) => CAROUSEL_THEMES[id])
const ALL_LEGACY = LEGACY_THEME_IDS.map((id) => CAROUSEL_THEMES[id])

export default function CarouselEditorPage() {
  const params = useParams()
  const router = useRouter()
  const id = params?.id as string
  const { workspaceId, activeClientId } = useWorkspace()
  const [project, setProject] = useState<CarouselProject | null>(null)
  const [slides, setSlides] = useState<Slide[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeSlide, setActiveSlide] = useState(0)
  const [savingSlide, setSavingSlide] = useState<string | null>(null)
  const [saveStatus, setSaveStatus] = useState<Record<string, string>>({})
  const [deletingSlide, setDeletingSlide] = useState(false)
  const [selectedThemeId, setSelectedThemeId] = useState<CarouselThemeId>(DEFAULT_THEME_ID)
  const [accentOverride, setAccentOverride] = useState("")
  const [customAccent, setCustomAccent] = useState("")
  const [bgOverride, setBgOverride] = useState("")
  const [customBg, setCustomBg] = useState("")
  const [authorName, setAuthorName] = useState("")
  const [authorHandle] = useState("")
  const [designation, setDesignation] = useState("")
  const [backgroundPhoto, setBackgroundPhoto] = useState<string | undefined>(undefined)
  const [authorPhotoUrl, setAuthorPhotoUrl] = useState<string | undefined>(undefined)
  const [exporting, setExporting] = useState(false)
  const [exportDone, setExportDone] = useState(false)
  const [pdfExporting, setPdfExporting] = useState(false)
  const [pdfDone, setPdfDone] = useState(false)
  const [showLegacyThemes, setShowLegacyThemes] = useState(false)
  const [linkedinConnected, setLinkedinConnected] = useState(false)
  const [publishOpen, setPublishOpen] = useState(false)
  const [commentary, setCommentary] = useState("")
  const [publishing, setPublishing] = useState(false)
  const [publishError, setPublishError] = useState<string | null>(null)
  const [publishedUrn, setPublishedUrn] = useState<string | null>(null)

  const theme = resolveTheme(selectedThemeId, customAccent || accentOverride || undefined, customBg || bgOverride || undefined)

  // Guards the branding autosave: stays false until the fetched settings have
  // been applied, so loading never triggers a write-back of empty defaults.
  const designReadyRef = useRef(false)

  // Fixed refs for off-screen PNG capture (supports up to 12 slides)
  const ref0 = useRef<HTMLDivElement>(null)
  const ref1 = useRef<HTMLDivElement>(null)
  const ref2 = useRef<HTMLDivElement>(null)
  const ref3 = useRef<HTMLDivElement>(null)
  const ref4 = useRef<HTMLDivElement>(null)
  const ref5 = useRef<HTMLDivElement>(null)
  const ref6 = useRef<HTMLDivElement>(null)
  const ref7 = useRef<HTMLDivElement>(null)
  const ref8 = useRef<HTMLDivElement>(null)
  const ref9 = useRef<HTMLDivElement>(null)
  const ref10 = useRef<HTMLDivElement>(null)
  const ref11 = useRef<HTMLDivElement>(null)
  const slideRefs: RefObject<HTMLDivElement | null>[] = [ref0, ref1, ref2, ref3, ref4, ref5, ref6, ref7, ref8, ref9, ref10, ref11]

  const fetchCarousel = useCallback(async () => {
    if (!id) return
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch(withWorkspaceKey(`/api/carousel/${id}`, workspaceId))
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to load carousel")
      setProject(data.project)
      setSlides(data.slides || [])
      // Prefer the theme persisted on the carousel (assigned at generation or
      // last picked in the editor); fall back to the legacy tone mapping.
      const savedTheme = data.project?.themeId as CarouselThemeId | null
      if (savedTheme && CAROUSEL_THEMES[savedTheme]) {
        setSelectedThemeId(savedTheme)
      } else {
        const mappedTheme = data.project?.theme ? TONE_THEME_MAP[data.project.theme] : undefined
        if (mappedTheme) setSelectedThemeId(mappedTheme)
      }
      // Restore branding so the deck reopens exactly as it was designed.
      const ds = data.project?.designSettings as DesignSettings | null
      if (ds) {
        if (ds.authorName !== undefined) setAuthorName(ds.authorName)
        if (ds.designation !== undefined) setDesignation(ds.designation)
        if (ds.accentOverride !== undefined) setAccentOverride(ds.accentOverride)
        if (ds.customAccent !== undefined) setCustomAccent(ds.customAccent)
        if (ds.bgOverride !== undefined) setBgOverride(ds.bgOverride)
        if (ds.customBg !== undefined) setCustomBg(ds.customBg)
      }
      designReadyRef.current = true
    } catch (e) {
      const msg = (e as Error).message
      if (msg === "not_found" || msg === "not found" || (msg.toLowerCase().includes("not_found") && !msg.includes("column"))) {
        router.replace("/carousels")
        return
      }
      setError(msg)
    } finally {
      setIsLoading(false)
    }
  }, [id, workspaceId, router])

  useEffect(() => { fetchCarousel() }, [fetchCarousel])

  useEffect(() => {
    fetch(`/api/linkedin/profile?workspaceKey=${encodeURIComponent(workspaceId)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        setLinkedinConnected(Boolean(data?.connected))
        if (data?.connected && data.avatar) setAuthorPhotoUrl(data.avatar)
      })
      .catch(() => {})
  }, [workspaceId])

  useEffect(() => {
    if (project?.linkedinPostUrn) setPublishedUrn(project.linkedinPostUrn)
  }, [project])

  // Fire-and-forget persistence of design choices so the deck reopens the way
  // it was left. Failures are non-fatal (columns may not exist pre-migration).
  const persistDesign = useCallback((patch: { themeId?: string; designSettings?: DesignSettings }) => {
    fetch(`/api/carousel/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...patch, workspaceKey: workspaceId }),
    }).catch(() => {})
  }, [id, workspaceId])

  const selectTheme = (themeId: CarouselThemeId) => {
    setSelectedThemeId(themeId)
    persistDesign({ themeId })
  }

  // Debounced autosave of branding fields (photos stay local: data URLs are
  // too large for a settings column).
  useEffect(() => {
    if (!designReadyRef.current) return
    const timer = setTimeout(() => {
      persistDesign({ designSettings: { authorName, designation, accentOverride, customAccent, bgOverride, customBg } })
    }, 800)
    return () => clearTimeout(timer)
  }, [authorName, designation, accentOverride, customAccent, bgOverride, customBg, persistDesign])

  const updateSlide = (slideId: string, field: "title" | "content", value: string) =>
    setSlides((prev) => prev.map((slide) => slide.id === slideId ? { ...slide, [field]: value } : slide))

  const saveSlide = async (slide: Slide) => {
    setSavingSlide(slide.id)
    setSaveStatus((prev) => ({ ...prev, [slide.id]: "saving" }))
    try {
      const res = await fetch(`/api/carousel/${id}/slides/${slide.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: slide.title, content: slide.content, workspaceKey: workspaceId }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Save failed")
      }
      setSaveStatus((prev) => ({ ...prev, [slide.id]: "saved" }))
      setTimeout(() => setSaveStatus((prev) => ({ ...prev, [slide.id]: "" })), 2000)
    } catch (e) {
      setSaveStatus((prev) => ({ ...prev, [slide.id]: `error: ${(e as Error).message}` }))
    } finally {
      setSavingSlide(null)
    }
  }

  const deleteSlide = async (slide: Slide) => {
    if (slides.length <= 2) { setError("Cannot delete - minimum 2 slides required"); return }
    if (!window.confirm(`Delete slide ${slide.order_index + 1}? This cannot be undone.`)) return
    setDeletingSlide(true)
    try {
      const res = await fetch(withWorkspaceKey(`/api/carousel/${id}/slides/${slide.id}`, workspaceId), { method: "DELETE" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Delete failed")
      const next = slides.filter((s) => s.id !== slide.id).map((s, i) => ({ ...s, order_index: i }))
      setSlides(next)
      setActiveSlide((prev) => Math.min(prev, next.length - 1))
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setDeletingSlide(false)
    }
  }

  const exportAsText = () => {
    if (!slides.length) return
    const text = slides.map((slide, index) =>
      `--- Slide ${index + 1} ---\n${slide.title ? `TITLE: ${slide.title}\n` : ""}${slide.content || ""}`
    ).join("\n\n")
    const blob = new Blob([text], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `carousel-${id.slice(0, 8)}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleExportPdf = async () => {
    if (!slides.length || pdfExporting) return
    setPdfExporting(true)
    try {
      await generateCarouselPdf(slideRefs.slice(0, slides.length), `carousel-${id.slice(0, 8)}`)
      setPdfDone(true)
      setTimeout(() => setPdfDone(false), 3000)
    } catch (e) {
      console.error("PDF export failed:", e)
    } finally {
      setPdfExporting(false)
    }
  }

  const defaultCommentary = () =>
    slides.map((slide) => slide.title).filter(Boolean).join("\n").slice(0, 2800)

  const openPublishModal = () => {
    setPublishError(null)
    if (!commentary.trim()) setCommentary(defaultCommentary())
    setPublishOpen(true)
  }

  const handlePublish = async () => {
    if (!slides.length || publishing) return
    setPublishing(true)
    setPublishError(null)
    try {
      // Capture the same branded render (author name, photo, background,
      // theme) the preview and "Export PDF" button show - the server has no
      // copy of that branding to rebuild it from, so publishing must send
      // exactly what the user has been looking at.
      const pdfBytes = await captureCarouselPdfBytes(slideRefs.slice(0, slides.length))
      const form = new FormData()
      form.set("commentary", commentary)
      form.set("pdf", new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" }), `carousel-${id.slice(0, 8)}.pdf`)

      const res = await fetch(withWorkspaceKey(`/api/carousel/${id}/publish`, workspaceId), {
        method: "POST",
        body: form,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Publish failed")
      setPublishedUrn(data.postUrn || null)
      setPublishOpen(false)
    } catch (e) {
      setPublishError((e as Error).message)
    } finally {
      setPublishing(false)
    }
  }

  const handleExportZip = async () => {
    if (!slides.length || exporting) return
    setExporting(true)
    try {
      await generateCarouselZip(slideRefs.slice(0, slides.length), `carousel-${id.slice(0, 8)}`)
      setExportDone(true)
      setTimeout(() => setExportDone(false), 3000)
    } catch (e) {
      console.error("Export failed:", e)
    } finally {
      setExporting(false)
    }
  }

  const handleBgPhotoChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => setBackgroundPhoto(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  function renderSlideEl(slide: Slide, index: number) {
    const shared = {
      authorName: authorName || undefined,
      authorHandle: authorHandle || undefined,
      designation: designation || undefined,
      authorPhotoUrl,
      theme,
      backgroundPhoto,
    }
    const isFirst = index === 0
    const isLast = index === slides.length - 1
    if (isFirst) return (
      <CoverSlide
        title={slide.title || "Untitled"}
        totalSlides={slides.length}
        {...shared}
      />
    )
    if (isLast && slides.length > 2) return (
      <CTASlide
        title={slide.title || "Key Takeaway"}
        body={slide.content || ""}
        totalSlides={slides.length}
        slideNumber={index + 1}
        {...shared}
      />
    )
    return (
      <ContentSlide
        title={slide.title || ""}
        body={slide.content || ""}
        slideNumber={index + 1}
        totalSlides={slides.length}
        authorName={authorName || undefined}
        authorPhotoUrl={authorPhotoUrl}
        theme={theme}
        backgroundPhoto={backgroundPhoto}
        layoutHint={slide.design_hint}
      />
    )
  }

  if (isLoading) return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-zinc-200" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <div key={i} className="h-48 animate-pulse rounded-2xl bg-zinc-100" />)}
        </div>
      </div>
    </div>
  )

  if (error) {
    const friendlyError = error.toLowerCase().includes("minimum") ? error
      : error.toLowerCase().includes("permission") || error === "403" ? "You don't have permission to view this carousel."
      : error.toLowerCase().includes("session") || error === "401" ? "Session expired. Please refresh the page."
      : "Something went wrong. Please go back and try again."
    return (
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-10 text-center">
          <p className="font-semibold text-red-700">{friendlyError}</p>
          <Link href={withClientParam("/writer", activeClientId)} className="mt-4 inline-block text-sm font-semibold text-teal hover:underline">Back to writer</Link>
        </div>
      </div>
    )
  }

  const currentSlide = slides[activeSlide]

  return (
    <div className="mx-auto max-w-6xl px-6 py-8 sm:px-10 font-jakarta">

      {/* ── Header ── */}
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <Link href={withClientParam("/writer", activeClientId)} className="text-xs text-zinc-400 hover:text-zinc-600">Writer</Link>
            <span className="text-xs text-zinc-300">/</span>
            <Link href={withClientParam("/carousels", activeClientId)} className="text-xs text-zinc-400 hover:text-zinc-600">Carousels</Link>
            <span className="text-xs text-zinc-300">/</span>
            <span className="text-xs text-zinc-500">Editor</span>
          </div>
          <h1 className="text-2xl font-bold text-zinc-900">Carousel Editor</h1>
          <p className="mt-0.5 text-sm text-zinc-500">{slides.length} slides - {project?.theme || "LinkedIn carousel"}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={exportAsText} className="rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 transition-colors">
            Export text
          </button>
          <LockedFeature feature="Export to PDF" requiredPlan="Pro" className="inline-block">
            <button
              onClick={() => void handleExportPdf()}
              disabled={pdfExporting || !slides.length}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-all ${
                pdfDone ? "bg-emerald-600 text-white" : pdfExporting ? "cursor-not-allowed bg-zinc-200 text-zinc-400 border border-zinc-300" : "bg-zinc-900 text-white hover:bg-zinc-800"
              }`}
            >
              {pdfExporting ? (
                <><svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Building PDF...</>
              ) : pdfDone ? "PDF Downloaded!" : (
                <><svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>Export PDF</>
              )}
            </button>
          </LockedFeature>
          <button
            onClick={() => void handleExportZip()}
            disabled={exporting || !slides.length}
            className={`flex items-center gap-2 rounded-xl border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 transition-all hover:bg-zinc-50 ${exporting ? "opacity-50" : ""}`}
          >
            {exporting ? (
              <><svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Exporting...</>
            ) : exportDone ? "ZIP Downloaded!" : "Export PNG ZIP"}
          </button>
          <LockedFeature feature="LinkedIn publishing" requiredPlan="Solo" className="inline-block">
            {linkedinConnected ? (
              <button
                onClick={openPublishModal}
                disabled={!slides.length}
                className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-all ${
                  publishedUrn ? "bg-emerald-600 text-white" : "bg-teal text-white hover:bg-teal-600"
                }`}
              >
                {publishedUrn ? "Published to LinkedIn" : "Publish to LinkedIn"}
              </button>
            ) : (
              <Link
                href={withClientParam("/settings", activeClientId)}
                className="rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-500 transition-colors hover:bg-zinc-50"
                title="Connect LinkedIn in Settings to publish"
              >
                Connect LinkedIn to publish
              </Link>
            )}
          </LockedFeature>
        </div>
      </div>

      {/* ── Branding + Design ── */}
      <div className="mb-5 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <p className="mb-4 text-xs font-bold uppercase tracking-wider text-zinc-400">Branding & Design</p>

        {/* Row 1: Author fields */}
        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-500">Your name</label>
            <input type="text" value={authorName} onChange={(e) => setAuthorName(e.target.value)} placeholder="e.g. Sarah Ahmed" className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm text-zinc-900 focus:border-teal/50 focus:outline-none focus:ring-2 focus:ring-teal/20" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-500">Designation / tagline</label>
            <input type="text" value={designation} onChange={(e) => setDesignation(e.target.value)} placeholder="e.g. Founder | LinkedIn Strategist" className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm text-zinc-900 focus:border-teal/50 focus:outline-none focus:ring-2 focus:ring-teal/20" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-500">Background photo (optional)</label>
            <div className="flex items-center gap-2">
              <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-medium text-zinc-600 hover:bg-zinc-100 transition-colors">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                {backgroundPhoto ? "Change photo" : "Upload photo"}
                <input type="file" accept="image/*" className="sr-only" onChange={handleBgPhotoChange} />
              </label>
              {backgroundPhoto && (
                <button onClick={() => setBackgroundPhoto(undefined)} className="text-xs text-zinc-400 hover:text-red-500 transition-colors">Remove</button>
              )}
            </div>
          </div>
        </div>

        {/* Row 2: Theme picker */}
        <div className="mb-3">
          <p className="mb-2 text-xs font-medium text-zinc-500">Theme</p>
          {/* Premium themes */}
          <div className="flex flex-wrap gap-2 mb-2">
            {ALL_PREMIUM.map((t) => (
              <button
                key={t.id}
                onClick={() => selectTheme(t.id as CarouselThemeId)}
                title={t.label}
                className={`relative flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition-all ${
                  selectedThemeId === t.id
                    ? "border-zinc-800 bg-zinc-900 text-white shadow-md"
                    : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400 hover:bg-zinc-50"
                }`}
              >
                <span
                  className="h-4 w-4 flex-shrink-0 rounded-full border border-white/20"
                  style={{ background: t.bgGradient.startsWith("#") ? t.bgGradient : t.bgGradient, boxShadow: `inset 0 0 0 1px rgba(0,0,0,0.12)` }}
                />
                {t.label}
              </button>
            ))}
          </div>
          {/* Legacy themes toggle */}
          <button
            onClick={() => setShowLegacyThemes((v) => !v)}
            className="text-xs text-zinc-400 hover:text-zinc-600 transition-colors"
          >
            {showLegacyThemes ? "Hide classic themes" : "Show classic themes"} {showLegacyThemes ? "↑" : "↓"}
          </button>
          {showLegacyThemes && (
            <div className="mt-2 flex flex-wrap gap-2">
              {ALL_LEGACY.map((t) => (
                <button
                  key={t.id}
                  onClick={() => selectTheme(t.id as CarouselThemeId)}
                  title={t.label}
                  className={`relative flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition-all ${
                    selectedThemeId === t.id
                      ? "border-zinc-800 bg-zinc-900 text-white shadow-md"
                      : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400 hover:bg-zinc-50"
                  }`}
                >
                  <span
                    className="h-4 w-4 flex-shrink-0 rounded-full"
                    style={{ background: t.bgGradient, boxShadow: `inset 0 0 0 1px rgba(0,0,0,0.12)` }}
                  />
                  {t.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Row 3: Accent color */}
        <div>
          <p className="mb-1.5 text-xs font-medium text-zinc-500">Accent color override</p>
          <div className="flex flex-wrap items-center gap-1.5">
            {ACCENT_SWATCHES.map((swatch) => (
              <button
                key={swatch.label}
                onClick={() => { setAccentOverride(swatch.value); setCustomAccent("") }}
                title={swatch.label}
                className={`h-6 w-6 rounded-full border-2 transition-all ${accentOverride === swatch.value && !customAccent ? "border-zinc-800 scale-110 shadow" : "border-zinc-200 hover:border-zinc-400"}`}
                style={{ background: swatch.value || resolveTheme(selectedThemeId).accentColor }}
              />
            ))}
            <label className="relative h-6 w-6 cursor-pointer" title="Pick custom color">
              <input
                type="color"
                className="sr-only"
                value={customAccent || "#F59E0B"}
                onChange={(e) => { setCustomAccent(e.target.value); setAccentOverride("") }}
              />
              <div
                className={`h-6 w-6 rounded-full border-2 flex items-center justify-center transition-all ${customAccent ? "border-zinc-800 scale-110 shadow" : "border-zinc-200 hover:border-zinc-400"}`}
                style={{ background: customAccent || "conic-gradient(red 0%,yellow 17%,lime 33%,cyan 50%,blue 67%,magenta 83%,red 100%)" }}
              >
                {!customAccent && <svg className="w-2.5 h-2.5 text-white drop-shadow" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>}
              </div>
            </label>
          </div>
        </div>

        {/* Row 4: Background color */}
        <div className="mt-4">
          <p className="mb-1.5 text-xs font-medium text-zinc-500">Background color override</p>
          <div className="flex flex-wrap items-center gap-1.5">
            {BG_SWATCHES.map((swatch) => (
              <button
                key={swatch.label}
                onClick={() => { setBgOverride(swatch.value); setCustomBg("") }}
                title={swatch.label}
                className={`h-6 w-6 rounded-full border-2 transition-all ${bgOverride === swatch.value && !customBg ? "border-zinc-800 scale-110 shadow" : "border-zinc-200 hover:border-zinc-400"}`}
                style={{ background: swatch.value || resolveTheme(selectedThemeId).bgGradient, boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.12)" }}
              />
            ))}
            <label className="relative h-6 w-6 cursor-pointer" title="Pick custom background color">
              <input
                type="color"
                className="sr-only"
                value={customBg || "#FFFFFF"}
                onChange={(e) => { setCustomBg(e.target.value); setBgOverride("") }}
              />
              <div
                className={`h-6 w-6 rounded-full border-2 flex items-center justify-center transition-all ${customBg ? "border-zinc-800 scale-110 shadow" : "border-zinc-200 hover:border-zinc-400"}`}
                style={{ background: customBg || "conic-gradient(red 0%,yellow 17%,lime 33%,cyan 50%,blue 67%,magenta 83%,red 100%)" }}
              >
                {!customBg && <svg className="w-2.5 h-2.5 text-white drop-shadow" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>}
              </div>
            </label>
          </div>
        </div>
      </div>

      {!slides.length ? (
        <div className="rounded-2xl border border-zinc-200 bg-white px-6 py-16 text-center">
          <p className="text-zinc-500">No slides found for this carousel.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[260px_1fr]">
          {/* Slide list sidebar */}
          <div className="space-y-2">
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-zinc-400">Slides</p>
            {slides.map((slide, index) => (
              <button key={slide.id} onClick={() => setActiveSlide(index)} className={`w-full rounded-xl border px-3 py-3 text-left transition-all ${activeSlide === index ? "border-teal bg-teal/5 shadow-sm" : "border-zinc-200 bg-white hover:bg-zinc-50"}`}>
                <div className="flex items-start gap-2">
                  <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${activeSlide === index ? "bg-teal text-white" : "bg-zinc-100 text-zinc-600"}`}>{index + 1}</span>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-zinc-800">{slide.title || "Untitled slide"}</p>
                    <p className="mt-0.5 truncate text-[11px] text-zinc-400">{slide.content?.slice(0, 50) || "-"}</p>
                  </div>
                </div>
                {saveStatus[slide.id] ? <p className={`mt-1.5 text-[11px] font-medium ${saveStatus[slide.id] === "saved" ? "text-emerald-600" : saveStatus[slide.id] === "saving" ? "text-zinc-400" : "text-red-500"}`}>{saveStatus[slide.id]}</p> : null}
              </button>
            ))}
          </div>

          {/* Slide editor panel */}
          {currentSlide ? (
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-sm font-bold text-zinc-700">Slide {activeSlide + 1} of {slides.length}</h2>
                <div className="flex items-center gap-2">
                  {slides.length > 2 ? (
                    <button onClick={() => void deleteSlide(currentSlide)} disabled={deletingSlide} className="rounded-xl border border-red-200 px-3 py-1.5 text-xs font-bold text-red-500 transition-colors hover:bg-red-50 disabled:opacity-50">{deletingSlide ? "Deleting..." : "Delete slide"}</button>
                  ) : null}
                  <button onClick={() => saveSlide(currentSlide)} disabled={savingSlide === currentSlide.id} className="rounded-xl bg-teal px-4 py-1.5 text-xs font-bold text-white transition-colors hover:bg-teal-600 disabled:opacity-50">{savingSlide === currentSlide.id ? "Saving..." : "Save slide"}</button>
                </div>
              </div>

              {/* Slide preview */}
              <div className="relative mb-6 flex justify-center">
                <div
                  className="overflow-hidden rounded-2xl shadow-xl"
                  style={{ width: PREVIEW_W, height: PREVIEW_H }}
                >
                  <div style={{ transform: `scale(${SLIDE_SCALE})`, transformOrigin: "top left", width: CANVAS.width, height: CANVAS.height }}>
                    {renderSlideEl(currentSlide, activeSlide)}
                  </div>
                </div>
              </div>

              {/* Edit fields */}
              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-zinc-600">Slide Title</label>
                  <input type="text" value={currentSlide.title || ""} onChange={(e) => updateSlide(currentSlide.id, "title", e.target.value)} className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm text-zinc-900 outline-none transition-all focus:border-teal focus:ring-4 focus:ring-teal/10" placeholder="Short headline" />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-zinc-600">Slide Content</label>
                  <textarea value={currentSlide.content || ""} onChange={(e) => updateSlide(currentSlide.id, "content", e.target.value)} rows={4} className="w-full resize-none rounded-xl border border-zinc-200 px-4 py-2.5 text-sm text-zinc-900 outline-none transition-all focus:border-teal focus:ring-4 focus:ring-teal/10" placeholder="Supporting detail or bullet points (one per line)" />
                </div>
              </div>

              <div className="mt-6 flex justify-between">
                <button onClick={() => setActiveSlide((v) => Math.max(0, v - 1))} disabled={activeSlide === 0} className="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-40">Previous</button>
                <button onClick={() => setActiveSlide((v) => Math.min(slides.length - 1, v + 1))} disabled={activeSlide === slides.length - 1} className="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-40">Next</button>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* Off-screen render nodes for PNG/PDF capture */}
      <div
        aria-hidden="true"
        style={{ position: "fixed", top: 0, left: "-9999px", width: CANVAS.width, pointerEvents: "none", zIndex: -1 }}
      >
        {slides.map((slide, i) => (
          <div key={slide.id} ref={slideRefs[i] as RefObject<HTMLDivElement>} style={{ width: CANVAS.width, height: CANVAS.height }}>
            {renderSlideEl(slide, i)}
          </div>
        ))}
      </div>

      {/* ── Publish to LinkedIn modal ── */}
      {publishOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={() => !publishing && setPublishOpen(false)}>
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-zinc-900">Publish carousel to LinkedIn</h2>
            <p className="mt-1 text-sm text-zinc-500">This uploads the {slides.length}-slide PDF as a LinkedIn document post and shares it immediately - it goes live on your feed right away.</p>
            <div className="mt-4">
              <label className="mb-1.5 block text-xs font-semibold text-zinc-600">Post caption</label>
              <textarea
                value={commentary}
                onChange={(e) => setCommentary(e.target.value)}
                rows={5}
                maxLength={3000}
                className="w-full resize-none rounded-xl border border-zinc-200 px-4 py-2.5 text-sm text-zinc-900 outline-none transition-all focus:border-teal focus:ring-4 focus:ring-teal/10"
                placeholder="What you want to say above the carousel..."
              />
              <p className="mt-1 text-right text-[11px] text-zinc-400">{commentary.length} / 3000</p>
            </div>
            {publishError && <p className="mt-2 text-sm font-medium text-red-600">{publishError}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setPublishOpen(false)} disabled={publishing} className="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-50">Cancel</button>
              <button onClick={() => void handlePublish()} disabled={publishing || !commentary.trim()} className="rounded-xl bg-teal px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-teal-600 disabled:opacity-50">
                {publishing ? "Publishing..." : "Publish now"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
