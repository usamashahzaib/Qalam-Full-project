"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useWorkspace, type WorkspacePost } from "@/components/providers/WorkspaceProvider"
import { analyzeContent } from "@/lib/content-intelligence"
import { persistWriterIntent, withClientParam } from "@/lib/workspace-navigation"

const STATUSES = ["all", "draft", "scheduled", "published", "pending_approval", "rejected"] as const
const TEMPLATE_CATEGORIES = ["All", "Hooks", "Story", "Contrarian", "List", "Authority", "CTA"] as const

type TemplateCard = {
  id: string
  title: string
  category: (typeof TEMPLATE_CATEGORIES)[number]
  badge: string
  description: string
  structure: string[]
  preview: string
}

const openInWriter = (router: ReturnType<typeof useRouter>, post: WorkspacePost, clientId?: string | null) => {
  persistWriterIntent(post, /^\d{4}-\d{2}-\d{2}$/.test(post.date) ? post.date : null)
  router.push(withClientParam("/writer", clientId))
}

const buildTemplates = (profile: { name: string; title: string; industry: string; tone: string; goals: string[] }) => {
  const role = profile.title || "operator"
  const industry = profile.industry || "your market"
  const tone = profile.tone || "clear, practical, human"
  const goal = profile.goals[0] || "earn trust"

  return [
    {
      id: "hook-value-cta",
      title: "Hook + value + CTA",
      category: "Hooks",
      badge: "Fast opener",
      description: `Built for ${industry}. Opens hard, lands one clear insight, closes with a useful ask.`,
      structure: ["Hook - surprising claim or tension", "Value - one sharp lesson", "Proof - one real example", "CTA - ask for a reply or save"],
      preview: `Most people in ${industry} think consistency builds trust.\n\nIt does not.\n\nClarity does.\n\nOne specific point beats five vague updates every time.\n\nIf ${goal} matters this quarter, start there.`,
    },
    {
      id: "story-lesson",
      title: "Story to lesson",
      category: "Story",
      badge: "Human-first",
      description: `Best when ${tone} matters more than polish. Useful for operators who want lived credibility.`,
      structure: ["Scene - what happened", "Tension - what was off", "Turn - what changed", "Lesson - what to repeat or avoid"],
      preview: `Last month I watched a smart ${role.toLowerCase()} lose trust in one meeting.\n\nNot because the idea was weak.\n\nBecause the explanation was five minutes longer than it needed to be.\n\nThat was the reminder - clarity is a leadership skill, not a copy skill.`,
    },
    {
      id: "contrarian-take",
      title: "Contrarian take",
      category: "Contrarian",
      badge: "High signal",
      description: `Use when your client needs a stronger point of view than standard ${industry} advice.`,
      structure: ["Common belief", "Why it fails", "Better lens", "Example from the field"],
      preview: `The safest advice in ${industry} is usually the least useful.\n\nEveryone says to do more.\n\nBetter operators decide what to stop first.\n\nThat shift is where cleaner results usually start.`,
    },
    {
      id: "list-post",
      title: "List post",
      category: "List",
      badge: "Easy to scan",
      description: `Works when the audience wants fast takeaways and concrete language.`,
      structure: ["One-line setup", "3-5 numbered points", "Final takeaway", "Light CTA"],
      preview: `3 mistakes I keep seeing in ${industry}:\n\n1. Talking about activity instead of outcomes\n2. Using broad claims without proof\n3. Ending with no next step\n\nFix those and the post usually reads like someone who has done the work.`,
    },
    {
      id: "authority-post",
      title: "Authority builder",
      category: "Authority",
      badge: "Trust layer",
      description: `Good for ${goal}. Designed to sound lived-in, not AI-smooth.`,
      structure: ["Specific claim", "What you saw", "What most people miss", "What you now do differently"],
      preview: `One thing I have learned in ${industry}:\n\nThe visible problem is rarely the real one.\n\nThe real issue usually sits in the decision before the process.\n\nOnce you start writing from that level, people can feel the difference immediately.`,
    },
    {
      id: "cta-close",
      title: "Question + close",
      category: "CTA",
      badge: "Reply driver",
      description: `Use when the draft is solid but the ending feels flat.`,
      structure: ["State the point", "Add one boundary or exception", "Ask one practical question"],
      preview: `I do not think every team needs the same playbook.\n\nBut every team does need one decision-making standard.\n\nWhere does that standard break first in your world?`,
    },
  ] satisfies TemplateCard[]
}

export default function LibraryPage() {
  const router = useRouter()
  const { state, deletePost } = useWorkspace()
  const activeClientId = (state as { agency?: { activeClientId?: string | null } }).agency?.activeClientId || null
  const [query, setQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<(typeof STATUSES)[number]>("all")
  const [templateFilter, setTemplateFilter] = useState<(typeof TEMPLATE_CATEGORIES)[number]>("All")
  const [status, setStatus] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const rankedPosts = useMemo(() => {
    return state.posts
      .map((post) => ({ post, intelligence: analyzeContent({ title: post.title, content: post.content, type: post.type, profile: state.profile }) }))
      .sort((a, b) => b.intelligence.overallScore - a.intelligence.overallScore)
  }, [state.posts, state.profile])

  const templates = useMemo(() => buildTemplates(state.profile), [state.profile])

  const filteredTemplates = useMemo(() => {
    const term = query.trim().toLowerCase()
    return templates.filter((template) => {
      const matchesFilter = templateFilter === "All" || template.category === templateFilter
      const haystack = [template.title, template.description, template.preview, ...template.structure].join(" ").toLowerCase()
      return matchesFilter && (!term || haystack.includes(term))
    })
  }, [query, templateFilter, templates])

  const posts = useMemo(() => {
    const term = query.trim().toLowerCase()
    return rankedPosts
      .filter(({ post }) => (statusFilter === "all" ? true : post.status === statusFilter))
      .filter(({ post }) => !term || [post.title, post.content, post.type].some((value) => value.toLowerCase().includes(term)))
  }, [query, rankedPosts, statusFilter])

  const topPerformers = useMemo(() => rankedPosts.filter(({ post }) => post.status === "published").slice(0, 4), [rankedPosts])
  const avgScore = useMemo(() => (rankedPosts.length ? Math.round(rankedPosts.reduce((sum, item) => sum + item.intelligence.overallScore, 0) / rankedPosts.length) : 0), [rankedPosts])

  const onDelete = async (post: WorkspacePost) => {
    if (typeof window !== "undefined" && !window.confirm(`Delete "${post.title}"?`)) return
    await deletePost(post.id)
    setStatus(`Deleted ${post.title}`)
  }

  const onCopy = async (id: string, value: string) => {
    await navigator.clipboard.writeText(value)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 1800)
  }

  const loadTemplateInWriter = (template: TemplateCard) => {
    persistWriterIntent({
      id: null as unknown as string,
      title: template.title,
      content: template.preview,
      type: "LinkedIn - Text post",
      status: "draft",
      date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      scheduledTime: null,
      externalPostUrn: null,
      updatedAt: new Date().toISOString(),
    })
    router.push(withClientParam("/writer", activeClientId))
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-10 sm:px-10">
      <div className="relative mb-8 overflow-hidden rounded-2xl border border-zinc-100 bg-white px-6 py-5 shadow-sm">
        <div className="pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full" style={{ background: "radial-gradient(circle, rgba(13,74,69,0.1) 0%, transparent 70%)" }} />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-zinc-400">Client-aware Library</p>
            <h1 className="mt-1 text-3xl font-bold text-zinc-900">Reusable templates, strong posts, and fast copy-ready building blocks</h1>
            <p className="mt-2 max-w-3xl text-sm text-zinc-500">This library adapts to the active client profile. It gives you personalized structures first, then lets you recycle proven workspace posts.</p>
          </div>
          <Link href={withClientParam("/writer?compose=new", activeClientId)} className="cursor-pointer rounded-lg bg-teal px-4 py-2 text-sm font-semibold text-white hover:bg-teal-600">New draft</Link>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Stat label="All posts" value={String(state.posts.length)} accent="zinc" />
        <Stat label="Drafts" value={String(state.drafts.length)} accent="zinc" />
        <Stat label="Scheduled" value={String(state.scheduled.length)} accent="amber" />
        <Stat label="Published" value={String(state.published.length)} accent="teal" />
        <Stat label="Avg score" value={`${avgScore}`} suffix="/100" accent={avgScore >= 90 ? "teal" : avgScore >= 75 ? "amber" : "red"} />
      </div>

      <section className="mb-6 rounded-2xl border border-zinc-200 bg-white p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-zinc-900">Personalized post templates</h2>
            <p className="text-xs text-zinc-500">Generated from the active client role, industry, tone, and goals.</p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {TEMPLATE_CATEGORIES.map((item) => (
              <button key={item} onClick={() => setTemplateFilter(item)} className={`cursor-pointer rounded-lg px-3 py-2 text-xs font-semibold transition-all ${templateFilter === item ? "bg-zinc-900 text-white shadow-sm" : "border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"}`}>
                {item}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {filteredTemplates.map((template) => (
            <article key={template.id} className="rounded-2xl border border-zinc-200 bg-zinc-50/60 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-bold text-zinc-900">{template.title}</h3>
                    <span className="rounded-full bg-gold/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-gold">{template.badge}</span>
                  </div>
                  <p className="mt-1 text-sm leading-relaxed text-zinc-600">{template.description}</p>
                </div>
                <span className="rounded-full border border-zinc-200 bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">{template.category}</span>
              </div>
              <ul className="mt-3 space-y-1.5">
                {template.structure.map((step) => <li key={step} className="text-xs text-zinc-600">- {step}</li>)}
              </ul>
              <div className="mt-4 rounded-xl border border-zinc-200 bg-white p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Preview</p>
                <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-zinc-700">{template.preview}</p>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button onClick={() => loadTemplateInWriter(template)} className="cursor-pointer rounded-lg bg-teal px-3 py-2 text-xs font-bold text-white hover:bg-teal-600">Use in writer</button>
                <button onClick={() => onCopy(template.id, template.preview)} className="cursor-pointer rounded-lg border border-zinc-200 px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50">{copiedId === template.id ? "Copied" : "Copy template"}</button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mb-6 rounded-2xl border border-zinc-200 bg-white p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-zinc-900">Top performers - click to recycle</h2>
            <p className="text-xs text-zinc-500">Best internal scores from published posts.</p>
          </div>
          {topPerformers.length > 0 ? <span className="rounded-lg border border-zinc-100 bg-zinc-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">{topPerformers.length} ready</span> : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {topPerformers.length ? topPerformers.map(({ post, intelligence }) => (
            <button key={post.id} onClick={() => openInWriter(router, post, activeClientId)} className="cursor-pointer rounded-xl border border-zinc-200 bg-zinc-50/80 px-3.5 py-2.5 text-left shadow-sm transition-all hover:border-teal/30 hover:bg-teal/5">
              <div className="flex items-center gap-2.5">
                <span className={`rounded-lg px-2 py-0.5 text-[11px] font-bold ${intelligence.overallScore >= 90 ? "bg-teal/10 text-teal" : intelligence.overallScore >= 75 ? "bg-teal/5 text-teal/80" : "bg-amber-50 text-amber-700"}`}>{intelligence.overallScore}</span>
                <span className="max-w-[200px] truncate text-sm font-semibold text-zinc-900">{post.title}</span>
              </div>
            </button>
          )) : <p className="text-sm text-zinc-400">Publish a few posts to surface recycle candidates.</p>}
        </div>
      </section>

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]">
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search templates, title, content, or type..." className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition-all focus:border-teal/40 focus:ring-4 focus:ring-teal/8" />
        <div className="flex flex-wrap gap-1.5">
          {STATUSES.map((item) => (
            <button key={item} onClick={() => setStatusFilter(item)} className={`cursor-pointer rounded-lg px-3 py-2 text-xs font-semibold transition-all ${statusFilter === item ? "bg-zinc-900 text-white shadow-sm" : "border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"}`}>
              {item === "all" ? "All" : item.replaceAll("_", " ")}
            </button>
          ))}
        </div>
      </div>

      {status ? <p className="mb-4 text-sm text-zinc-600">{status}</p> : null}

      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
        <div className="flex items-center justify-between border-b border-zinc-100 bg-zinc-50/50 px-5 py-4">
          <h2 className="text-sm font-bold text-zinc-900">Workspace content archive</h2>
          <span className="rounded-lg border border-zinc-100 bg-white px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">{posts.length} shown</span>
        </div>
        {posts.length === 0 ? (
          <div className="px-5 py-14 text-center">
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100">
              <svg className="h-5 w-5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            </div>
            <p className="text-sm font-semibold text-zinc-900">No matching posts</p>
            <p className="mt-1 text-xs text-zinc-500">Try a different filter or search term.</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-100">
            {posts.map(({ post, intelligence }) => {
              const score = intelligence.overallScore
              const scoreColor = score >= 90 ? "bg-teal/10 text-teal" : score >= 75 ? "bg-teal/5 text-teal/80" : score >= 60 ? "bg-amber-50 text-amber-700" : "bg-zinc-100 text-zinc-500"
              const statusStyle = post.status === "published" ? "bg-teal/10 text-teal" : post.status === "scheduled" ? "bg-amber-50 text-amber-700" : post.status === "pending_approval" ? "bg-blue-50 text-blue-700" : post.status === "rejected" ? "bg-red-50 text-red-600" : "bg-zinc-100 text-zinc-600"
              return (
                <article key={post.id} className="px-5 py-5 transition-colors hover:bg-zinc-50/50">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="mb-1.5 flex flex-wrap items-center gap-2">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${statusStyle}`}>{post.status.replaceAll("_", " ")}</span>
                        <span className="rounded-full border border-zinc-100 bg-zinc-50 px-2 py-0.5 text-[10px] uppercase tracking-wide text-zinc-500">{post.type}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${scoreColor}`}>{score}/100</span>
                      </div>
                      <h3 className="text-sm font-bold text-zinc-900 leading-snug">{post.title}</h3>
                      <p className="mt-1 text-xs text-zinc-400">{post.date}{post.scheduledTime ? ` - ${post.scheduledTime}` : ""}</p>
                      <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-zinc-600">{post.content}</p>
                      {intelligence.hashtags.length > 0 ? (
                        <div className="mt-2.5 flex flex-wrap gap-1.5">
                          {intelligence.hashtags.slice(0, 4).map((tag) => <span key={tag} className="rounded-full border border-teal/20 bg-teal/5 px-2 py-0.5 text-[10px] font-medium text-teal">{tag}</span>)}
                        </div>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => openInWriter(router, post, activeClientId)} className="cursor-pointer rounded-lg border border-zinc-200 px-3 py-2 text-xs font-semibold text-zinc-700 transition-all hover:border-teal/30 hover:bg-teal/5 hover:text-teal">Load in writer</button>
                      <button onClick={() => onCopy(post.id, post.content)} className="cursor-pointer rounded-lg border border-zinc-200 px-3 py-2 text-xs font-semibold text-zinc-700 transition-all hover:bg-zinc-50">{copiedId === post.id ? "Copied" : "Copy"}</button>
                      <button onClick={() => onDelete(post)} className="cursor-pointer rounded-lg border border-red-100 px-3 py-2 text-xs font-semibold text-red-500 transition-all hover:bg-red-50">Delete</button>
                    </div>
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-3">
                    {intelligence.scores.slice(0, 3).map((item) => (
                      <div key={item.label} className="rounded-xl border border-zinc-100 bg-zinc-50/80 px-3 py-2">
                        <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-400">{item.label}</p>
                        <p className="mt-1 text-sm font-bold text-zinc-900">{item.score}<span className="text-xs font-normal text-zinc-400">/100</span></p>
                      </div>
                    ))}
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function Stat({ label, value, suffix = "", accent }: { label: string; value: string; suffix?: string; accent: "teal" | "amber" | "zinc" | "red" }) {
  const borderColor = accent === "teal" ? "border-l-teal" : accent === "amber" ? "border-l-amber-400" : accent === "red" ? "border-l-red-400" : "border-l-zinc-300"
  const valueColor = accent === "teal" ? "text-teal" : accent === "amber" ? "text-amber-700" : accent === "red" ? "text-red-500" : "text-zinc-900"
  return (
    <div className={`rounded-xl border border-zinc-200 border-l-[3px] bg-white p-4 ${borderColor}`}>
      <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-400">{label}</p>
      <p className={`mt-1.5 text-2xl font-bold ${valueColor}`}>{value}{suffix ? <span className="text-sm font-normal text-zinc-400">{suffix}</span> : null}</p>
    </div>
  )
}
