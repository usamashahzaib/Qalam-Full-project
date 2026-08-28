"use client"

import { useEffect, useRef, useState } from "react"
import { toPng } from "html-to-image"
import { trackMarketingEvent } from "@/lib/marketing-events"
import { isScorePubliclyShareable, resumeScoreBand, type ResumeReviewResult, type ResumeReviewScoreKey } from "@/lib/career-resume-review"

/**
 * Shareable readiness score card.
 *
 * The score is the highest-arousal moment the free checker produces, and it
 * already arrives branded and expressed out of 100 - the most retellable unit
 * of information a diagnostic can emit. Before this existed the number was a
 * dead end: read once, never leaves the tab.
 *
 * Sharing is score-gated on purpose. A strong result is something people want
 * their network to see, so it gets a card carrying the number. A weak result
 * is private information about someone's job search, so no number ever leaves
 * this component - those visitors are offered the tool instead of their score.
 * Visibility has to empower the person holding it, never expose them.
 */

const CARD = 1080

const shareLabels: Partial<Record<ResumeReviewScoreKey, string>> = {
  ats_parsing: "ATS parsing",
  role_alignment: "Role alignment",
  recruiter_read: "Six-second read",
  achievement_evidence: "Achievement proof",
}

const bandCopy = (score: number) =>
  score >= 85 ? "Interview ready" : score >= 70 ? "Screening ready" : "In progress"

function CardArt({ result }: { result: ResumeReviewResult }) {
  const highlights = (Object.entries(result.scores) as [ResumeReviewScoreKey, number][])
    .filter(([key]) => key in shareLabels)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)

  return (
    <div
      style={{
        width: CARD,
        height: CARD,
        background: "linear-gradient(155deg, #0d4a45 0%, #073f3b 55%, #052e2b 100%)",
        position: "relative",
        overflow: "hidden",
        fontFamily: "'Plus Jakarta Sans', 'Inter', 'Helvetica Neue', Arial, sans-serif",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: 96,
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          position: "absolute",
          width: 900,
          height: 900,
          borderRadius: "50%",
          background: "radial-gradient(circle at 50% 50%, rgba(212,175,105,0.20), transparent 62%)",
          top: -220,
          right: -260,
        }}
      />

      <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 26, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", margin: 0, position: "relative" }}>
        Qalam readiness score
      </p>

      <div style={{ display: "flex", alignItems: "baseline", gap: 16, margin: "28px 0 0", position: "relative" }}>
        <span style={{ color: "#ffffff", fontSize: 260, fontWeight: 800, lineHeight: 0.86, letterSpacing: "-0.05em" }}>
          {result.overall_score}
        </span>
        <span style={{ color: "rgba(255,255,255,0.42)", fontSize: 76, fontWeight: 700 }}>/100</span>
      </div>

      <p style={{ color: "#d4af69", fontSize: 44, fontWeight: 700, margin: "26px 0 0", letterSpacing: "-0.01em", position: "relative" }}>
        {bandCopy(result.overall_score)}
      </p>

      <div style={{ height: 1, background: "rgba(255,255,255,0.14)", margin: "52px 0 0", position: "relative" }} />

      <div style={{ display: "flex", flexDirection: "column", gap: 26, margin: "46px 0 0", position: "relative" }}>
        {highlights.map(([key, value]) => (
          <div key={key} style={{ display: "flex", alignItems: "center", gap: 24 }}>
            <span style={{ color: "rgba(255,255,255,0.78)", fontSize: 30, fontWeight: 600, width: 340 }}>
              {shareLabels[key]}
            </span>
            <span style={{ flex: 1, height: 10, background: "rgba(255,255,255,0.12)", borderRadius: 6, overflow: "hidden", display: "flex" }}>
              <span style={{ width: `${value}%`, height: 10, background: "#d4af69", borderRadius: 6 }} />
            </span>
            <span style={{ color: "#ffffff", fontSize: 30, fontWeight: 800, width: 70, textAlign: "right" }}>{value}</span>
          </div>
        ))}
      </div>

      <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 27, fontWeight: 600, letterSpacing: "0.05em", margin: 0, position: "absolute", bottom: 74, left: 96 }}>
        Free resume check at byqalam.com
      </p>
    </div>
  )
}

export function ScoreShareCard({ result }: { result: ResumeReviewResult }) {
  const cardRef = useRef<HTMLDivElement>(null)
  const frameRef = useRef<HTMLDivElement>(null)
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState("")
  const [previewScale, setPreviewScale] = useState(0)

  // The card is authored at a fixed 1080 so the exported PNG is crisp, but the
  // preview frame is fluid. Measure the frame and scale to fit rather than
  // guessing a ratio, which would letterbox or overflow at some breakpoints.
  useEffect(() => {
    const frame = frameRef.current
    if (!frame) return
    const observer = new ResizeObserver(() => {
      setPreviewScale(frame.clientWidth / CARD)
    })
    observer.observe(frame)
    return () => observer.disconnect()
  }, [])

  const score = result.overall_score
  const shareable = isScorePubliclyShareable(score)

  // Specific and checkable, so it survives being retold. A superlative
  // ("the best resume tool") does not, and would not be true.
  const shareText = shareable
    ? `I ran my resume through Qalam's free checker and scored ${score}/100 on recruiter readiness. It reads a resume the way an ATS and a recruiter do, before you apply.\n\nhttps://byqalam.com/free-tools/ats-resume-checker`
    : `Qalam's free checker reads your resume the way an ATS and a recruiter do, before you apply. It tells you what is costing you screenings.\n\nhttps://byqalam.com/free-tools/ats-resume-checker`

  const downloadCard = async () => {
    const element = cardRef.current
    if (!element) return
    setBusy(true)
    setError("")
    try {
      const dataUrl = await toPng(element, { cacheBust: true, pixelRatio: 1, skipAutoScale: true })
      const link = document.createElement("a")
      link.href = dataUrl
      link.download = `qalam-readiness-score-${score}.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      trackMarketingEvent("score_card_download", { score_band: resumeScoreBand(score) })
    } catch {
      setError("The image could not be generated. Try copying the text instead.")
    } finally {
      setBusy(false)
    }
  }

  const copyText = async () => {
    try {
      await navigator.clipboard.writeText(shareText)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
      trackMarketingEvent("score_share_copy", { score_band: resumeScoreBand(score), included_score: shareable })
    } catch {
      setError("Copying is blocked in this browser. Select the text manually.")
    }
  }

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-6 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-gold-700">
            {shareable ? "Share your result" : "Pass it on"}
          </p>
          <h2 className="mt-2 text-2xl font-bold text-zinc-900">
            {shareable ? "Post the score, not the resume." : "Send the check to someone job hunting."}
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-zinc-600">
            {shareable
              ? "The card shows your score and your three strongest dimensions. Your resume text, the risks, and the correction plan stay private to you."
              : "Your score stays private. Nothing here publishes it, and the card below carries the tool rather than your number."}
          </p>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        {shareable ? (
          <button
            type="button"
            onClick={() => void downloadCard()}
            disabled={busy}
            className="press inline-flex min-h-11 items-center rounded-xl bg-teal px-5 text-sm font-bold text-white transition hover:bg-teal-600 disabled:opacity-60"
          >
            {busy ? "Building image..." : "Download score card"}
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => void copyText()}
          className="press inline-flex min-h-11 items-center rounded-xl border border-teal/30 px-5 text-sm font-bold text-teal transition hover:bg-teal-50"
        >
          {copied ? "Copied" : shareable ? "Copy post text" : "Copy a link to send"}
        </button>
      </div>

      {error ? <p role="alert" className="mt-3 text-sm text-red-600">{error}</p> : null}

      {shareable ? (
        <div className="mt-7">
          <p className="mb-3 t-eyebrow text-zinc-400">Preview</p>
          <div className="overflow-hidden rounded-xl border border-zinc-200">
            {/* Rendered at full 1080 and scaled down for display. Capturing a
                transform-scaled node produces a blurry PNG, so the export reads
                the untransformed inner node through cardRef. */}
            <div ref={frameRef} style={{ width: "100%", aspectRatio: "1 / 1", position: "relative", overflow: "hidden" }}>
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: CARD,
                  height: CARD,
                  transform: `scale(${previewScale})`,
                  transformOrigin: "top left",
                  visibility: previewScale > 0 ? "visible" : "hidden",
                }}
              >
                <div ref={cardRef}>
                  <CardArt result={result} />
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}
