"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useWorkspace } from "@/components/providers/WorkspaceProvider"
import { analyzeCompetitorPaste } from "@/lib/api/client"
import { persistWriterIntent, withClientParam } from "@/lib/workspace-navigation"

const PLATFORMS = ["LinkedIn", "Twitter / X", "Instagram", "YouTube", "Other"] as const

type CompetitorAnalysis = {
  summary: string
  themes: Array<{ topic: string; count: number }>
  hooks: string[]
  ctas: string[]
  cadence: string
  recommendation: string
}

type CompetitorEntry = {
  profileId: string
  profileName: string
  platform: string
  analyzedAt: string
  analysis: CompetitorAnalysis
}

const toEntry = (raw: Record<string, unknown>): CompetitorEntry | null => {
  if (!raw || typeof raw !== "object") return null
  if (!raw.profileId || !raw.profileName) return null
  return {
    profileId: String(raw.profileId),
    profileName: String(raw.profileName),
    platform: String(raw.platform || "LinkedIn"),
    analyzedAt: String(raw.analyzedAt || ""),
    analysis: (raw.analysis || {}) as CompetitorAnalysis,
  }
}

const toJobEntry = (job: unknown): CompetitorEntry | null => {
  if (!job || typeof job !== "object") return null
  const j = job as Record<string, unknown>
  const payload = (j.payload || {}) as Record<string, unknown>
  if (!payload.profileName) return null
  return {
    profileId: String(j.id || payload.profileId || (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `job-${Date.now()}`)),
    profileName: String(payload.profileName),
    platform: String(payload.platform || "LinkedIn"),
    analyzedAt: String(j.created_at || ""),
    analysis: (payload.analysis || {}) as CompetitorAnalysis,
  }
}

const formatDate = (iso: string) => {
  if (!iso) return ""
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  } catch {
    return iso
  }
}

const buildCounterAngleDraft = (entry: CompetitorEntry) => {
  const themes = entry.analysis.themes?.map((t) => t.topic).join(", ") || "their key themes"
  const lines = [
    `Counter angle: ${entry.profileName} on ${entry.platform}`,
    "",
    entry.analysis.summary || "",
    "",
    `Themes to address: ${themes}`,
    "",
    entry.analysis.recommendation
      ? `Your move: ${entry.analysis.recommendation}`
      : "",
    "",
    "[Write your post here]",
  ].filter((l, i) => i === 0 || l !== "")

  return {
    id: null as string | null,
    title: `Counter angle: ${entry.profileName}`,
    content: lines.join("\n"),
    type: "thought leadership",
    status: "draft",
    date: new Date().toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
    scheduledTime: null as string | null,
    externalPostUrn: null as string | null,
    updatedAt: new Date().toISOString(),
  }
}

export default function CompetitorsPage() {
  const router = useRouter()
  const { loadJobs, createJob, deleteJob, workspaceId, state } = useWorkspace()
  const activeClientId = (state as { agency?: { activeClientId?: string | null } }).agency?.activeClientId || null

  const [form, setForm] = useState({ profileName: "", platform: "LinkedIn" as string, sourceText: "" })
  const [analyzing, setAnalyzing] = useState(false)
  const [pendingAnalysis, setPendingAnalysis] = useState<CompetitorEntry | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  
  const [watchlistJobs, setWatchlistJobs] = useState<CompetitorEntry[]>([])
  const [jobs, setJobs] = useState<CompetitorEntry[]>([])
  const [jobsLoaded, setJobsLoaded] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    loadJobs("competitor_analysis", 50)
      .then((rawJobs) => {
        setJobs(rawJobs.map(toJobEntry).filter(Boolean) as CompetitorEntry[])
        setJobsLoaded(true)
      })
      .catch(() => setJobsLoaded(true))
      
    loadJobs("competitor_watchlist", 50)
      .then((rawJobs) => {
        setWatchlistJobs(rawJobs.map(toJobEntry).filter(Boolean) as CompetitorEntry[])
      })
  }, [loadJobs])

  const onAnalyze = useCallback(async () => {
    if (!form.sourceText.trim()) {
      setStatus("Paste some profile content or posts to analyze.")
      return
    }
    setAnalyzing(true)
    setStatus("Analyzing...")
    setPendingAnalysis(null)
    try {
      const { analysis } = await analyzeCompetitorPaste({
        profileName: form.profileName.trim() || "Unnamed",
        platform: form.platform,
        sourceText: form.sourceText,
        workspaceKey: workspaceId,
      })
      const entry: CompetitorEntry = {
        profileId:
          typeof crypto !== "undefined" && crypto.randomUUID
            ? crypto.randomUUID()
            : `${Date.now()}`,
        profileName: form.profileName.trim() || "Unnamed",
        platform: form.platform,
        analyzedAt: new Date().toISOString(),
        analysis: analysis as CompetitorAnalysis,
      }
      setPendingAnalysis(entry)
      setStatus(null)
    } catch (error) {
      setStatus((error as Error).message || "Analysis failed")
    } finally {
      setAnalyzing(false)
    }
  }, [form])

  const onSaveToWatchlist = useCallback(async () => {
    if (!pendingAnalysis) return
    setStatus("Saving to watchlist...")
    try {
      const job = await createJob({
        type: "competitor_watchlist",
        title: `Watchlist: ${pendingAnalysis.profileName}`,
        payload: {
          profileName: pendingAnalysis.profileName,
          platform: pendingAnalysis.platform,
          analysis: pendingAnalysis.analysis
        }
      })
      const entry = toJobEntry(job)
      if (entry) setWatchlistJobs(prev => [entry, ...prev])
      
      setForm({ profileName: "", platform: "LinkedIn", sourceText: "" })
      setPendingAnalysis(null)
      setStatus(`Saved ${pendingAnalysis.profileName} to watchlist`)
    } catch {
      setStatus("Failed to save to watchlist")
    }
  }, [pendingAnalysis, createJob])

  const onRemove = useCallback(async (jobId: string) => {
    setWatchlistJobs((prev) => prev.filter((c) => c.profileId !== jobId))
    await deleteJob(jobId)
  }, [deleteJob])

  const openInWriter = useCallback(
    (entry: CompetitorEntry) => {
      if (typeof window === "undefined") return
      sessionStorage.setItem("writerLoad", JSON.stringify(buildCounterAngleDraft(entry)))
      router.push("/writer")
    },
    [router]
  )

  return (
    <div className="mx-auto max-w-6xl px-6 py-10 sm:px-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-zinc-900">Competitors</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Paste a competitor&apos;s profile bio or a block of their posts. The analyzer reads tone,
          themes, hooks, and CTAs &mdash; no external API, pure text analysis.
        </p>
      </div>

      {status ? <p className="mb-4 text-sm text-zinc-600">{status}</p> : null}

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        {/* analyze form */}
        <section className="rounded-2xl border border-zinc-200 bg-white p-5 sm:p-6">
          <h2 className="mb-4 text-base font-semibold text-zinc-900">Analyze a profile</h2>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-zinc-500">Name</span>
                <input
                  value={form.profileName}
                  onChange={(e) => setForm((prev) => ({ ...prev, profileName: e.target.value }))}
                  placeholder="e.g. Jane Smith"
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-teal/30"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-zinc-500">Platform</span>
                <select
                  value={form.platform}
                  onChange={(e) => setForm((prev) => ({ ...prev, platform: e.target.value }))}
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-teal/30"
                >
                  {PLATFORMS.map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </select>
              </label>
            </div>

            <label className="block">
              <span className="mb-1 block text-xs font-medium text-zinc-500">
                Source content &mdash; paste bio, about section, or 3&ndash;10 posts
              </span>
              <textarea
                value={form.sourceText}
                onChange={(e) => setForm((prev) => ({ ...prev, sourceText: e.target.value }))}
                placeholder="Paste their profile bio or post text here..."
                rows={8}
                className="w-full resize-y rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-teal/30"
              />
            </label>
          </div>

          <button
            onClick={onAnalyze}
            disabled={analyzing}
            className="mt-4 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {analyzing ? "Analyzing..." : "Analyze"}
          </button>

          {pendingAnalysis && (
            <div className="mt-5">
              <AnalysisCard entry={pendingAnalysis} onOpenInWriter={openInWriter} />
              <div className="mt-3 flex gap-2">
                <button
                  onClick={onSaveToWatchlist}
                  className="rounded-lg bg-teal px-4 py-2 text-sm font-semibold text-white hover:bg-teal-600"
                >
                  Save to watchlist
                </button>
                <button
                  onClick={() => openInWriter(pendingAnalysis)}
                  className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-50"
                >
                  Open in writer
                </button>
              </div>
            </div>
          )}
        </section>

        {/* watchlist */}
        <section className="rounded-2xl border border-zinc-200 bg-white p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-zinc-900">Watchlist</h2>
            <span className="text-xs text-zinc-500">{watchlistJobs.length} saved</span>
          </div>

          {watchlistJobs.length === 0 ? (
            <p className="py-8 text-center text-sm text-zinc-400">
              No profiles yet. Analyze one and save it.
            </p>
          ) : (
            <div className="space-y-3">
              {watchlistJobs.map((entry) => (
                <div
                  key={entry.profileId}
                  className="rounded-xl border border-zinc-200 bg-zinc-50 p-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-zinc-900">
                        {entry.profileName}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-[11px] text-zinc-600">
                          {entry.platform}
                        </span>
                        {entry.analyzedAt && (
                          <span className="text-[11px] text-zinc-400">
                            {formatDate(entry.analyzedAt)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      <button
                        onClick={() => openInWriter(entry)}
                        className="text-xs font-semibold text-zinc-600 hover:text-zinc-900 hover:underline"
                      >
                        Write
                      </button>
                      <button
                        onClick={() =>
                          setExpandedId(
                            expandedId === entry.profileId ? null : entry.profileId
                          )
                        }
                        className="text-xs font-semibold text-teal hover:underline"
                      >
                        {expandedId === entry.profileId ? "Hide" : "View"}
                      </button>
                      <button
                        onClick={() => onRemove(entry.profileId)}
                        className="text-xs text-zinc-400 hover:text-red-500"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                  {expandedId === entry.profileId && (
                    <div className="mt-3 border-t border-zinc-200 pt-3">
                      <AnalysisCard entry={entry} compact onOpenInWriter={openInWriter} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* past analyses from jobs */}
      <section className="mt-6 rounded-2xl border border-zinc-200 bg-white">
        <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-zinc-900">Analysis history</h2>
          <span className="text-xs text-zinc-500">
            {jobsLoaded ? `${jobs.length} runs` : "Loading..."}
          </span>
        </div>

        {!jobsLoaded ? (
          <div className="px-5 py-8 text-center text-sm text-zinc-400">Loading history...</div>
        ) : jobs.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-zinc-400">
            No past analyses. Run one above.
          </div>
        ) : (
          <div className="divide-y divide-zinc-100">
            {jobs.map((job, idx) => (
              <div key={`${job.profileId}-${idx}`} className="px-5 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-zinc-900">{job.profileName}</p>
                    <div className="mt-1 flex flex-wrap gap-2">
                      <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] text-zinc-600">
                        {job.platform}
                      </span>
                      {job.analyzedAt && (
                        <span className="text-[11px] text-zinc-400">
                          {formatDate(job.analyzedAt)}
                        </span>
                      )}
                    </div>
                    {job.analysis?.summary && (
                      <p className="mt-2 line-clamp-2 text-xs text-zinc-500">
                        {job.analysis.summary}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openInWriter(job)}
                      className="text-xs font-semibold text-zinc-600 hover:text-zinc-900 hover:underline"
                    >
                      Write
                    </button>
                    <button
                      onClick={() =>
                        setExpandedId(
                          expandedId === `job-${idx}` ? null : `job-${idx}`
                        )
                      }
                      className="text-xs font-semibold text-teal hover:underline"
                    >
                      {expandedId === `job-${idx}` ? "Hide" : "Expand"}
                    </button>
                  </div>
                </div>
                {expandedId === `job-${idx}` && (
                  <div className="mt-3 border-t border-zinc-100 pt-3">
                    <AnalysisCard entry={job} compact onOpenInWriter={openInWriter} />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function AnalysisCard({
  entry,
  compact = false,
  onOpenInWriter,
}: {
  entry: CompetitorEntry
  compact?: boolean
  onOpenInWriter: (entry: CompetitorEntry) => void
}) {
  const { analysis } = entry
  if (!analysis || typeof analysis !== "object") return null

  return (
    <div className="space-y-3">
      {analysis.summary && (
        <p className={`leading-relaxed text-zinc-700 ${compact ? "text-xs" : "text-sm"}`}>
          {analysis.summary}
        </p>
      )}

      {analysis.themes && analysis.themes.length > 0 && (
        <div>
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
            Top themes
          </p>
          <div className="flex flex-wrap gap-1.5">
            {analysis.themes.map((t) => (
              <span
                key={t.topic}
                className="rounded-full border border-zinc-200 bg-white px-2.5 py-0.5 text-xs text-zinc-700"
              >
                {t.topic}
                {t.count > 1 && <span className="ml-1 text-zinc-400">&times;{t.count}</span>}
              </span>
            ))}
          </div>
        </div>
      )}

      {analysis.cadence && (
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
            Cadence &middot;{" "}
          </span>
          <span className="text-xs text-zinc-700">{analysis.cadence}</span>
        </div>
      )}

      {analysis.hooks && analysis.hooks.length > 0 && (
        <div>
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
            Hooks detected
          </p>
          <ul className="space-y-1">
            {analysis.hooks.map((hook, i) => (
              <li
                key={i}
                className="rounded-lg bg-zinc-50 px-3 py-2 text-xs italic text-zinc-700"
              >
                &ldquo;{hook.length > 120 ? `${hook.slice(0, 120)}â€¦` : hook}&rdquo;
              </li>
            ))}
          </ul>
        </div>
      )}

      {analysis.ctas && analysis.ctas.length > 0 && (
        <div>
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
            CTAs
          </p>
          <ul className="space-y-1">
            {analysis.ctas.map((cta, i) => (
              <li key={i} className="text-xs text-zinc-600">
                &mdash; {cta}
              </li>
            ))}
          </ul>
        </div>
      )}

      {analysis.recommendation && (
        <div className="rounded-xl border border-teal/20 bg-teal/5 px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-teal">
            Your counter move
          </p>
          <p className="mt-1 text-xs leading-relaxed text-zinc-700">
            {analysis.recommendation}
          </p>
          {!compact && (
            <button
              onClick={() => onOpenInWriter(entry)}
              className="mt-2 text-xs font-semibold text-teal hover:underline"
            >
              Open in writer &rarr;
            </button>
          )}
        </div>
      )}
    </div>
  )
}

