"use client"

import { useCallback, useEffect, useRef, useState, type RefObject } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { useWorkspace } from "@/components/providers/WorkspaceProvider"
import { LockedFeature } from "@/components/LockedFeature"
import { withClientParam, withWorkspaceKey } from "@/lib/workspace-navigation"
import {
  CANVAS,
  CAROUSEL_THEMES,
  DEFAULT_THEME_ID,
  resolveTheme,
  type CarouselThemeId,
} from "@/lib/carousel-design"
import { CoverSlide } from "@/components/carousel/CoverSlide"
import { ContentSlide } from "@/components/carousel/ContentSlide"
import { CTASlide } from "@/components/carousel/CTASlide"
import { generateCarouselZip } from "@/lib/carousel-generator"

const SLIDE_SCALE = 0.40
const PREVIEW_W = Math.round(CANVAS.width * SLIDE_SCALE)
const PREVIEW_H = Math.round(CANVAS.height * SLIDE_SCALE)

const ACCENT_SWATCHES = [
  { label: "Theme default", value: "" },
  { label: "Rose", value: "#F43F5E" },
  { label: "Sky", value: "#0EA5E9" },
  { label: "Lime", value: "#84CC16" },
  { label: "Violet", value: "#8B5CF6" },
  { label: "Coral", value: "#FB923C" },
  { label: "Cyan", value: "#06B6D4" },
]

type Slide = { id: string; carousel_id: string; order_index: number; title: string | null; content: string | null; image_url: string | null }
type CarouselProject = { id: string; workspace_id: string; post_id: string | null; theme: string | null; created_at: string }

const THEME_LIST = Object.values(CAROUSEL_THEMES)

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
  const [pdfStatus, setPdfStatus] = useState<"idle" | "loading" | "error">("idle")
  const [selectedThemeId, setSelectedThemeId] = useState<CarouselThemeId>(DEFAULT_THEME_ID)
  const [accentOverride, setAccentOverride] = useState("")
  const [customAccent, setCustomAccent] = useState("")
  const [authorName, setAuthorName] = useState("")
  const [authorHandle, setAuthorHandle] = useState("")
  const [designation, setDesignation] = useState("")
  const [exporting, setExporting] = useState(false)
  const [exportDone, setExportDone] = useState(false)

  const theme = resolveTheme(selectedThemeId, customAccent || accentOverride || undefined)

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
  }, [id, workspaceId])

  useEffect(() => { fetchCarousel() }, [fetchCarousel])

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
      const res = await fetch(`/api/carousel/${id}/slides/${slide.id}`, { method: "DELETE" })
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

  const exportAsPdf = async () => {
    if (!slides.length) return
    setPdfStatus("loading")
    try {
      const res = await fetch(`/api/carousel/${id}/pdf`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ themeId: selectedThemeId, customAccent: customAccent || accentOverride || undefined }),
      })
      if (!res.ok) { setPdfStatus("error"); return }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `carousel-${id.slice(0, 8)}.pdf`
      a.click()
      URL.revokeObjectURL(url)
      setPdfStatus("idle")
    } catch {
      setPdfStatus("error")
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

  function renderSlideEl(slide: Slide, index: number) {
    const shared = {
      authorName: authorName || undefined,
      authorHandle: authorHandle || undefined,
      designation: designation || undefined,
      theme,
    }
    const isFirst = index === 0
    const isLast = index === slides.length - 1
    if (isFirst) return <CoverSlide title={slide.title || "Untitled"} {...shared} />
    if (isLast && slides.length > 2) return <CTASlide title={slide.title || "Key Takeaway"} body={slide.content || ""} {...shared} />
    return (
      <ContentSlide
        title={slide.title || ""}
        body={slide.content || ""}
        slideNumber={index + 1}
        totalSlides={slides.length}
        authorName={authorName || undefined}
        theme={theme}
      />
    )
  }

  if (isLoading) return <div className="mx-auto max-w-5xl px-6 py-10"><div className="space-y-4"><div className="h-8 w-48 animate-pulse rounded-lg bg-zinc-200" /><div className="grid grid-cols-3 gap-4">{[1, 2, 3].map((i) => <div key={i} className="h-48 animate-pulse rounded-2xl bg-zinc-100" />)}</div></div></div>
  if (error) {
    const friendlyError = error.toLowerCase().includes("minimum") ? error
      : error.toLowerCase().includes("permission") || error === "403" ? "You don't have permission to view this carousel."
      : error.toLowerCase().includes("session") || error === "401" ? "Session expired. Please refresh the page."
      : error.toLowerCase().includes("delete failed") ? "Failed to delete slide. Please try again."
      : error.toLowerCase().includes("save failed") ? "Failed to save changes. Please try again."
      : "Something went wrong. Please go back and try again."
    return <div className="mx-auto max-w-5xl px-6 py-10"><div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-10 text-center"><p className="font-semibold text-red-700">{friendlyError}</p><Link href={withClientParam("/writer", activeClientId)} className="mt-4 inline-block text-sm font-semibold text-teal hover:underline">Back to writer</Link></div></div>
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
            Export as text
          </button>
          <LockedFeature feature="Export to PDF" requiredPlan="Pro" className="inline-block">
            <button
              onClick={() => void exportAsPdf()}
              disabled={pdfStatus === "loading"}
              className="rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 transition-colors disabled:opacity-50"
            >
              {pdfStatus === "loading" ? "Generating..." : pdfStatus === "error" ? "PDF failed - retry" : "Export as PDF"}
            </button>
          </LockedFeature>
          <button
            onClick={() => void handleExportZip()}
            disabled={exporting || !slides.length}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold shadow-sm transition-all ${
              exportDone ? "bg-emerald-600 text-white" : exporting ? "cursor-not-allowed bg-zinc-200 text-zinc-400" : "bg-zinc-900 text-white hover:bg-zinc-800"
            }`}
          >
            {exporting ? (
              <><svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Exporting...</>
            ) : exportDone ? "ZIP Downloaded!" : (
              <><svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>Export PNG ZIP</>
            )}
          </button>
        </div>
      </div>

      {/* ── Branding + Style row ── */}
      <div className="mb-5 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <p className="mb-4 text-xs font-bold uppercase tracking-wider text-zinc-400">Branding & Design</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto]">
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-500">Your name</label>
            <input type="text" value={authorName} onChange={(e) => setAuthorName(e.target.value)} placeholder="e.g. Sarah Ahmed" className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm text-zinc-900 focus:border-teal/50 focus:outline-none focus:ring-2 focus:ring-teal/20" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-500">Designation / tagline</label>
            <input type="text" value={designation} onChange={(e) => setDesignation(e.target.value)} placeholder="e.g. Founder | LinkedIn Strategist" className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm text-zinc-900 focus:border-teal/50 focus:outline-none focus:ring-2 focus:ring-teal/20" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-500">Handle (optional)</label>
            <input type="text" value={authorHandle} onChange={(e) => setAuthorHandle(e.target.value)} placeholder="@yourhandle" className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm text-zinc-900 focus:border-teal/50 focus:outline-none focus:ring-2 focus:ring-teal/20" />
          </div>
          <div className="flex flex-col gap-2 lg:min-w-[200px]">
            <div>
              <p className="mb-1.5 text-xs font-medium text-zinc-500">Theme</p>
              <div className="flex gap-1.5">
                {THEME_LIST.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setSelectedThemeId(t.id as CarouselThemeId)}
                    title={t.label}
                    className={`relative h-7 w-7 rounded-full border-2 transition-all ${selectedThemeId === t.id ? "border-zinc-800 scale-110 shadow-md" : "border-transparent opacity-60 hover:opacity-100 hover:border-zinc-300"}`}
                    style={{ background: t.bgGradient }}
                  >
                    {selectedThemeId === t.id && (
                      <span className="absolute inset-0 flex items-center justify-center">
                        <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                          <path d="M2 6l3 3 5-5" stroke={t.textPrimary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-1.5 text-xs font-medium text-zinc-500">Accent color</p>
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
          </div>
        </div>
      </div>

      {!slides.length ? (
        <div className="rounded-2xl border border-zinc-200 bg-white px-6 py-16 text-center"><p className="text-zinc-500">No slides found for this carousel.</p></div>
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
                {saveStatus[slide.id] ? <p className={`mt-1.5 text-[10px] font-medium ${saveStatus[slide.id] === "saved" ? "text-emerald-600" : saveStatus[slide.id] === "saving" ? "text-zinc-400" : "text-red-500"}`}>{saveStatus[slide.id]}</p> : null}
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

              {/* Slide preview - all slides fully visible */}
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
                  <textarea value={currentSlide.content || ""} onChange={(e) => updateSlide(currentSlide.id, "content", e.target.value)} rows={4} className="w-full resize-none rounded-xl border border-zinc-200 px-4 py-2.5 text-sm text-zinc-900 outline-none transition-all focus:border-teal focus:ring-4 focus:ring-teal/10" placeholder="Supporting detail" />
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

      {/* Off-screen render nodes for PNG capture */}
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
    </div>
  )
}
