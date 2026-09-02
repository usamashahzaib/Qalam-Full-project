"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { DeleteArtifactButton } from "@/components/DeleteArtifactButton"

type Analysis = {
  content_worth_score?: number
  positioning?: string
  audience_signal?: string
  engagement_rate?: number
  scores?: Record<string, number>
  what_worked?: string[]
  weaknesses?: string[]
  repeatable_patterns?: string[]
  next_post_angles?: string[]
}

const field = "w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none focus:border-teal"

export default function ContentIntelligencePage() {
  const searchParams = useSearchParams()
  const workspaceKey = searchParams.get("client") || undefined
  const suffix = workspaceKey ? `?workspaceKey=${encodeURIComponent(workspaceKey)}` : ""
  const [history, setHistory] = useState<Array<{ id: string; content: string; analysis: Analysis }>>([])
  const [content, setContent] = useState("")
  const [sourceUrl, setSourceUrl] = useState("")
  const [metrics, setMetrics] = useState({ impressions: 0, reactions: 0, comments: 0, reposts: 0 })
  const [confirmed, setConfirmed] = useState(false)
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch(`/api/career/content-intelligence${suffix}`).then((response) => response.json()).then((data) => setHistory(data.imports || [])).catch(() => undefined)
  }, [suffix])

  const analyze = async () => {
    setLoading(true)
    setMessage("")
    const response = await fetch(`/api/career/content-intelligence${suffix}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspaceKey, content, sourceUrl, metrics, ownershipConfirmed: confirmed }),
    })
    const data = await response.json().catch(() => ({}))
    if (response.ok) {
      setAnalysis(data.analysis)
      setHistory([{ id: data.id, content, analysis: data.analysis }, ...history])
    } else setMessage(data.error || "Analysis failed.")
    setLoading(false)
  }

  const deleteAnalysis = async (id: string) => {
    const response = await fetch(`/api/career/content-intelligence${suffix}${suffix ? "&" : "?"}id=${encodeURIComponent(id)}`, { method: "DELETE" })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(data.error || "Analysis could not be deleted.")
    setHistory((current) => current.filter((item) => item.id !== id))
    setAnalysis(null)
  }

  return (
    <main className="min-h-full bg-zinc-50/70 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="rounded-3xl bg-[#073f3b] px-7 py-8 text-white"><p className="text-xs font-bold uppercase tracking-[0.16em] text-gold-700">Post Intelligence</p><h1 className="mt-2 text-3xl font-bold">Know what your content is worth.</h1><p className="mt-2 max-w-2xl text-sm text-white/70">Import your own post and real metrics. Qalam finds the positioning, performance patterns, weaknesses, and next angles.</p></header>
        <div className="mt-5 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-2xl border border-zinc-200 bg-white p-6">
            <textarea className={`${field} min-h-64 resize-y`} placeholder="Paste your LinkedIn post" value={content} onChange={(event) => setContent(event.target.value)} />
            <input className={`${field} mt-3`} placeholder="LinkedIn post URL, optional" value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} />
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">{Object.keys(metrics).map((key) => <label key={key}><span className="mb-1 block t-eyebrow text-zinc-500">{key}</span><input type="number" min={0} className={field} value={metrics[key as keyof typeof metrics]} onChange={(event) => setMetrics({ ...metrics, [key]: Number(event.target.value) })} /></label>)}</div>
            <label className="mt-4 flex items-start gap-2 text-xs leading-5 text-zinc-600"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} className="mt-1" />I own this content or have permission to analyze it.</label>
            {message && <p className="mt-3 text-sm text-red-600">{message}</p>}
            <button disabled={loading || !confirmed} onClick={analyze} className="mt-4 rounded-xl bg-teal px-5 py-3 text-sm font-bold text-white disabled:opacity-50">{loading ? "Analyzing..." : "Analyze post"}</button>
            <p className="mt-3 text-xs text-zinc-400">Qalam does not scrape LinkedIn. Connected analytics and user-owned imports keep your account safe.</p>
          </section>
          <aside className="rounded-2xl border border-zinc-200 bg-white p-6">
            {analysis ? <Result analysis={analysis} /> : <div className="py-16 text-center text-sm text-zinc-400">Your content worth analysis appears here.</div>}
          </aside>
        </div>
        {history.length > 0 && <section className="mt-5"><h2 className="mb-3 text-lg font-bold text-zinc-900">Imported post history</h2><div className="grid gap-3 md:grid-cols-3">{history.slice(0, 9).map((item) => <article key={item.id} className="rounded-xl border border-zinc-200 bg-white p-4"><div className="flex items-start justify-between gap-3"><div><span className="text-xs font-bold text-teal">Worth score</span><span className="ml-2 font-bold text-gold">{item.analysis?.content_worth_score || 0}</span></div><DeleteArtifactButton itemType="content analysis" itemTitle={item.content.slice(0, 80)} onDelete={() => deleteAnalysis(item.id)} className="min-h-10 rounded-lg px-2 text-xs font-bold text-zinc-400 transition hover:bg-red-50 hover:text-red-600" /></div><p className="mt-3 line-clamp-4 text-xs leading-5 text-zinc-600">{item.content}</p></article>)}</div></section>}
      </div>
    </main>
  )
}

function Result({ analysis }: { analysis: Analysis }) {
  return <div><div className="flex items-end justify-between"><div><p className="text-xs font-bold uppercase text-teal">Content worth</p><p className="mt-1 text-sm text-zinc-600">{analysis.positioning}</p></div><p className="text-4xl font-bold text-gold">{analysis.content_worth_score || 0}</p></div><p className="mt-4 rounded-xl bg-zinc-50 p-3 text-sm text-zinc-600">{analysis.audience_signal}</p><div className="mt-4 grid grid-cols-2 gap-2">{Object.entries(analysis.scores || {}).map(([key, value]) => <div key={key} className="rounded-lg border border-zinc-200 p-3"><p className="t-eyebrow text-zinc-400">{key}</p><p className="mt-1 font-bold text-zinc-900">{value}</p></div>)}</div><List title="What worked" items={analysis.what_worked} /><List title="Fix next" items={analysis.weaknesses} /><List title="Next post angles" items={analysis.next_post_angles} /></div>
}

function List({ title, items }: { title: string; items?: string[] }) {
  if (!items?.length) return null
  return <div className="mt-4"><h3 className="text-xs font-bold uppercase text-zinc-500">{title}</h3><ul className="mt-2 space-y-1 text-xs leading-5 text-zinc-600">{items.map((item) => <li key={item}>- {item}</li>)}</ul></div>
}
