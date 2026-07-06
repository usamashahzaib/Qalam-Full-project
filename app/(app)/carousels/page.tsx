"use client"

import { useEffect, useState, useCallback, useMemo, type MouseEvent } from "react"
import Link from "next/link"
import { useWorkspace } from "@/components/providers/WorkspaceProvider"
import { usePosts } from "@/lib/hooks/usePosts"
import { withClientParam, withWorkspaceKey } from "@/lib/workspace-navigation"

type CarouselProject = { id: string; topic: string; role: string; slide_count: number; created_at: string }
const THEMES = ["Authority Playbook", "Executive Brief", "Contrarian Breakdown", "People Strategy", "Growth Memo", "Hiring Deep Dive"] as const

const THEME_META: Record<string, { gradient: string; accent: string; text: string; muted: string; tagline: string; structure: string[] }> = {
  "Authority Playbook": {
    gradient: "linear-gradient(135deg, #0d1117 0%, #0d4a45 60%, #0f766e 100%)",
    accent: "#5eead4", text: "#ffffff", muted: "rgba(255,255,255,0.6)",
    tagline: "Position as the definitive expert",
    structure: ["Hook: The tension only experts see", "Framework: Your core model", "Case: Proof it works", "Counterpoint: What others get wrong", "Principle: The key insight", "Tool: Practical application", "CTA: Where to go deeper"],
  },
  "Executive Brief": {
    gradient: "linear-gradient(135deg, #1e3a5f 0%, #1e40af 100%)",
    accent: "#93c5fd", text: "#ffffff", muted: "rgba(255,255,255,0.6)",
    tagline: "Crisp, data-backed leadership voice",
    structure: ["Problem: Business-critical tension", "Data: The number that changes things", "Analysis: What it means", "Decision: What leaders should do", "Risk: What you're trading off", "Upside: Why it's worth it", "Signal: Watch for this outcome"],
  },
  "Contrarian Breakdown": {
    gradient: "linear-gradient(135deg, #18181b 0%, #3f1818 50%, #7f1d1d 100%)",
    accent: "#fca5a5", text: "#ffffff", muted: "rgba(255,255,255,0.6)",
    tagline: "Challenge the conventional wisdom",
    structure: ["Provocation: The popular belief", "Reveal: Why it's wrong", "Evidence: The actual data", "Mechanism: How it really works", "Example: A case study", "Nuance: When it does apply", "Conclusion: The harder truth"],
  },
  "People Strategy": {
    gradient: "linear-gradient(135deg, #2d1b69 0%, #7c3aed 100%)",
    accent: "#c4b5fd", text: "#ffffff", muted: "rgba(255,255,255,0.6)",
    tagline: "Org design, talent, and leadership",
    structure: ["Challenge: The team problem", "Pattern: What high performers do", "Signal: How to spot it early", "Structure: The system that works", "Mistake: What managers get wrong", "Build: The practical step", "CTA: Share with your team"],
  },
  "Growth Memo": {
    gradient: "linear-gradient(135deg, #064e3b 0%, #059669 100%)",
    accent: "#6ee7b7", text: "#ffffff", muted: "rgba(255,255,255,0.6)",
    tagline: "Metrics, loops, and distribution",
    structure: ["Metric: The number to care about", "Benchmark: How you stack up", "Driver: What moves it", "Lever: The high-impact action", "Test: What to validate first", "Scale: How to compound it", "Outcome: What good looks like"],
  },
  "Hiring Deep Dive": {
    gradient: "linear-gradient(135deg, #78350f 0%, #d97706 100%)",
    accent: "#fbbf24", text: "#ffffff", muted: "rgba(255,255,255,0.6)",
    tagline: "Attract, assess, and close top talent",
    structure: ["Gap: The role you actually need", "Signal: How great candidates think", "Screen: What to look for first", "Interview: The question that reveals it", "Red flag: What to walk away from", "Offer: How to close them", "Onboard: The first-week setup"],
  },
}
const ROLE_SUGGESTIONS = ["Founder", "Software Developer", "Marketer", "Sales Leader", "HR Leader", "Consultant", "CEO"] as const
const formatDate = (iso: string) => { try { return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) } catch { return iso } }

export default function CarouselsPage() {
  const { workspaceId, activeClientId } = useWorkspace()
  const { posts } = usePosts()
  const [carousels, setCarousels] = useState<CarouselProject[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [seed, setSeed] = useState("")
  const [selectedPostId, setSelectedPostId] = useState("manual")
  const [theme, setTheme] = useState<string>(THEMES[0])
  const [role, setRole] = useState<string>(ROLE_SUGGESTIONS[0])
  const [slideCount, setSlideCount] = useState(7)
  const [isGenerating, setIsGenerating] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const carouselSourcePosts = useMemo(() => [...posts].sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt))).slice(0, 12), [posts])
  const selectedPost = selectedPostId === "manual" ? null : carouselSourcePosts.find((post) => post.id === selectedPostId) || null

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("carouselSeed")
      if (raw) {
        sessionStorage.removeItem("carouselSeed")
        const data = JSON.parse(raw) as { content?: string; title?: string }
        if (data.content) {
          setSeed(data.content)
          setSelectedPostId("manual")
          setTimeout(() => {
            document.querySelector<HTMLElement>("[data-carousel-generator]")?.scrollIntoView({ behavior: "smooth", block: "start" })
          }, 100)
        }
      }
    } catch { /* ignore */ }
  }, [])

  const fetchCarousels = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch(withWorkspaceKey("/api/carousel", workspaceId))
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to load carousels")
      if (data._tableNotReady) setError("Carousel database table not set up yet. Contact support to enable this feature.")
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
      const topic = selectedPost?.title
        ? `${selectedPost.title}\n\n${selectedPost.content}`.slice(0, 200)
        : sourceContent.slice(0, 200)
      const res = await fetch("/api/carousel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, role, slideCount, tone: theme }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Could not generate carousel")
      if (!data.id && !data.slides) throw new Error(data.error || "Could not generate carousel")
      setSeed("")
      setSelectedPostId("manual")
      await fetchCarousels()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setIsGenerating(false)
    }
  }

  const deleteCarousel = async (id: string, e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    e.stopPropagation()
    if (!window.confirm("Delete this carousel? This cannot be undone.")) return
    setDeletingId(id)
    try {
      const res = await fetch(`/api/carousel/${id}`, { method: "DELETE" })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Delete failed") }
      setCarousels((prev) => prev.filter((c) => c.id !== id))
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setDeletingId(null)
    }
  }

  return (
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

        <div className="mb-6 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]" data-carousel-generator>
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
                <span className="mb-1 block text-xs font-medium text-zinc-500">Your role</span>
                <input
                  type="text"
                  list="carousel-role-suggestions"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  placeholder="e.g. Software Engineer, Plumber, Teacher..."
                  className="w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-teal focus:ring-4 focus:ring-teal/10"
                />
                <datalist id="carousel-role-suggestions">
                  {ROLE_SUGGESTIONS.map((r) => <option key={r} value={r} />)}
                </datalist>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-zinc-500">Use workspace post</span>
                <select value={selectedPostId} onChange={(e) => setSelectedPostId(e.target.value)} className="w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-teal focus:ring-4 focus:ring-teal/10">
                  <option value="manual">Manual brief</option>
                  {carouselSourcePosts.map((post) => <option key={post.id} value={post.id}>{post.title}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-zinc-500">Slides ({slideCount})</span>
                <input type="range" min={5} max={10} value={slideCount} onChange={(e) => setSlideCount(Number(e.target.value))} className="mt-2 w-full accent-teal" />
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
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-zinc-900">Deck preview</h2>
                <p className="mt-0.5 text-[11px] text-zinc-400">{THEME_META[theme]?.tagline ?? "AI-structured LinkedIn carousel"}</p>
              </div>
              <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-0.5 text-[10px] font-bold text-zinc-500">{slideCount} slides</span>
            </div>

            {/* Slide 1 preview card */}
            <div className="relative mb-4 overflow-hidden rounded-2xl p-5 text-white" style={{ background: THEME_META[theme]?.gradient ?? "linear-gradient(135deg,#0d1117,#0d4a45)" }}>
              {/* Slide track dots */}
              <div className="absolute right-4 top-4 flex flex-col gap-1">
                {Array.from({ length: Math.min(slideCount, 6) }, (_, i) => (
                  <div key={i} className="h-5 w-1 rounded-full" style={{ background: i === 0 ? (THEME_META[theme]?.accent ?? "#5eead4") : "rgba(255,255,255,0.2)" }} />
                ))}
              </div>
              <div className="pr-6">
                <p className="text-[9px] font-bold uppercase tracking-[0.2em]" style={{ color: THEME_META[theme]?.accent ?? "#5eead4" }}>Slide 1 · {role}</p>
                <h3 className="mt-3 text-base font-bold leading-snug" style={{ color: THEME_META[theme]?.text ?? "#fff" }}>
                  {seed ? (seed.split(" ").slice(0, 10).join(" ") + (seed.split(" ").length > 10 ? "..." : "")) : `Hook slide · ${theme}`}
                </h3>
                <p className="mt-2 text-[11px] leading-relaxed" style={{ color: THEME_META[theme]?.muted ?? "rgba(255,255,255,0.6)" }}>
                  {THEME_META[theme]?.structure[0] ?? "Opening tension that stops the scroll"}
                </p>
                <div className="mt-4 flex items-center justify-between border-t pt-2.5 text-[9px]" style={{ borderColor: "rgba(255,255,255,0.12)", color: THEME_META[theme]?.muted ?? "rgba(255,255,255,0.5)" }}>
                  <span>1 / {slideCount}</span>
                  <span>LinkedIn carousel</span>
                </div>
              </div>
            </div>

            {/* Slide structure */}
            <div className="space-y-1.5">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-zinc-400">Deck structure</p>
              {(THEME_META[theme]?.structure ?? ["Hook", "Framework", "Proof", "Insight", "Application", "CTA"]).slice(0, slideCount).map((item, i) => (
                <div key={i} className="flex items-center gap-2.5">
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-[9px] font-bold tabular-nums text-zinc-500">{i + 1}</span>
                  <span className="text-[11px] leading-tight text-zinc-600">{item}</span>
                </div>
              ))}
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
              <div key={carousel.id} className="group relative rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-teal/40 hover:shadow-md">
                <Link href={withClientParam(`/carousels/${carousel.id}`, activeClientId)} className="block">
                  <div className="mb-4 overflow-hidden rounded-xl bg-gradient-to-br from-zinc-950 via-teal-950 to-teal p-4 text-white">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-teal-100">{carousel.slide_count || 7} slides</p>
                    <p className="mt-5 line-clamp-2 min-h-10 text-base font-bold">{carousel.topic || `Created ${formatDate(carousel.created_at)}`}</p>
                    <div className="mt-5 h-px bg-white/15" />
                    <p className="mt-2 text-[10px] text-teal-100">{carousel.role || "LinkedIn"} · {formatDate(carousel.created_at)}</p>
                  </div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="mb-1 text-xs font-bold uppercase tracking-wider text-zinc-500">Deck</p>
                      <p className="truncate text-sm font-semibold text-zinc-900 transition-colors group-hover:text-teal">{carousel.topic || `Created ${formatDate(carousel.created_at)}`}</p>
                      <p className="mt-1 text-[11px] text-zinc-400">Created {formatDate(carousel.created_at)}</p>
                    </div>
                    <span className="shrink-0 rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-1 text-[10px] font-semibold text-zinc-500 transition-colors group-hover:border-teal/30 group-hover:bg-teal/5 group-hover:text-teal">Edit &gt;</span>
                  </div>
                </Link>
                <button
                  onClick={(e) => void deleteCarousel(carousel.id, e)}
                  disabled={deletingId === carousel.id}
                  className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-lg bg-white/80 text-zinc-400 opacity-0 transition-all hover:bg-red-50 hover:text-red-500 group-hover:opacity-100 disabled:opacity-50"
                  title="Delete carousel"
                >
                  {deletingId === carousel.id ? (
                    <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                  ) : (
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  )}
                </button>
              </div>
            ))}
          </div>
        )}

        {!isLoading && carousels.length > 0 ? <p className="mt-6 text-center text-xs text-zinc-400">{carousels.length} carousel{carousels.length !== 1 ? "s" : ""} in this workspace</p> : null}
      </div>
  )
}
