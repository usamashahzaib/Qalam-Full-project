"use client"

import { useCallback, useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { useWorkspace } from "@/components/providers/WorkspaceProvider"
import { LockedFeature } from "@/components/LockedFeature"
import { withClientParam, withWorkspaceKey } from "@/lib/workspace-navigation"
import {
  CAROUSEL_THEMES,
  DEFAULT_THEME_ID,
  resolveTheme,
  type CarouselThemeId,
} from "@/lib/carousel-design"
import { CoverSlide } from "@/components/carousel/CoverSlide"
import { ContentSlide } from "@/components/carousel/ContentSlide"
import { CTASlide } from "@/components/carousel/CTASlide"

const SLIDE_SCALE = 0.40
const PREVIEW_W = Math.round(1080 * SLIDE_SCALE)
const PREVIEW_H = Math.round(1080 * SLIDE_SCALE)

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

  const theme = resolveTheme(selectedThemeId)

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
      const next = slides.filter((s) => s.id !== slide.id).map((s, i) => ({ ...s, id: String(i), order_index: i }))
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
    const text = slides.map((slide, index) => `--- Slide ${index + 1} ---\n${slide.title ? `TITLE: ${slide.title}\n` : ""}${slide.content || ""}`).join("\n\n")
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
        body: JSON.stringify({ themeId: selectedThemeId }),
      })
      if (!res.ok) {
        setPdfStatus("error")
        return
      }
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

  if (isLoading) return <div className="mx-auto max-w-5xl px-6 py-10"><div className="space-y-4"><div className="h-8 w-48 animate-pulse rounded-lg bg-zinc-200" /><div className="grid grid-cols-3 gap-4">{[1, 2, 3].map((i) => <div key={i} className="h-48 animate-pulse rounded-2xl bg-zinc-100" />)}</div></div></div>
  if (error) return <div className="mx-auto max-w-5xl px-6 py-10"><div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-10 text-center"><p className="font-semibold text-red-700">{error}</p><Link href={withClientParam("/writer", activeClientId)} className="mt-4 inline-block text-sm font-semibold text-teal hover:underline">Back to writer</Link></div></div>

  const currentSlide = slides[activeSlide]
  const isFirstSlide = activeSlide === 0
  const isLastSlide = activeSlide === slides.length - 1

  return (
    <div className="mx-auto max-w-6xl px-6 py-8 sm:px-10 font-jakarta">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <Link href={withClientParam("/writer", activeClientId)} className="text-xs text-zinc-400 hover:text-zinc-600">Writer</Link>
            <span className="text-xs text-zinc-300">/</span>
            <span className="text-xs text-zinc-500">Carousel Editor</span>
          </div>
          <h1 className="text-2xl font-bold text-zinc-900">Carousel Editor</h1>
          <p className="mt-0.5 text-sm text-zinc-500">{slides.length} slides - {project?.theme || "LinkedIn carousel"}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* Theme picker */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-zinc-500 mr-1">Theme</span>
            {THEME_LIST.map((t) => (
              <button
                key={t.id}
                onClick={() => setSelectedThemeId(t.id as CarouselThemeId)}
                title={t.label}
                className={`relative h-8 w-8 rounded-full border-2 transition-all ${selectedThemeId === t.id ? "border-zinc-800 scale-110 shadow-md" : "border-transparent opacity-60 hover:opacity-100 hover:border-zinc-300"}`}
                style={{ background: t.bgGradient }}
              >
                {selectedThemeId === t.id && (
                  <span className="absolute inset-0 flex items-center justify-center">
                    <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6l3 3 5-5" stroke={t.textPrimary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                )}
              </button>
            ))}
          </div>
          <button onClick={exportAsText} className="rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 transition-colors">Export as text</button>
          <LockedFeature feature="Export to PDF" requiredPlan="Pro" className="inline-block">
            <button
              onClick={() => void exportAsPdf()}
              disabled={pdfStatus === "loading"}
              className="rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 transition-colors disabled:opacity-50"
            >
              {pdfStatus === "loading" ? "Generating..." : pdfStatus === "error" ? "PDF failed - retry" : "Export as PDF"}
            </button>
          </LockedFeature>
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

              {/* Slide preview - scaled real slide components */}
              <div className="mb-6 flex justify-center">
                <div
                  className="overflow-hidden rounded-2xl shadow-xl"
                  style={{ width: PREVIEW_W, height: PREVIEW_H }}
                >
                  <div style={{ transform: `scale(${SLIDE_SCALE})`, transformOrigin: "top left", width: 1080, height: 1080 }}>
                    {isFirstSlide ? (
                      <CoverSlide
                        title={currentSlide.title || "Untitled"}
                        theme={theme}
                      />
                    ) : isLastSlide && slides.length > 2 ? (
                      <CTASlide
                        title={currentSlide.title || "Key Takeaway"}
                        body={currentSlide.content || ""}
                        theme={theme}
                      />
                    ) : (
                      <ContentSlide
                        title={currentSlide.title || ""}
                        body={currentSlide.content || ""}
                        slideNumber={activeSlide + 1}
                        totalSlides={slides.length}
                        theme={theme}
                      />
                    )}
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
    </div>
  )
}
