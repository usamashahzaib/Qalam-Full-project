"use client"

import { useEffect, useMemo, useState } from "react"

type Slide = {
  slide_number: number
  title: string
  content: string
  visual: string
}

type UsageState = {
  current: number
  limit: number
  remaining: number
  allowed: boolean
}

const ROLES = [
  ["founder", "Founder"],
  ["ceo", "CEO"],
  ["ai_engineer", "AI Engineer"],
  ["hr", "HR"],
  ["sales", "Sales"],
  ["designer", "Designer"],
  ["consultant", "Consultant"],
] as const

export default function CarouselPage() {
  const [topic, setTopic] = useState("")
  const [role, setRole] = useState<(typeof ROLES)[number][0]>("founder")
  const [slideCount, setSlideCount] = useState(5)
  const [slides, setSlides] = useState<Slide[]>([])
  const [projectId, setProjectId] = useState<string | null>(null)
  const [usage, setUsage] = useState<UsageState | null>(null)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)

  const loadUsage = async () => {
    const res = await fetch("/api/carousel/generate", { cache: "no-store" })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) return
    setUsage({
      current: Number(data.current || 0),
      limit: Number(data.limit || 0),
      remaining: Number(data.remaining || 0),
      allowed: Boolean(data.allowed),
    })
  }

  useEffect(() => {
    loadUsage().catch(() => undefined)
  }, [])

  const usageText = useMemo(() => {
    if (!usage) return "Loading carousel usage..."
    return `You have ${usage.remaining} carousels left this month`
  }, [usage])

  const generateCarousel = async () => {
    setError(null)
    setStatus(null)
    setPdfUrl(null)
    if (!topic.trim()) {
      setError("Topic is required")
      return
    }

    setIsGenerating(true)
    try {
      const res = await fetch("/api/carousel/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: topic.trim(), role, slideCount }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Failed to generate carousel")
      setSlides(Array.isArray(data.slides) ? data.slides : [])
      setProjectId(data.projectId || null)
      setUsage(data.usage || usage)
      setStatus("Carousel saved as a draft project.")
      await loadUsage()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setIsGenerating(false)
    }
  }

  const downloadPdf = async () => {
    if (!projectId) return
    setIsDownloading(true)
    setError(null)
    setStatus(null)
    try {
      const res = await fetch(`/api/carousel/${projectId}/pdf`, { method: "POST" })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.pdfUrl) throw new Error(data.error || "Failed to generate PDF")
      setPdfUrl(data.pdfUrl)
      const a = document.createElement("a")
      a.href = data.pdfUrl
      a.download = `carousel-${projectId.slice(0, 8)}.pdf`
      a.click()
      setStatus("PDF ready.")
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setIsDownloading(false)
    }
  }

  const saveToLibrary = async () => {
    if (!projectId) return
    setIsSaving(true)
    setError(null)
    setStatus(null)
    try {
      setStatus("Saved to library.")
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-10 sm:px-10 font-jakarta">
      <div className="mb-6 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h1 className="text-2xl font-bold text-zinc-900">Carousel Generator</h1>
        <p className="mt-2 text-sm text-zinc-600">{usageText}</p>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <label className="block md:col-span-3">
            <span className="mb-1 block text-xs font-semibold text-zinc-600">Topic</span>
            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. LinkedIn content strategy for B2B founders"
              className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm outline-none focus:border-teal focus:ring-4 focus:ring-teal/10"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-zinc-600">Role</span>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as (typeof ROLES)[number][0])}
              className="w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm outline-none focus:border-teal focus:ring-4 focus:ring-teal/10"
            >
              {ROLES.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-zinc-600">Slide count (5-10)</span>
            <input
              type="number"
              min={5}
              max={10}
              value={slideCount}
              onChange={(e) => setSlideCount(Math.min(10, Math.max(5, Number(e.target.value) || 5)))}
              className="w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm outline-none focus:border-teal focus:ring-4 focus:ring-teal/10"
            />
          </label>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={generateCarousel}
            disabled={isGenerating}
            className="rounded-xl bg-zinc-900 px-5 py-2.5 text-sm font-bold text-white hover:bg-zinc-800 disabled:opacity-50"
          >
            {isGenerating ? "Generating..." : "Generate Carousel"}
          </button>
          <button
            onClick={downloadPdf}
            disabled={!projectId || isDownloading}
            className="rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
          >
            {isDownloading ? "Preparing PDF..." : "Download PDF"}
          </button>
          <button
            onClick={saveToLibrary}
            disabled={!projectId || isSaving}
            className="rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
          >
            {isSaving ? "Saving..." : "Save to Library"}
          </button>
        </div>

        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
        {status ? <p className="mt-3 text-sm text-zinc-600">{status}</p> : null}
        {pdfUrl ? <a href={pdfUrl} download={`carousel-${projectId?.slice(0, 8) || "qalam"}.pdf`} className="mt-3 inline-flex text-xs font-semibold text-teal hover:text-teal-700">Download link ready</a> : null}
      </div>

      {!slides.length ? (
        <div className="rounded-2xl border border-zinc-200 bg-white px-6 py-16 text-center text-sm text-zinc-500">
          Generate a carousel to preview slides here.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {slides.map((slide) => (
            <article key={slide.slide_number} className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">Slide {slide.slide_number}</p>
              <h3 className="mt-2 text-lg font-bold text-zinc-900">{slide.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-700">{slide.content}</p>
              <p className="mt-3 border-t border-zinc-100 pt-3 text-xs text-zinc-500">Visual: {slide.visual}</p>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
