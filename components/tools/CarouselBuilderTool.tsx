"use client"

import { useRef, useState, type RefObject } from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { FadeUp } from "@/components/FadeUp"
import { CoverSlide } from "@/components/carousel/CoverSlide"
import { ContentSlide } from "@/components/carousel/ContentSlide"
import { CTASlide } from "@/components/carousel/CTASlide"
import { APP_URL, resolvePublicHref } from "@/lib/seo"
import {
  CANVAS,
  CAROUSEL_THEMES,
  DEFAULT_THEME_ID,
  resolveTheme,
  type CarouselThemeId,
  type CarouselSlide,
} from "@/lib/carousel-design"
import { generateCarouselZip } from "@/lib/carousel-generator"

const ACCENT_SWATCHES = [
  { label: "Theme default", value: "" },
  { label: "Rose", value: "#F43F5E" },
  { label: "Sky", value: "#0EA5E9" },
  { label: "Lime", value: "#84CC16" },
  { label: "Violet", value: "#8B5CF6" },
  { label: "Coral", value: "#FB923C" },
  { label: "Cyan", value: "#06B6D4" },
  { label: "Fuchsia", value: "#D946EF" },
]

const PREVIEW_SCALE = 0.26

function buildSlides(text: string): CarouselSlide[] {
  const chunks = text.trim().split(/\n+/).map((p) => p.trim()).filter(Boolean).slice(0, 6)
  if (!chunks.length) return []
  const [first, ...rest] = chunks
  return [
    { type: "cover", title: first },
    ...rest.slice(0, 5).map((part): CarouselSlide => ({
      type: "content",
      title: part.split(".")[0]?.trim().slice(0, 80) || part.slice(0, 80),
      body: part,
    })),
    { type: "cta", title: "Found this useful?", body: "Follow for more insights like this." },
  ]
}

export function CarouselBuilderTool() {
  const [text, setText] = useState("")
  const [authorName, setAuthorName] = useState("")
  const [authorHandle, setAuthorHandle] = useState("")
  const [designation, setDesignation] = useState("")
  const [accentLabel, setAccentLabel] = useState("")
  const [themeId, setThemeId] = useState<CarouselThemeId>(DEFAULT_THEME_ID)
  const [accentOverride, setAccentOverride] = useState("")
  const [customAccent, setCustomAccent] = useState("")
  const [slides, setSlides] = useState<CarouselSlide[]>([])
  const [activeSlide, setActiveSlide] = useState(0)
  const [exporting, setExporting] = useState(false)
  const [exportDone, setExportDone] = useState(false)
  const [building, setBuilding] = useState(false)
  const [error, setError] = useState("")
  const [showAllThemes, setShowAllThemes] = useState(false)
  const themes = Object.values(CAROUSEL_THEMES)
  const visibleThemes = showAllThemes ? themes : themes.slice(0, 5)

  // Fixed refs for up to 8 slides
  const ref0 = useRef<HTMLDivElement>(null)
  const ref1 = useRef<HTMLDivElement>(null)
  const ref2 = useRef<HTMLDivElement>(null)
  const ref3 = useRef<HTMLDivElement>(null)
  const ref4 = useRef<HTMLDivElement>(null)
  const ref5 = useRef<HTMLDivElement>(null)
  const ref6 = useRef<HTMLDivElement>(null)
  const ref7 = useRef<HTMLDivElement>(null)
  const slideRefs: RefObject<HTMLDivElement | null>[] = [ref0, ref1, ref2, ref3, ref4, ref5, ref6, ref7]

  const theme = resolveTheme(themeId, customAccent || accentOverride || undefined)
  const previewW = CANVAS.width * PREVIEW_SCALE
  const previewH = CANVAS.height * PREVIEW_SCALE

  const handleBuild = async () => {
    if (!text.trim()) return
    setBuilding(true)
    setError("")
    setExportDone(false)
    try {
      const res = await fetch("/api/free-tools/carousel-builder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Carousel build failed")
      const aiSlides: CarouselSlide[] = Array.isArray(data.slides)
        ? data.slides.map((s: Partial<CarouselSlide>, i: number) => ({
            type: s.type === "cover" || s.type === "cta" ? s.type : "content",
            title: String(s.title || `Slide ${i + 1}`),
            body: String(s.body || ""),
          }))
        : []
      setSlides(aiSlides.length ? aiSlides : buildSlides(text))
      setActiveSlide(0)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBuilding(false)
    }
  }

  const handleExport = async () => {
    if (!slides.length || exporting) return
    setExporting(true)
    try {
      await generateCarouselZip(slideRefs.slice(0, 1) as RefObject<HTMLDivElement | null>[], "carousel")
      setExportDone(true)
      setTimeout(() => setExportDone(false), 3000)
    } catch (e) {
      console.error("Export failed:", e)
    } finally {
      setExporting(false)
    }
  }

  function renderSlide(slide: CarouselSlide, index: number) {
    const shared = {
      authorName: authorName || undefined,
      authorHandle: authorHandle || undefined,
      designation: designation || undefined,
      theme,
    }
    if (slide.type === "cover") {
      return <CoverSlide title={slide.title} accentLabel={accentLabel || undefined} {...shared} />
    }
    if (slide.type === "cta") {
      return <CTASlide title={slide.title} body={slide.body} {...shared} />
    }
    return (
      <ContentSlide
        title={slide.title}
        body={slide.body || ""}
        slideNumber={index}
        totalSlides={slides.length - 1}
        authorName={authorName || undefined}
        theme={theme}
      />
    )
  }

  return (
    <div className="min-h-screen bg-zinc-50 pt-24">
      {/* Header */}
      <section className="border-b border-zinc-100 bg-white px-6 py-14">
        <div className="mx-auto max-w-[960px]">
          <FadeUp>
            <Link href="/free-tools" className="mb-6 inline-flex items-center gap-1.5 text-sm text-zinc-400 transition-colors hover:text-teal">
              {"<-"} All Free Tools
            </Link>
            <h1 className="mb-3 text-4xl font-extrabold text-zinc-900 sm:text-5xl">LinkedIn Carousel Builder</h1>
            <p className="max-w-xl text-lg leading-relaxed text-zinc-500">
              {themes.length} premium themes. Color picker. Your name, your brand. Build and preview without an account. Download the cover now or sign up free for the full deck.
            </p>
          </FadeUp>
        </div>
      </section>

      <section className="px-6 py-12">
        <div className="mx-auto max-w-[1160px] space-y-8">

          {/* Input + Customize */}
          <FadeUp>
            <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">

              {/* Source content */}
              <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
                <label htmlFor="carousel-source" className="mb-1 block text-sm font-semibold text-zinc-800">Source content</label>
                <p className="mb-3 text-xs text-zinc-400">Each paragraph becomes a slide. Up to 6 paragraphs used.</p>
                <textarea
                  id="carousel-source"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={9}
                  placeholder={"Paste a post, thread, or outline...\n\nEach new paragraph = one slide."}
                  className="w-full resize-none rounded-xl border border-zinc-200 px-4 py-3 text-sm text-zinc-800 placeholder-zinc-400 focus:border-teal/50 focus:outline-none focus:ring-2 focus:ring-teal/30 transition-all"
                />
              </div>

              {/* Customization panel */}
              <div className="space-y-5">

                {/* Author info */}
                <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm space-y-4">
                  <p className="text-sm font-semibold text-zinc-800">Your identity on slides</p>
                  <div>
                    <label htmlFor="carousel-author-name" className="mb-1 block text-xs font-medium text-zinc-500">Your name</label>
                    <input
                      id="carousel-author-name"
                      type="text"
                      value={authorName}
                      onChange={(e) => setAuthorName(e.target.value)}
                      placeholder="e.g. Sarah Ahmed"
                      className="w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm text-zinc-900 focus:border-teal/50 focus:outline-none focus:ring-2 focus:ring-teal/30"
                    />
                  </div>
                  <div>
                    <label htmlFor="carousel-designation" className="mb-1 block text-xs font-medium text-zinc-500">Designation / tagline</label>
                    <input
                      id="carousel-designation"
                      type="text"
                      value={designation}
                      onChange={(e) => setDesignation(e.target.value)}
                      placeholder="e.g. Founder | LinkedIn Strategist"
                      className="w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm text-zinc-900 focus:border-teal/50 focus:outline-none focus:ring-2 focus:ring-teal/30"
                    />
                  </div>
                  <div>
                    <label htmlFor="carousel-handle" className="mb-1 block text-xs font-medium text-zinc-500">Handle (optional)</label>
                    <input
                      id="carousel-handle"
                      type="text"
                      value={authorHandle}
                      onChange={(e) => setAuthorHandle(e.target.value)}
                      placeholder="@yourhandle"
                      className="w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm text-zinc-900 focus:border-teal/50 focus:outline-none focus:ring-2 focus:ring-teal/30"
                    />
                  </div>
                  <div>
                    <label htmlFor="carousel-series-label" className="mb-1 block text-xs font-medium text-zinc-500">Series label (cover chip)</label>
                    <input
                      id="carousel-series-label"
                      type="text"
                      value={accentLabel}
                      onChange={(e) => setAccentLabel(e.target.value)}
                      placeholder="e.g. Leadership Lessons"
                      className="w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm text-zinc-900 focus:border-teal/50 focus:outline-none focus:ring-2 focus:ring-teal/30"
                    />
                  </div>
                </div>

                {/* Theme selector */}
                <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
                  <p className="mb-3 text-sm font-semibold text-zinc-800">Design theme</p>
                  <div className="grid grid-cols-5 gap-2">
                    {visibleThemes.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setThemeId(t.id)}
                        title={`${t.label}: ${t.description}`}
                        className={`relative flex flex-col items-center gap-1.5 rounded-xl border-2 p-2 transition-all ${themeId === t.id ? "border-teal shadow-md" : "border-zinc-200 hover:border-zinc-300"}`}
                      >
                        <div
                          className="h-9 w-full rounded-lg overflow-hidden flex items-center justify-center"
                          style={{ background: t.bgGradient }}
                        >
                          <div className="w-5 h-5 rounded-full" style={{ background: t.circleColor, opacity: 0.9 }} />
                        </div>
                        <span className="text-xs font-semibold leading-none text-zinc-600">{t.label}</span>
                        {themeId === t.id && (
                          <div className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-teal flex items-center justify-center shadow">
                            <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                  {themes.length > 5 && (
                    <button
                      type="button"
                      onClick={() => setShowAllThemes((value) => !value)}
                      aria-expanded={showAllThemes}
                      className="mt-3 inline-flex min-h-7 items-center text-xs font-semibold text-teal hover:text-teal-700"
                    >
                      {showAllThemes ? "Show fewer themes" : `Show ${themes.length - 5} more themes`}
                    </button>
                  )}

                  {/* Accent color swatches */}
                  <div className="mt-4">
                    <p className="mb-2 text-xs font-medium text-zinc-500">Accent color</p>
                    <div className="flex flex-wrap gap-2 items-center">
                      {ACCENT_SWATCHES.map((swatch) => (
                        <button
                          key={swatch.label}
                          onClick={() => { setAccentOverride(swatch.value); setCustomAccent("") }}
                          title={swatch.label}
                          aria-label={`${swatch.label} accent color`}
                          aria-pressed={accentOverride === swatch.value && !customAccent}
                          className={`w-7 h-7 rounded-full border-2 transition-all ${accentOverride === swatch.value && !customAccent ? "border-teal scale-110 shadow-md" : "border-zinc-200 hover:border-zinc-400"}`}
                          style={{ background: swatch.value || resolveTheme(themeId).accentColor }}
                        />
                      ))}
                      {/* Custom color picker */}
                      <label className="relative w-7 h-7 cursor-pointer" title="Pick custom color">
                        <input
                          type="color"
                          className="sr-only"
                          value={customAccent || "#F59E0B"}
                          onChange={(e) => { setCustomAccent(e.target.value); setAccentOverride("") }}
                        />
                        <div
                          className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all ${customAccent ? "border-teal scale-110 shadow-md" : "border-zinc-200 hover:border-zinc-400"}`}
                          style={{
                            background: customAccent || "conic-gradient(red 0%, yellow 17%, lime 33%, cyan 50%, blue 67%, magenta 83%, red 100%)",
                          }}
                        >
                          {!customAccent && (
                            <svg className="w-3 h-3 text-white drop-shadow" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                            </svg>
                          )}
                        </div>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Build button */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={handleBuild}
                  disabled={!text.trim() || building}
                  className={`w-full rounded-xl py-3.5 text-sm font-bold shadow-sm transition-all ${
                    text.trim() && !building
                      ? "bg-teal text-white hover:bg-teal-600"
                      : "cursor-not-allowed bg-zinc-200 text-zinc-400"
                  }`}
                >
                  {building ? "Building slides..." : "Build Carousel with AI"}
                </motion.button>
                {error ? <p className="text-sm text-red-600">{error}</p> : null}
              </div>
            </div>
          </FadeUp>

          {/* Preview + Export */}
          <AnimatePresence>
            {slides.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
                className="space-y-6"
              >
                {/* Controls bar */}
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-bold text-zinc-900">
                      {slides.length > 1 ? `1 of ${slides.length} slides free` : "1 slide ready"}
                    </p>
                    <p className="text-xs text-zinc-400">
                      {slides.length > 1
                        ? `Sign up free to download all ${slides.length} slides.`
                        : "Change theme or accent color - preview updates instantly."}
                    </p>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={handleExport}
                    disabled={exporting}
                    className={`flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-bold shadow-sm transition-all ${
                      exportDone
                        ? "bg-emerald-600 text-white"
                        : exporting
                        ? "cursor-not-allowed bg-zinc-300 text-zinc-500"
                        : "bg-zinc-900 text-white hover:bg-zinc-800"
                    }`}
                  >
                    {exporting ? (
                      <>
                        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Exporting...
                      </>
                    ) : exportDone ? (
                      "Downloaded!"
                    ) : (
                      <>
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Download Slide 1 (PNG)
                      </>
                    )}
                  </motion.button>
                </div>

                {/* Slide thumbnails strip */}
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {slides.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveSlide(i)}
                      aria-label={`Slide ${i + 1} of ${slides.length}`}
                      aria-current={activeSlide === i}
                      className={`shrink-0 rounded-xl border-2 transition-all overflow-hidden ${
                        activeSlide === i ? "border-teal shadow-md" : i > 0 ? "border-zinc-300" : "border-zinc-200 hover:border-zinc-300"
                      }`}
                      style={{ width: previewW, height: previewH, position: "relative" }}
                    >
                      <div
                        style={{
                          width: CANVAS.width,
                          height: CANVAS.height,
                          transform: `scale(${PREVIEW_SCALE})`,
                          transformOrigin: "top left",
                          pointerEvents: "none",
                        }}
                      >
                        {renderSlide(slides[i], i)}
                      </div>
                      {i > 0 && (
                        <div
                          style={{
                            position: "absolute", inset: 0,
                            backdropFilter: "blur(3px)",
                            background: "rgba(10,10,16,0.58)",
                            display: "flex", flexDirection: "column",
                            alignItems: "center", justifyContent: "center", gap: 3,
                          }}
                        >
                          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={2.5} style={{ opacity: 0.9 }}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                          <span style={{ color: "rgba(255,255,255,0.7)", fontSize: 9, fontWeight: 700 }}>{i + 1}</span>
                        </div>
                      )}
                    </button>
                  ))}
                </div>

                {/* Large active preview */}
                <div className="flex flex-col items-center gap-6 lg:flex-row lg:items-start lg:gap-10">
                  <div
                    className="relative shrink-0 overflow-hidden rounded-2xl shadow-2xl"
                    style={{ width: CANVAS.width * 0.45, height: CANVAS.height * 0.45 }}
                  >
                    <div
                      style={{
                        width: CANVAS.width,
                        height: CANVAS.height,
                        transform: "scale(0.45)",
                        transformOrigin: "top left",
                        pointerEvents: "none",
                        filter: activeSlide > 0 ? "blur(10px)" : undefined,
                      }}
                    >
                      {renderSlide(slides[activeSlide], activeSlide)}
                    </div>
                    {activeSlide > 0 && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/40 px-6 text-center">
                        <svg className="h-9 w-9 text-white/90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        <p className="text-sm font-bold text-white">Slide {activeSlide + 1} locked</p>
                        <p className="text-xs text-white/70">Sign up free to get all {slides.length} slides as PNGs.</p>
                        <Link
                          href={resolvePublicHref("/signup")}
                          className="mt-1 rounded-xl bg-teal px-5 py-2.5 text-sm font-bold text-white shadow-lg transition-colors hover:bg-teal-600"
                        >
                          Get all slides free
                        </Link>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 space-y-4">
                    <div className="rounded-2xl border border-zinc-200 bg-white p-5">
                      <p className="mb-3 text-xs font-bold uppercase tracking-wider text-zinc-400">
                        Slide {activeSlide + 1} of {slides.length} &mdash; {slides[activeSlide].type.toUpperCase()}
                      </p>
                      <p className="text-sm font-semibold text-zinc-900">{slides[activeSlide].title}</p>
                      {slides[activeSlide].body && (
                        <p className="mt-2 text-sm text-zinc-500">{slides[activeSlide].body}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setActiveSlide((v) => Math.max(0, v - 1))}
                        disabled={activeSlide === 0}
                        className="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-40 transition-colors"
                      >
                        Previous
                      </button>
                      <button
                        onClick={() => setActiveSlide((v) => Math.min(slides.length - 1, v + 1))}
                        disabled={activeSlide === slides.length - 1}
                        className="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-40 transition-colors"
                      >
                        Next
                      </button>
                    </div>
                    <div className="rounded-2xl border border-zinc-100 bg-zinc-50 p-4 text-xs text-zinc-500">
                      <strong className="text-zinc-700">Export tip:</strong> The free download saves slide 1 as a 1080x1080 PNG. Sign up free to download every slide.
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* CTA block */}
          <FadeUp>
            <div className="rounded-2xl bg-teal p-8 text-center">
              <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-teal-200">Want AI-written carousel content?</p>
              <h2 className="mb-2 text-2xl font-bold text-white">Generate full carousel decks from a single post.</h2>
              <p className="mx-auto mb-6 max-w-md text-sm text-white/60">
                Qalam AI builds the slides, you refine and export. Voice-matched, on-brand, every time.
              </p>
              <Link
                href={`${APP_URL}/login`}
                className="inline-flex items-center gap-2 rounded-xl bg-gold px-7 py-3.5 font-bold text-white shadow-lg transition-colors hover:bg-gold-600"
              >
                Start free {"->"}
              </Link>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* Off-screen render nodes for PNG capture */}
      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          top: 0,
          left: "-9999px",
          width: CANVAS.width,
          pointerEvents: "none",
          zIndex: -1,
        }}
      >
        {slides.map((slide, i) => (
          <div key={i} ref={slideRefs[i] as RefObject<HTMLDivElement>} style={{ width: CANVAS.width, height: CANVAS.height }}>
            {renderSlide(slide, i)}
          </div>
        ))}
      </div>
    </div>
  )
}
