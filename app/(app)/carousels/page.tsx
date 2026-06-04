"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import Link from "next/link"
import { useWorkspace } from "@/components/providers/WorkspaceProvider"
import { withClientParam, withWorkspaceKey } from "@/lib/workspace-navigation"
import { LockedFeature } from "@/components/LockedFeature"

type CarouselProject = { id: string; workspace_id: string; post_id: string | null; theme: string | null; created_at: string; updated_at: string }
const THEMES = ["Authority Playbook", "Executive Brief", "Contrarian Breakdown", "People Strategy", "Growth Memo", "Hiring Deep Dive"] as const
const formatDate = (iso: string) => { try { return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) } catch { return iso } }

export default function CarouselsPage() {
  const { state, workspaceId } = useWorkspace()
  const activeClientId = (state as { agency?: { activeClientId?: string | null } }).agency?.activeClientId || null
  const [carousels, setCarousels] = useState<CarouselProject[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [seed, setSeed] = useState("")
  const [selectedPostId, setSelectedPostId] = useState("manual")
  const [theme, setTheme] = useState<string>(THEMES[0])
  const [isGenerating, setIsGenerating] = useState(false)

  const carouselSourcePosts = useMemo(() => [...state.posts].sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt))).slice(0, 12), [state.posts])
  const selectedPost = selectedPostId === "manual" ? null : carouselSourcePosts.find((post) => post.id === selectedPostId) || null

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

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchCarousels() }, [fetchCarousels])

  const generateCarousel = async () => {
    const sourceContent = selectedPost ? selectedPost.content : seed.trim()
    if (!sourceContent) { setError("Add source content or pick a post first."); return }
    setIsGenerating(true)
    setError(null)
    try {
      const title = selectedPost?.title || sourceContent.split(/\n/).find(Boolean)?.slice(0, 60) || "LinkedIn Carousel"
      const res = await fetch(withWorkspaceKey("/api/carousel", workspaceId), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId: selectedPost?.id || null, title, content: sourceContent, theme, workspaceKey: workspaceId }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.projectId) throw new Error(data.error || "Could not generate carousel")
      setSeed("")
      setSelectedPostId("manual")
      await fetchCarousels()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <LockedFeature requiredPlan="Pro" feature="Carousel builder">
      <div className="mx-auto max-w-6xl px-6 py-10 sm:px-10 font-jakarta">
        <div className="relative mb-8 overflow-hidden rounded-2xl border border-zinc-100 bg-white px-6 py-5 shadow-sm">
          <div className="pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full" style={{ background: "radial-gradient(circle, rgba(13,74,69,0.1) 0%, transparent 70%)" }} />
          <div className="relative flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-zinc-400">Carousel Studio</p>
              <h1 className="mt-1 text-3xl font-bold text-zinc-900">Build premium decks directly from a post, theme, or rough brief</h1>
              <p className="mt-2 max-w-3xl text-sm text-zinc-500">Start from a workspace post or a fresh idea. Qalam builds the first deck, then you refine slides in the editor.</p>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <button onClick={fetchCarousels} className="text-sm font-semibold text-teal transition-colors hover:text-teal-700">Refresh</button>
              <Link href={withClientParam("/writer", activeClientId)} className="rounded-xl bg-teal px-4 py-2 text-sm font-bold text-white shadow-sm transition-colors hover:bg-teal-600">Open Writer</Link>
            </div>
          </div>
        </div>

        <div className="mb-6 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-zinc-900">Direct creation</h2>
                <p className="mt-1 text-xs text-zinc-500">Choose a deck style, then start from a post or your own seed.</p>
              </div>
              <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-zinc-500">No default theme</span>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-zinc-500">Deck theme</span>
                <select value={theme} onChange={(e) => setTheme(e.target.value)} className="w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-teal focus:ring-4 focus:ring-teal/10">
                  {THEMES.map((option) => <option key={option}>{option}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-zinc-500">Use workspace post</span>
                <select value={selectedPostId} onChange={(e) => setSelectedPostId(e.target.value)} className="w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-teal focus:ring-4 focus:ring-teal/10">
                  <option value="manual">Manual brief</option>
                  {carouselSourcePosts.map((post) => <option key={post.id} value={post.id}>{post.title}</option>)}
                </select>
              </label>
            </div>

            {selectedPost ? (
              <div className="mt-3 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3">
                <p className="text-xs font-bold uppercase tracking-wide text-zinc-500">Selected post</p>
                <p className="mt-1 text-sm font-semibold text-zinc-900">{selectedPost.title}</p>
                <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-zinc-600">{selectedPost.content}</p>
              </div>
            ) : (
              <label className="mt-3 block">
                <span className="mb-1 block text-xs font-medium text-zinc-500">Manual brief</span>
                <textarea value={seed} onChange={(e) => setSeed(e.target.value)} rows={5} placeholder="Paste a post, rough outline, or topic..." className="qalam-scrollbar min-h-32 w-full resize-none rounded-xl border border-zinc-200 px-4 py-3 text-sm outline-none transition-all focus:border-teal focus:ring-4 focus:ring-teal/10" />
              </label>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              <button onClick={generateCarousel} disabled={isGenerating || (!selectedPost && !seed.trim())} className="rounded-xl bg-zinc-900 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-zinc-800 disabled:opacity-50">{isGenerating ? "Building..." : "Generate carousel"}</button>
              <button onClick={() => { setSelectedPostId("manual"); setSeed("") }} className="rounded-xl border border-zinc-200 px-4 py-3 text-sm font-semibold text-zinc-700 hover:bg-zinc-50">Reset</button>
            </div>
          </section>

          <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-bold text-zinc-900">Deck standards</h2>
            <div className="mt-3 space-y-2 text-sm text-zinc-600">
              <p>- Slide 1 frames the tension.</p>
              <p>- Middle slides teach, prove, or sharpen the point.</p>
              <p>- Final slide closes with a takeaway or CTA.</p>
              <p>- Qalam branding stays subtle inside editor and exports.</p>
            </div>
            <div className="mt-5 rounded-2xl bg-gradient-to-br from-zinc-950 via-teal-950 to-teal p-5 text-white">
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-teal-100">Preview signal</p>
              <h3 className="mt-3 text-xl font-bold leading-tight">{theme}</h3>
              <p className="mt-3 text-sm leading-relaxed text-teal-50/85">This theme shapes the first deck draft. You can still refine every slide after generation.</p>
              <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-3 text-[10px] text-teal-100">
                <span>Qalam carousel</span>
                <span>byqalam.com</span>
              </div>
            </div>
          </section>
        </div>

        {error ? <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="h-36 animate-pulse rounded-2xl bg-zinc-100" />)}</div>
        ) : carousels.length === 0 ? (
          <div className="rounded-2xl border border-zinc-200 bg-white px-6 py-20 text-center">
            <p className="font-semibold text-zinc-900">No carousels yet</p>
            <p className="mt-1 text-sm text-zinc-500">Generate the first deck from a post or brief above.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {carousels.map((carousel) => (
              <Link key={carousel.id} href={withClientParam(`/carousels/${carousel.id}`, activeClientId)} className="group relative rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-teal/40 hover:shadow-md">
                <div className="mb-4 overflow-hidden rounded-xl bg-gradient-to-br from-zinc-950 via-teal-950 to-teal p-4 text-white">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-teal-100">Qalam carousel</p>
                  <p className="mt-5 line-clamp-2 min-h-10 text-base font-bold">{carousel.theme || `Created ${formatDate(carousel.created_at)}`}</p>
                  <div className="mt-5 h-px bg-white/15" />
                  <p className="mt-2 text-[10px] text-teal-100">byqalam.com</p>
                </div>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="mb-1 text-xs font-bold uppercase tracking-wider text-zinc-500">Deck</p>
                    <p className="truncate text-sm font-semibold text-zinc-900 transition-colors group-hover:text-teal">{carousel.theme || `Created ${formatDate(carousel.created_at)}`}</p>
                    <p className="mt-1 text-[11px] text-zinc-400">Created {formatDate(carousel.created_at)}</p>
                  </div>
                  <span className="shrink-0 rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-1 text-[10px] font-semibold text-zinc-500 transition-colors group-hover:border-teal/30 group-hover:bg-teal/5 group-hover:text-teal">Edit &gt;</span>
                </div>
                {carousel.post_id ? <div className="mt-3 border-t border-zinc-100 pt-2.5"><p className="text-[10px] text-zinc-400">Linked post {carousel.post_id.slice(0, 8)}</p></div> : null}
              </Link>
            ))}
          </div>
        )}

        {!isLoading && carousels.length > 0 ? <p className="mt-6 text-center text-xs text-zinc-400">{carousels.length} carousel{carousels.length !== 1 ? "s" : ""} in this workspace</p> : null}
      </div>
    </LockedFeature>
  )
}
