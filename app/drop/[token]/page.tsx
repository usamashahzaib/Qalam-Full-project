"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useParams } from "next/navigation"
import { ClientLinkMessage, ClientLinkShell, ClientLinkSkeleton } from "@/components/client-links/ClientLinkShell"

type Drop = { question: string; workspaceName: string; askerName: string | null; status: "waiting" | "answered" | "used" | "dismissed" | "expired"; expiresAt: string }
type Stage = "loading" | "invalid" | "closed" | "answer" | "done"

const MAX_SECONDS = 180

const pickMimeType = () => {
  if (typeof MediaRecorder === "undefined") return null
  return ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"].find((type) => MediaRecorder.isTypeSupported(type)) ?? ""
}

export default function VoiceDropPage() {
  const params = useParams()
  const token = String(params.token || "")
  const [drop, setDrop] = useState<Drop | null>(null)
  const [stage, setStage] = useState<Stage>("loading")
  const [answer, setAnswer] = useState("")
  const [kind, setKind] = useState<"text" | "voice">("text")
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [recording, setRecording] = useState(false)
  const [transcribing, setTranscribing] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [canRecord, setCanRecord] = useState(false)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<number | null>(null)

  useEffect(() => {
    let active = true
    const capabilityTimer = window.setTimeout(() => setCanRecord(Boolean(navigator.mediaDevices?.getUserMedia) && pickMimeType() !== null), 0)
    fetch(`/api/share/drop/${encodeURIComponent(token)}`, { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error("invalid")
        return res.json() as Promise<Drop>
      })
      .then((data) => {
        if (!active) return
        setDrop(data)
        setStage(data.status === "waiting" ? "answer" : "closed")
      })
      .catch(() => { if (active) setStage("invalid") })
    return () => {
      active = false
      window.clearTimeout(capabilityTimer)
      if (timerRef.current) window.clearInterval(timerRef.current)
      recorderRef.current?.stream.getTracks().forEach((track) => track.stop())
    }
  }, [token])

  const stopRecording = useCallback(() => {
    if (timerRef.current) window.clearInterval(timerRef.current)
    timerRef.current = null
    if (recorderRef.current?.state === "recording") recorderRef.current.stop()
    setRecording(false)
  }, [])


  const transcribe = async (blob: Blob) => {
    setTranscribing(true)
    setError(null)
    try {
      const form = new FormData()
      form.append("audio", blob, "voice-note")
      const res = await fetch(`/api/share/drop/${encodeURIComponent(token)}/transcribe`, { method: "POST", body: form })
      const data = await res.json().catch(() => ({})) as { text?: string; error?: string }
      if (!res.ok || !data.text) throw new Error(data.error || "transcription_failed")
      setAnswer((current) => (current.trim() ? `${current.trim()}\n\n${data.text}` : data.text || ""))
      setKind("voice")
    } catch (caught) {
      const code = (caught as Error).message
      setError(code === "audio_too_large" ? "That recording is too long. Keep it under three minutes." : code === "rate_limited" ? "Too many recordings in a short time. Wait a minute or type your answer." : "We could not turn that recording into text. Try again, or type your answer.")
    } finally {
      setTranscribing(false)
    }
  }

  const startRecording = async () => {
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mimeType = pickMimeType() || undefined
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType, audioBitsPerSecond: 32000 } : undefined)
      chunksRef.current = []
      recorder.ondataavailable = (event) => { if (event.data.size) chunksRef.current.push(event.data) }
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop())
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" })
        if (blob.size) void transcribe(blob)
      }
      recorderRef.current = recorder
      recorder.start()
      setRecording(true)
      setSeconds(0)
      const startedAt = Date.now()
      timerRef.current = window.setInterval(() => {
        const elapsed = Math.floor((Date.now() - startedAt) / 1000)
        setSeconds(elapsed)
        if (elapsed >= MAX_SECONDS) stopRecording()
      }, 500)
    } catch {
      setError("Microphone access was not allowed. You can type your answer instead.")
    }
  }

  const submit = async () => {
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch(`/api/share/drop/${encodeURIComponent(token)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answer: answer.trim(), kind }),
      })
      const data = await res.json().catch(() => ({})) as { error?: string }
      if (!res.ok) throw new Error(data.error || "failed")
      setStage("done")
    } catch (caught) {
      const code = (caught as Error).message
      if (code === "already_answered" || code === "expired") setStage("closed")
      else setError("Your answer could not be sent. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  const clock = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`

  return (
    <ClientLinkShell source="drop">
      {stage === "loading" ? <ClientLinkSkeleton /> : null}
      {stage === "invalid" ? <ClientLinkMessage tone="error" title="This link is not valid" body="It may have been copied incompletely. Ask your agency contact to send the question again." /> : null}
      {stage === "closed" ? <ClientLinkMessage tone="neutral" title="This question is closed" body="It was already answered or has expired. Thank you. Your team will send the next one soon." /> : null}
      {stage === "done" ? <ClientLinkMessage tone="success" title="Thank you, that is exactly what we needed" body={`${drop?.askerName || "Your team"} has your answer and will shape it into a post for your review. You can close this page.`} /> : null}

      {stage === "answer" && drop ? (
        <div className="space-y-5">
          <div>
            <p className="t-eyebrow text-teal-700">{drop.workspaceName}</p>
            <p className="mt-2 text-sm text-zinc-600">{drop.askerName || "Your team"} has one question for your next post:</p>
            <h1 className="mt-3 text-2xl font-bold leading-snug text-zinc-900">{drop.question}</h1>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-4">
            {canRecord ? (
              <div className="mb-4 flex flex-wrap items-center gap-3">
                {recording ? (
                  <button onClick={stopRecording} className="flex min-h-12 items-center gap-2 rounded-xl bg-red-600 px-5 text-sm font-bold text-white hover:bg-red-700">
                    <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-white" aria-hidden="true" />
                    Stop recording ({clock})
                  </button>
                ) : (
                  <button onClick={() => void startRecording()} disabled={transcribing} className="flex min-h-12 items-center gap-2 rounded-xl bg-zinc-900 px-5 text-sm font-bold text-white hover:bg-zinc-800 disabled:opacity-50">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></svg>
                    {transcribing ? "Turning your voice into text..." : answer ? "Record more" : "Record a voice note"}
                  </button>
                )}
                <span className="text-xs text-zinc-500">Up to 3 minutes. Only the text is kept.</span>
              </div>
            ) : null}
            <label htmlFor="drop-answer" className="text-xs font-semibold text-zinc-600">{canRecord ? "Or type your answer" : "Your answer"}</label>
            <textarea
              id="drop-answer"
              value={answer}
              onChange={(event) => setAnswer(event.target.value)}
              maxLength={8000}
              rows={7}
              placeholder="A few honest lines are plenty. Specific moments and numbers help most."
              className="mt-1.5 w-full resize-y rounded-xl border border-zinc-200 bg-zinc-50/50 px-4 py-3 text-base leading-7 text-zinc-900 outline-none focus:border-teal focus:bg-white focus:ring-4 focus:ring-teal/10"
            />
            {kind === "voice" && answer ? <p className="mt-1 text-xs text-zinc-500">Check the transcription and fix anything it misheard.</p> : null}
          </div>

          {error ? <p className="text-sm font-medium text-red-600" role="alert">{error}</p> : null}

          <button onClick={() => void submit()} disabled={submitting || recording || transcribing || answer.trim().length < 3} className="min-h-12 w-full rounded-xl bg-teal px-5 text-sm font-bold text-white shadow-sm hover:bg-teal-600 disabled:opacity-40">
            {submitting ? "Sending..." : "Send my answer"}
          </button>
        </div>
      ) : null}
    </ClientLinkShell>
  )
}
