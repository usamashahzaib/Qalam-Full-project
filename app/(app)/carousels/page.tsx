"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { useWorkspace } from "@/components/providers/WorkspaceProvider"
import { withClientParam, withWorkspaceKey } from "@/lib/workspace-navigation"

type CarouselProject = { id: string; workspace_id: string; post_id: string | null; theme: string | null; created_at: string; updated_at: string }
const formatDate = (iso: string) => { try { return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) } catch { return iso } }

export default function CarouselsPage() {
  const { state, workspaceId } = useWorkspace()
  const activeClientId = (state as { agency?: { activeClientId?: string | null } }).agency?.activeClientId || null
  const [carousels, setCarousels] = useState<CarouselProject[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [seed, setSeed] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)

  const fetchCarousels = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch(withWorkspaceKey("/api/carousel", workspaceId))
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to load carousels")
      setCarousels(Array.isArray(data.carousels) ? data.carousels : [])
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setIsLoading(false)
    }
  }, [workspaceId])

  useEffect(() => { fetchCarousels() }, [fetchCarousels])

  const generateCarousel = async () => {
    const content = seed.trim()
    if (!content) { setError("Paste a post or idea first."); return }
    setIsGenerating(true)
    setError(null)
    try {
      const title = content.split(/\n/).find(Boolean)?.slice(0, 60) || "LinkedIn Carousel"
      const res = await fetch(withWorkspaceKey("/api/carousel", workspaceId), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content, workspaceKey: workspaceId }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.projectId) throw new Error(data.error || "Could not generate carousel")
      setSeed("")
      await fetchCarousels()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-10 sm:px-10 font-jakarta">
      <div className="relative mb-8 overflow-hidden rounded-2xl border border-zinc-100 bg-white px-6 py-5 shadow-sm">
        <div
          className="pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full"
          style={{ background: "radial-gradient(circle, rgba(13,74,69,0.1) 0%, transparent 70%)" }}
        />
        <div className="relative flex items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-zinc-900">Carousels</h1>
            <p className="mt-1 text-sm text-zinc-500">AI-generated LinkedIn carousel slide decks. Open any to edit slides.</p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <button onClick={fetchCarousels} className="text-sm font-semibold text-teal transition-colors hover:text-teal-700">Refresh</button>
            <Link href={withClientParam("/writer", activeClientId)} className="rounded-xl bg-teal px-4 py-2 text-sm font-bold text-white shadow-sm transition-colors hover:bg-teal-600">Open Writer</Link>
          </div>
        </div>
      </div>
      <div className="mb-6 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-zinc-500">Create carousel here</label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <textarea value={seed} onChange={(e) => setSeed(e.target.value)} rows={3} placeholder="Paste a post, topic, or rough outline..." className="min-h-24 flex-1 resize-none rounded-xl border border-zinc-200 px-4 py-3 text-sm outline-none transition-all focus:border-teal focus:ring-4 focus:ring-teal/10" />
          <button onClick={generateCarousel} disabled={isGenerating || !seed.trim()} className="rounded-xl bg-zinc-900 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-zinc-800 disabled:opacity-50">{isGenerating ? "Building..." : "Generate carousel"}</button>
        </div>
      </div>
      {error && <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {isLoading ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[1,2,3,4,5,6].map((i) => <div key={i} className="h-36 rounded-2xl bg-zinc-100 animate-pulse" />)}</div> : carousels.length === 0 ? <div className="rounded-2xl border border-zinc-200 bg-white px-6 py-20 text-center"><p className="font-semibold text-zinc-900">No carousels yet</p><p className="mt-1 text-sm text-zinc-500">Paste an idea above and generate the first deck.</p></div> : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{carousels.map((carousel) => <Link key={carousel.id} href={withClientParam(`/carousels/${carousel.id}`, activeClientId)} className="group relative rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition-all hover:border-teal/40 hover:shadow-md hover:-translate-y-0.5"><div className="mb-4 overflow-hidden rounded-xl bg-gradient-to-br from-zinc-950 via-teal-950 to-teal p-4 text-white"><p className="text-[10px] font-bold uppercase tracking-widest text-teal-100">Qalam carousel</p><p className="mt-5 line-clamp-2 min-h-10 text-base font-bold">{carousel.theme || `Created ${formatDate(carousel.created_at)}`}</p><div className="mt-5 h-px bg-white/15" /><p className="mt-2 text-[10px] text-teal-100">byqalam.com</p></div><div className="flex items-start justify-between gap-2"><div className="min-w-0 flex-1"><p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">Carousel</p><p className="text-sm font-semibold text-zinc-900 truncate group-hover:text-teal transition-colors">{carousel.theme || `Created ${formatDate(carousel.created_at)}`}</p><p className="mt-1 text-[11px] text-zinc-400">Created {formatDate(carousel.created_at)}</p></div><span className="shrink-0 rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-1 text-[10px] font-semibold text-zinc-500 group-hover:border-teal/30 group-hover:bg-teal/5 group-hover:text-teal transition-colors">Edit &gt;</span></div>{carousel.post_id && <div className="mt-3 border-t border-zinc-100 pt-2.5"><p className="text-[10px] text-zinc-400">Linked post {carousel.post_id.slice(0, 8)}</p></div>}</Link>)}</div>}
      {!isLoading && carousels.length > 0 && <p className="mt-6 text-center text-xs text-zinc-400">{carousels.length} carousel{carousels.length !== 1 ? "s" : ""} in this workspace</p>}
    </div>
  )
}
