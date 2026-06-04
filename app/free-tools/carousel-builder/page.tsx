"use client"

import { useRef, useState, type RefObject } from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { FadeUp } from "@/components/FadeUp"
import { CoverSlide } from "@/components/carousel/CoverSlide"
import { ContentSlide } from "@/components/carousel/ContentSlide"
import { CTASlide } from "@/components/carousel/CTASlide"
import { CAROUSEL_TOKENS } from "@/lib/carousel-design"
import { generateCarouselZip } from "@/lib/carousel-generator"


type Slide = {
  type: "cover" | "content" | "cta"
  title: string
  body?: string
}

function buildSlides(text: string, authorName: string, authorHandle: string, accentLabel: string): Slide[] {
  const chunks = text
    .trim()
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean)
    .slice(0, 6)

  if (!chunks.length) return []

  const [first, ...rest] = chunks
  const middle: Slide[] = rest.slice(0, 5).map((part) => ({
    type: "content" as const,
    title: part.split(".")[0]?.trim().slice(0, 80) || part.slice(0, 80),
    body: part,
  }))

  return [
    { type: "cover", title: first },
    ...middle,
    { type: "cta", title: "Found this useful?", body: "Follow for more insights like this." },
  ]
}

const PREVIEW_SCALE = 0.26

export default function CarouselBuilderPage() {
  const [text, setText] = useState("")
  const [authorName, setAuthorName] = useState("")
  const [authorHandle, setAuthorHandle] = useState("")
  const [accentLabel, setAccentLabel] = useState("LinkedIn Insights")
  const [slides, setSlides] = useState<Slide[]>([])
  const [activeSlide, setActiveSlide] = useState(0)
  const [exporting, setExporting] = useState(false)
  const [exportDone, setExportDone] = useState(false)

  // Fixed refs for up to 8 slides (hooks must not be called in loops)
  const ref0 = useRef<HTMLDivElement>(null)
  const ref1 = useRef<HTMLDivElement>(null)
  const ref2 = useRef<HTMLDivElement>(null)
  const ref3 = useRef<HTMLDivElement>(null)
  const ref4 = useRef<HTMLDivElement>(null)
  const ref5 = useRef<HTMLDivElement>(null)
  const ref6 = useRef<HTMLDivElement>(null)
  const ref7 = useRef<HTMLDivElement>(null)
  const slideRefs: RefObject<HTMLDivElement | null>[] = [ref0, ref1, ref2, ref3, ref4, ref5, ref6, ref7]

  const handleBuild = () => {
    if (!text.trim()) return
    const built = buildSlides(text, authorName, authorHandle, accentLabel)
    setSlides(built)
    setActiveSlide(0)
    setExportDone(false)
  }

  const handleExport = async () => {
    if (!slides.length || exporting) return
    setExporting(true)
    try {
      const activeRefs = slideRefs.slice(0, slides.length) as RefObject<HTMLDivElement | null>[]
      await generateCarouselZip(activeRefs, "qalam-carousel")
      setExportDone(true)
      setTimeout(() => setExportDone(false), 3000)
    } catch (e) {
      console.error("Export failed:", e)
    } finally {
      setExporting(false)
    }
  }

  const t = CAROUSEL_TOKENS
  const previewW = t.canvasWidth * PREVIEW_SCALE
  const previewH = t.canvasHeight * PREVIEW_SCALE

  function renderSlide(slide: Slide, index: number) {
    if (slide.type === "cover") {
      return (
        <CoverSlide
          title={slide.title}
          accentLabel={accentLabel || undefined}
          authorName={authorName || undefined}
          authorHandle={authorHandle || undefined}
        />
      )
    }
    if (slide.type === "cta") {
      return (
        <CTASlide
          title={slide.title}
          body={slide.body}
          authorName={authorName || undefined}
          authorHandle={authorHandle || undefined}
        />
      )
    }
    return (
      <ContentSlide
        title={slide.title}
        body={slide.body || ""}
        slideNumber={index}
        totalSlides={slides.length - 1}
      />
    )
  }

  return (
    <div className="min-h-screen bg-zinc-50 pt-24">
      {/* Header */}
      <section className="border-b border-zinc-100 bg-white px-6 py-14">
        <div className="mx-auto max-w-[900px]">
          <FadeUp>
            <Link href="/free-tools" className="mb-6 inline-flex items-center gap-1.5 text-sm text-zinc-400 transition-colors hover:text-teal">
              {"<- All Free Tools"}
            </Link>
            <h1 className="mb-3 text-4xl font-extrabold text-zinc-900 sm:text-5xl">
              LinkedIn Carousel Builder
            </h1>
            <p className="max-w-xl text-lg leading-relaxed text-zinc-500">
              Paste your content, customize the slides, and export a ready-to-post PNG carousel pack. No account required.
            </p>
          </FadeUp>
        </div>
      </section>

      <section className="px-6 py-12">
        <div className="mx-auto max-w-[1100px] space-y-8">

          {/* Input panel */}
          <FadeUp>
            <div className="grid gap-6 lg:grid-cols-[1.4fr_0.6fr]">
              {/* Source text */}
              <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
                <label className="mb-2 block text-sm font-semibold text-zinc-800">Source content</label>
                <p className="mb-3 text-xs text-zinc-400">Each paragraph becomes a slide. Up to 6 paragraphs - cover + up to 5 content slides + close.</p>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={8}
                  placeholder={"Paste a post, thread, or outline...\n\nEach new paragraph = one slide."}
                  className="w-full resize-none rounded-xl border border-zinc-200 px-4 py-3 text-sm text-zinc-800 placeholder-zinc-400 focus:border-teal/50 focus:outline-none focus:ring-2 focus:ring-teal/30 transition-all"
                />
              </div>

              {/* Customization */}
              <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm space-y-4">
                <p className="text-sm font-semibold text-zinc-800">Customize</p>

                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-500">Accent label</label>
                  <input
                    type="text"
                    value={accentLabel}
                    onChange={(e) => setAccentLabel(e.target.value)}
                    placeholder="e.g. LinkedIn Insights"
                    className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm text-zinc-900 focus:border-teal/50 focus:outline-none focus:ring-2 focus:ring-teal/30"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-500">Your name</label>
                  <input
                    type="text"
                    value={authorName}
                    onChange={(e) => setAuthorName(e.target.value)}
                    placeholder="e.g. Usama Shahzaib"
                    className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm text-zinc-900 focus:border-teal/50 focus:outline-none focus:ring-2 focus:ring-teal/30"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-500">Handle / tagline</label>
                  <input
                    type="text"
                    value={authorHandle}
                    onChange={(e) => setAuthorHandle(e.target.value)}
                    placeholder="e.g. @usamashahzaib"
                    className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm text-zinc-900 focus:border-teal/50 focus:outline-none focus:ring-2 focus:ring-teal/30"
                  />
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={handleBuild}
                  disabled={!text.trim()}
                  className={`mt-2 w-full rounded-xl py-3 text-sm font-bold transition-all ${
                    text.trim() ? "bg-teal text-white hover:bg-teal-600 shadow-sm" : "cursor-not-allowed bg-zinc-200 text-zinc-400"
                  }`}
                >
                  Build Carousel
                </motion.button>
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
                    <p className="text-sm font-bold text-zinc-900">{slides.length} slides ready</p>
                    <p className="text-xs text-zinc-400">Click a slide thumbnail to preview it</p>
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
                      "ZIP Downloaded!"
                    ) : (
                      <>
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Export PNG ZIP
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
                      className={`shrink-0 rounded-xl border-2 transition-all ${
                        activeSlide === i ? "border-teal shadow-md" : "border-zinc-200 hover:border-zinc-300"
                      }`}
                      style={{ width: previewW, height: previewH, overflow: "hidden", position: "relative" }}
                    >
                      <div
                        style={{
                          width: t.canvasWidth,
                          height: t.canvasHeight,
                          transform: `scale(${PREVIEW_SCALE})`,
                          transformOrigin: "top left",
                          pointerEvents: "none",
                        }}
                      >
                        {renderSlide(slides[i], i)}
                      </div>
                    </button>
                  ))}
                </div>

                {/* Large active preview */}
                <div className="flex flex-col items-center gap-6 lg:flex-row lg:items-start lg:gap-10">
                  <div
                    className="shrink-0 overflow-hidden rounded-2xl shadow-2xl"
                    style={{ width: t.canvasWidth * 0.45, height: t.canvasHeight * 0.45 }}
                  >
                    <div
                      style={{
                        width: t.canvasWidth,
                        height: t.canvasHeight,
                        transform: `scale(0.45)`,
                        transformOrigin: "top left",
                        pointerEvents: "none",
                      }}
                    >
                      {renderSlide(slides[activeSlide], activeSlide)}
                    </div>
                  </div>

                  <div className="flex-1 space-y-4">
                    <div className="rounded-2xl border border-zinc-200 bg-white p-5">
                      <p className="mb-3 text-xs font-bold uppercase tracking-wider text-zinc-400">
                        Slide {activeSlide + 1} of {slides.length} - {slides[activeSlide].type.toUpperCase()}
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
                      <strong className="text-zinc-700">Export tip:</strong> Click &quot;Export PNG ZIP&quot; above. Each slide saves as a 1080x1080 PNG optimized for LinkedIn.
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
              <Link href="/auth/sign-up" className="inline-flex items-center gap-2 rounded-xl bg-gold px-7 py-3.5 font-bold text-white shadow-lg transition-colors hover:bg-gold-600">
                {"Start free ->"}
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
          width: t.canvasWidth,
          pointerEvents: "none",
          zIndex: -1,
        }}
      >
        {slides.map((slide, i) => (
          <div key={i} ref={slideRefs[i] as RefObject<HTMLDivElement>} style={{ width: t.canvasWidth, height: t.canvasHeight }}>
            {renderSlide(slide, i)}
          </div>
        ))}
      </div>
    </div>
  )
}
