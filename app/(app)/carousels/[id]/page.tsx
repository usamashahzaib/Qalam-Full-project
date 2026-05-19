"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { useWorkspace } from "@/components/providers/WorkspaceProvider"
import { withClientParam, withWorkspaceKey } from "@/lib/workspace-navigation"

type Slide = { id: string; carousel_id: string; order_index: number; title: string | null; content: string | null; image_url: string | null }
type CarouselProject = { id: string; workspace_id: string; post_id: string | null; theme: string | null; created_at: string }

export default function CarouselEditorPage() {
  const params = useParams()
  const id = params?.id as string
  const { state, workspaceId } = useWorkspace()
  const activeClientId = (state as { agency?: { activeClientId?: string | null } }).agency?.activeClientId || null

  const [project, setProject] = useState<CarouselProject | null>(null)
  const [slides, setSlides] = useState<Slide[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeSlide, setActiveSlide] = useState(0)
  const [savingSlide, setSavingSlide] = useState<string | null>(null)
  const [saveStatus, setSaveStatus] = useState<Record<string, string>>({})

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
      setError((e as Error).message)
    } finally {
      setIsLoading(false)
    }
  }, [id, workspaceId])

  useEffect(() => { fetchCarousel() }, [fetchCarousel])

  const updateSlide = (slideId: string, field: "title" | "content", value: string) => setSlides((prev) => prev.map((slide) => slide.id === slideId ? { ...slide, [field]: value } : slide))

  const saveSlide = async (slide: Slide) => {
    setSavingSlide(slide.id)
    setSaveStatus((prev) => ({ ...prev, [slide.id]: "saving" }))
    try {
      const res = await fetch(`/api/carousel/${id}/slides/${slide.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: slide.title, content: slide.content, workspaceKey: workspaceId }) })
      if (!res.ok) { const data = await res.json(); throw new Error(data.error || "Save failed") }
      setSaveStatus((prev) => ({ ...prev, [slide.id]: "saved" }))
      setTimeout(() => setSaveStatus((prev) => ({ ...prev, [slide.id]: "" })), 2000)
    } catch (e) {
      setSaveStatus((prev) => ({ ...prev, [slide.id]: "error: " + (e as Error).message }))
    } finally {
      setSavingSlide(null)
    }
  }

  const exportAsText = () => {
    if (slides.length === 0) return
    const text = slides.map((slide, index) => `--- Slide ${index + 1} ---\n${slide.title ? `TITLE: ${slide.title}\n` : ""}${slide.content || ""}`).join("\n\n")
    const blob = new Blob([text], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `carousel-${id.slice(0, 8)}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (isLoading) return <div className="mx-auto max-w-5xl px-6 py-10"><div className="space-y-4"><div className="h-8 w-48 rounded-lg bg-zinc-200 animate-pulse" /><div className="grid grid-cols-3 gap-4">{[1,2,3].map((i) => <div key={i} className="h-48 rounded-2xl bg-zinc-100 animate-pulse" />)}</div></div></div>
  if (error) return <div className="mx-auto max-w-5xl px-6 py-10"><div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-10 text-center"><p className="font-semibold text-red-700">{error}</p><Link href={withClientParam("/writer", activeClientId)} className="mt-4 inline-block text-sm font-semibold text-teal hover:underline">Back to writer</Link></div></div>

  const currentSlide = slides[activeSlide]

  return (
    <div className="mx-auto max-w-6xl px-6 py-8 sm:px-10 font-jakarta">
      <div className="mb-6 flex items-center justify-between gap-4 flex-wrap"><div><div className="flex items-center gap-2 mb-1"><Link href={withClientParam("/writer", activeClientId)} className="text-xs text-zinc-400 hover:text-zinc-600">Writer</Link><span className="text-xs text-zinc-300">/</span><span className="text-xs text-zinc-500">Carousel Editor</span></div><h1 className="text-2xl font-bold text-zinc-900">Carousel Editor</h1><p className="mt-0.5 text-sm text-zinc-500">{slides.length} slides Â· ID: {id?.slice(0, 8)}...</p></div><div className="flex items-center gap-3"><button onClick={exportAsText} className="rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 transition-colors">Export as text</button><span className="text-xs text-zinc-400 bg-zinc-100 rounded-full px-3 py-1 font-medium">Image export not shipped yet</span></div></div>
      {slides.length === 0 ? <div className="rounded-2xl border border-zinc-200 bg-white px-6 py-16 text-center"><p className="text-zinc-500">No slides found for this carousel.</p></div> : <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6"><div className="space-y-2"><p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">Slides</p>{slides.map((slide, index) => <button key={slide.id} onClick={() => setActiveSlide(index)} className={`w-full rounded-xl border text-left px-3 py-3 transition-all ${activeSlide === index ? "border-teal bg-teal/5 shadow-sm" : "border-zinc-200 bg-white hover:bg-zinc-50"}`}><div className="flex items-start gap-2"><span className={`shrink-0 flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold ${activeSlide === index ? "bg-teal text-white" : "bg-zinc-100 text-zinc-600"}`}>{index + 1}</span><div className="min-w-0"><p className="text-xs font-semibold text-zinc-800 truncate">{slide.title || "Untitled slide"}</p><p className="text-[11px] text-zinc-400 truncate mt-0.5">{slide.content?.slice(0, 50) || "-"}</p></div></div>{saveStatus[slide.id] && <p className={`mt-1.5 text-[10px] font-medium ${saveStatus[slide.id] === "saved" ? "text-emerald-600" : saveStatus[slide.id] === "saving" ? "text-zinc-400" : "text-red-500"}`}>{saveStatus[slide.id]}</p>}</button>)}</div>{currentSlide && <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm"><div className="flex items-center justify-between mb-5"><h2 className="text-sm font-bold text-zinc-700">Slide {activeSlide + 1} of {slides.length}</h2><button onClick={() => saveSlide(currentSlide)} disabled={savingSlide === currentSlide.id} className="rounded-xl bg-teal px-4 py-1.5 text-xs font-bold text-white hover:bg-teal-600 disabled:opacity-50 transition-colors">{savingSlide === currentSlide.id ? "Saving..." : "Save slide"}</button></div><div className="mb-6 rounded-2xl bg-gradient-to-br from-zinc-900 to-zinc-800 p-8 text-white min-h-[200px] flex flex-col justify-between shadow-lg"><div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Slide {activeSlide + 1}</div><div>{currentSlide.title && <h3 className="text-xl font-bold leading-snug mb-3">{currentSlide.title}</h3>}<p className="text-sm text-zinc-300 leading-relaxed">{currentSlide.content}</p></div><div className="text-[10px] text-zinc-500 mt-4">{activeSlide + 1} / {slides.length}</div></div><div className="space-y-4"><div><label className="block text-xs font-semibold text-zinc-600 mb-1.5">Slide Title</label><input type="text" value={currentSlide.title || ""} onChange={(e) => updateSlide(currentSlide.id, "title", e.target.value)} className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm text-zinc-900 outline-none focus:border-teal focus:ring-4 focus:ring-teal/10 transition-all" placeholder="Short headline" /></div><div><label className="block text-xs font-semibold text-zinc-600 mb-1.5">Slide Content</label><textarea value={currentSlide.content || ""} onChange={(e) => updateSlide(currentSlide.id, "content", e.target.value)} rows={4} className="w-full resize-none rounded-xl border border-zinc-200 px-4 py-2.5 text-sm text-zinc-900 outline-none focus:border-teal focus:ring-4 focus:ring-teal/10 transition-all" placeholder="Supporting detail" /></div></div><div className="mt-6 flex justify-between"><button onClick={() => setActiveSlide((value) => Math.max(0, value - 1))} disabled={activeSlide === 0} className="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-40 transition-colors">Previous</button><button onClick={() => setActiveSlide((value) => Math.min(slides.length - 1, value + 1))} disabled={activeSlide === slides.length - 1} className="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-40 transition-colors">Next {">"}</button></div></div>}</div>}
    </div>
  )
}
