"use client"

import { useEffect, useMemo, useState } from "react"

type VoiceAnalysis = {
  tone?: string
  sentence_structure?: string
  vocabulary_level?: string
  emotional_temperature?: string
  distinctive_phrases?: string[]
  formatting_habits?: string
  perspective?: string
  hook_style?: string
  cta_style?: string
}

type VoiceFingerprint = {
  signature_phrases?: string[]
  typical_sentence_length?: string
  emotional_range?: string
  argument_structure?: string
  unique_verbal_tics?: string[]
  confidence_level?: string
  storytelling_approach?: string
}

type VoiceSample = {
  text: string
  analysis?: VoiceAnalysis
  added_at?: string
}

const rows: Array<[keyof VoiceAnalysis, string]> = [
  ["tone", "Tone"],
  ["sentence_structure", "Sentence structure"],
  ["vocabulary_level", "Vocabulary level"],
  ["emotional_temperature", "Emotional temperature"],
  ["formatting_habits", "Formatting habits"],
  ["perspective", "Perspective"],
  ["hook_style", "Hook style"],
  ["cta_style", "CTA style"],
]

const fingerprintRows: Array<[keyof VoiceFingerprint, string]> = [
  ["typical_sentence_length", "Typical sentence length"],
  ["emotional_range", "Emotional range"],
  ["argument_structure", "Argument structure"],
  ["confidence_level", "Confidence level"],
  ["storytelling_approach", "Storytelling approach"],
]

export default function VoicePage() {
  const [sampleText, setSampleText] = useState("")
  const [analysis, setAnalysis] = useState<VoiceAnalysis | null>(null)
  const [fingerprint, setFingerprint] = useState<VoiceFingerprint>({})
  const [samples, setSamples] = useState<VoiceSample[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isClearing, setIsClearing] = useState(false)
  const [status, setStatus] = useState("")

  const sampleCount = samples.length
  const remainingChars = Math.max(0, 50 - sampleText.trim().length)

  const latestAnalysis = useMemo(() => analysis || samples[samples.length - 1]?.analysis || null, [analysis, samples])

  const loadProfile = async () => {
    setIsLoading(true)
    try {
      const res = await fetch("/api/voice/train")
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Failed to load voice profile")
      setSamples(Array.isArray(data.samples) ? data.samples : [])
      setFingerprint(data.fingerprint || {})
    } catch (error) {
      setStatus((error as Error).message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadProfile()
  }, [])

  const analyze = async () => {
    setIsAnalyzing(true)
    setStatus("Analyzing your writing voice...")
    try {
      const res = await fetch("/api/voice/train", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sampleText: sampleText.trim() }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Voice analysis failed")
      setAnalysis(data.analysis)
      setFingerprint(data.fingerprint || {})
      setSamples(Array.isArray(data.samples) ? data.samples : [])
      setSampleText("")
      setStatus("Voice sample saved.")
    } catch (error) {
      setStatus((error as Error).message)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const clearAll = async () => {
    setIsClearing(true)
    setStatus("Clearing saved voice samples...")
    try {
      const res = await fetch("/api/voice/train", { method: "DELETE" })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Clear failed")
      setSamples([])
      setAnalysis(null)
      setFingerprint({})
      setStatus("Voice samples cleared.")
    } catch (error) {
      setStatus((error as Error).message)
    } finally {
      setIsClearing(false)
    }
  }

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-6 text-zinc-950 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-6xl gap-5 lg:grid-cols-[420px_minmax(0,1fr)]">
        <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="border-b border-zinc-100 pb-4">
            <p className="text-xs font-bold uppercase tracking-wide text-teal">Voice training</p>
            <h1 className="mt-1 text-2xl font-bold">Train Qalam on your writing</h1>
            <p className="mt-2 text-sm leading-6 text-zinc-500">Paste LinkedIn posts you wrote. Qalam extracts structure, phrasing, rhythm, and closing style from real examples.</p>
          </div>

          <div className="mt-5 space-y-4">
            <div className="flex items-center justify-between rounded-lg bg-zinc-100 px-3 py-2">
              <span className="text-sm font-semibold text-zinc-700">{sampleCount}/20 samples saved</span>
              <span className="text-xs text-zinc-500">Last 20 retained</span>
            </div>

            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wide text-zinc-500">LinkedIn post sample</span>
              <textarea
                value={sampleText}
                onChange={(e) => setSampleText(e.target.value)}
                rows={12}
                className="mt-1 w-full resize-y rounded-lg border border-zinc-200 px-3 py-2 text-sm leading-6 outline-none focus:border-teal"
              />
            </label>

            <button
              onClick={analyze}
              disabled={isAnalyzing || sampleText.trim().length < 50}
              className="w-full rounded-lg bg-zinc-950 px-4 py-3 text-sm font-bold text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isAnalyzing ? "Analyzing..." : remainingChars ? `Analyze My Voice (${remainingChars} chars needed)` : "Analyze My Voice"}
            </button>

            <button
              onClick={clearAll}
              disabled={isClearing || sampleCount === 0}
              className="w-full rounded-lg border border-red-200 px-4 py-2.5 text-sm font-bold text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isClearing ? "Clearing..." : "Clear All"}
            </button>

            {status ? <p className="rounded-lg bg-zinc-100 px-3 py-2 text-sm text-zinc-700">{status}</p> : null}
          </div>
        </section>

        <section className="space-y-5">
          <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-teal">This is how Qalam will write like you</p>
                <h2 className="mt-1 text-xl font-bold">Voice fingerprint</h2>
              </div>
              {isLoading ? <span className="text-sm text-zinc-400">Loading...</span> : null}
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {fingerprintRows.map(([key, label]) => (
                <div key={key} className="rounded-lg border border-zinc-200 p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-zinc-400">{label}</p>
                  <p className="mt-2 text-sm leading-6 text-zinc-800">{String(fingerprint[key] || "Not learned yet")}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <PhraseList title="Signature phrases" items={fingerprint.signature_phrases} />
              <PhraseList title="Verbal tics" items={fingerprint.unique_verbal_tics} />
            </div>
          </div>

          <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold">Latest analysis</h2>
            {latestAnalysis ? (
              <div className="mt-4 grid gap-3">
                {rows.map(([key, label]) => (
                  <div key={key} className="rounded-lg bg-zinc-50 px-4 py-3">
                    <p className="text-xs font-bold uppercase tracking-wide text-zinc-400">{label}</p>
                    <p className="mt-1 text-sm leading-6 text-zinc-800">{String(latestAnalysis[key] || "Not detected")}</p>
                  </div>
                ))}
                <PhraseList title="Distinctive phrases" items={latestAnalysis.distinctive_phrases} />
              </div>
            ) : (
              <p className="mt-3 rounded-lg border border-dashed border-zinc-200 px-4 py-8 text-center text-sm text-zinc-400">Analyze a sample to see tone, sentence structure, vocabulary, formatting, hook style, and CTA style.</p>
            )}
          </div>

          <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold">Saved samples</h2>
              <span className="text-sm font-semibold text-zinc-500">{sampleCount}/20</span>
            </div>
            <div className="mt-4 space-y-3">
              {samples.length ? samples.slice().reverse().map((sample, index) => (
                <article key={`${sample.added_at || index}-${index}`} className="rounded-lg border border-zinc-200 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-bold uppercase tracking-wide text-zinc-400">Sample {samples.length - index}</p>
                    {sample.added_at ? <time className="text-xs text-zinc-400">{new Date(sample.added_at).toLocaleDateString()}</time> : null}
                  </div>
                  <p className="mt-2 line-clamp-4 whitespace-pre-wrap text-sm leading-6 text-zinc-700">{sample.text}</p>
                </article>
              )) : (
                <p className="rounded-lg border border-dashed border-zinc-200 px-4 py-8 text-center text-sm text-zinc-400">No saved samples yet.</p>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}

function PhraseList({ title, items }: { title: string; items?: string[] }) {
  return (
    <div className="rounded-lg border border-zinc-200 p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-zinc-400">{title}</p>
      {items?.length ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {items.map((item) => (
            <span key={item} className="rounded-full bg-teal/10 px-2.5 py-1 text-xs font-semibold text-teal">{item}</span>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-sm text-zinc-500">Not learned yet</p>
      )}
    </div>
  )
}
