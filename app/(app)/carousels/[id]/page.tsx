"use client"

import { useCallback, useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { useWorkspace } from "@/components/providers/WorkspaceProvider"
import { LockedFeature } from "@/components/LockedFeature"
import { withClientParam, withWorkspaceKey } from "@/lib/workspace-navigation"
import { CAROUSEL_THEMES, DEFAULT_THEME_ID } from "@/lib/carousel-themes"
import type { CarouselTheme } from "@/types/carousel"

type Slide = { id: string; carousel_id: string; order_index: number; title: string | null; content: string | null; image_url: string | null }
type CarouselProject = { id: string; workspace_id: string; post_id: string | null; theme: string | null; created_at: string }

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
  const [selectedTheme, setSelectedTheme] = useState<CarouselTheme>(
    () => CAROUSEL_THEMES.find((t) => t.id === DEFAULT_THEME_ID) ?? CAROUSEL_THEMES[0]
  )

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
      // Only redirect on genuine not-found; show error for anything else
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

  const exportAsPdf = () => {
    if (!slides.length) return
    const esc = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    const html = slides.map((slide, index) => `
      <section class="page">
        <div class="deck-meta">
          <div><strong>Qalam Carousel</strong> - byqalam.com</div>
          <div>Slide ${index + 1} / ${slides.length}</div>
        </div>
        <div class="slide-shell">
          <div class="slide-kicker">Slide ${index + 1}</div>
          <h1>${esc(slide.title || `Slide ${index + 1}`)}</h1>
          <p>${esc(slide.content || "").replace(/\n/g, "<br/>")}</p>
          <div class="slide-footer">
            <span>${project?.theme || "LinkedIn carousel"}</span>
            <span>Qalam - byqalam.com</span>
            <span>${new Date(project?.created_at || Date.now()).toLocaleDateString("en-US")}</span>
          </div>
        </div>
      </section>
    `).join("")
    const popup = window.open("", "_blank", "width=900,height=700")
    if (!popup) return
    popup.document.write(`<!doctype html><html><head><title>Carousel ${id.slice(0, 8)}</title><style>
      @page{size:A4 landscape;margin:12mm;}
      *{box-sizing:border-box}
      body{margin:0;font-family:Inter,Arial,sans-serif;background:#f4f5f6;color:#101828}
      .page{page-break-after:always;min-height:100vh;padding:18px 0}
      .deck-meta{display:flex;justify-content:space-between;align-items:center;margin:0 0 12px;color:#475467;font-size:12px}
      .slide-shell{min-height:175mm;border-radius:28px;padding:34px 36px;background:linear-gradient(135deg,#0f172a,#111827 55%,#134e4a);color:#fff;display:flex;flex-direction:column;justify-content:space-between;box-shadow:0 20px 70px rgba(15,23,42,.18)}
      .slide-kicker{font-size:11px;font-weight:700;letter-spacing:.22em;text-transform:uppercase;color:#99f6e4}
      h1{margin:18px 0 18px;font-size:32px;line-height:1.12;max-width:80%}
      p{margin:0;font-size:18px;line-height:1.7;max-width:78%;color:#d1fae5}
      .slide-footer{display:flex;justify-content:space-between;gap:18px;align-items:center;margin-top:28px;padding-top:18px;border-top:1px solid rgba(255,255,255,.14);font-size:12px;color:#a7f3d0}
    </style></head><body>${html}<script>window.onload=()=>window.print()</script></body></html>`)
    popup.document.close()
  }

  if (isLoading) return <div className="mx-auto max-w-5xl px-6 py-10"><div className="space-y-4"><div className="h-8 w-48 animate-pulse rounded-lg bg-zinc-200" /><div className="grid grid-cols-3 gap-4">{[1, 2, 3].map((i) => <div key={i} className="h-48 animate-pulse rounded-2xl bg-zinc-100" />)}</div></div></div>
  if (error) return <div className="mx-auto max-w-5xl px-6 py-10"><div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-10 text-center"><p className="font-semibold text-red-700">{error}</p><Link href={withClientParam("/writer", activeClientId)} className="mt-4 inline-block text-sm font-semibold text-teal hover:underline">Back to writer</Link></div></div>

  const currentSlide = slides[activeSlide]

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
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-zinc-500 whitespace-nowrap">Theme</label>
            <select
              value={selectedTheme.id}
              onChange={(e) => setSelectedTheme(CAROUSEL_THEMES.find((t) => t.id === e.target.value) ?? CAROUSEL_THEMES[0])}
              className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 outline-none focus:border-teal focus:ring-2 focus:ring-teal/10"
            >
              {CAROUSEL_THEMES.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
          <button onClick={exportAsText} className="rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 transition-colors">Export as text</button>
          <LockedFeature feature="Export to PDF" requiredPlan="Pro" className="inline-block">
            <button onClick={exportAsPdf} className="rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 transition-colors">Export as PDF</button>
          </LockedFeature>
        </div>
      </div>

      {!slides.length ? (
        <div className="rounded-2xl border border-zinc-200 bg-white px-6 py-16 text-center"><p className="text-zinc-500">No slides found for this carousel.</p></div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[260px_1fr]">
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

              <div
                className="mb-6 flex min-h-[200px] flex-col justify-between rounded-2xl p-8 shadow-lg"
                style={{ background: selectedTheme.gradient ?? selectedTheme.colors.background, color: selectedTheme.colors.text }}
              >
                <div className="text-[10px] font-bold uppercase tracking-widest" style={{ color: selectedTheme.colors.accent }}>{selectedTheme.name} - Slide {activeSlide + 1}</div>
                <div>
                  {currentSlide.title ? <h3 className="mb-3 text-xl font-bold leading-snug" style={{ color: selectedTheme.colors.text }}>{currentSlide.title}</h3> : null}
                  <p className="text-sm leading-relaxed" style={{ color: selectedTheme.colors.textMuted }}>{currentSlide.content}</p>
                </div>
                <div className="mt-4 flex items-center justify-between border-t pt-3 text-[10px]" style={{ borderColor: `${selectedTheme.colors.accent}33`, color: selectedTheme.colors.textMuted }}>
                  <span>{activeSlide + 1} / {slides.length}</span>
                  <span>{project?.theme || "LinkedIn carousel"}</span>
                </div>
              </div>

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
                <button onClick={() => setActiveSlide((value) => Math.max(0, value - 1))} disabled={activeSlide === 0} className="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-40">Previous</button>
                <button onClick={() => setActiveSlide((value) => Math.min(slides.length - 1, value + 1))} disabled={activeSlide === slides.length - 1} className="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-40">Next</button>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}
