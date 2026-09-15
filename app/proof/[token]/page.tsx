"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { ClientLinkMessage, ClientLinkShell, ClientLinkSkeleton } from "@/components/client-links/ClientLinkShell"
import type { ProofSnapshot } from "@/lib/agency/proof"

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
const fmtShort = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" })
const num = (value: number) => value.toLocaleString("en-US")

export default function ProofReportPage() {
  const params = useParams()
  const token = String(params.token || "")
  const [snapshot, setSnapshot] = useState<ProofSnapshot | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let active = true
    fetch(`/api/share/proof/${encodeURIComponent(token)}`, { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error("not_found")
        return res.json() as Promise<{ snapshot: ProofSnapshot }>
      })
      .then((data) => { if (active) setSnapshot(data.snapshot) })
      .catch(() => { if (active) setFailed(true) })
    return () => { active = false }
  }, [token])

  const accent = snapshot?.brandingColor || "#0D4A45"
  const measured = snapshot?.totals.postsWithMetrics ?? 0

  return (
    <ClientLinkShell source="proof" width="wide">
      {!snapshot && !failed ? <ClientLinkSkeleton /> : null}
      {failed ? <ClientLinkMessage tone="error" title="This report is not available" body="The link may have expired or been withdrawn. Ask your agency contact for a current report." /> : null}

      {snapshot ? (
        <article className="space-y-6">
          <header className="rounded-2xl border border-zinc-200 bg-white p-6" style={{ borderTop: `4px solid ${accent}` }}>
            <p className="text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: accent }}>LinkedIn results</p>
            <h1 className="mt-2 text-3xl font-bold text-zinc-900">{snapshot.workspaceName}</h1>
            <p className="mt-1 text-sm text-zinc-600">{fmtDate(snapshot.periodStart)} to {fmtDate(snapshot.periodEnd)}</p>
          </header>

          <section className="grid grid-cols-2 gap-3 md:grid-cols-4" aria-label="Summary">
            {[
              ["Posts published", num(snapshot.totals.postsPublished), null],
              ["Impressions", measured ? num(snapshot.totals.impressions) : "Not available", measured ? `across ${measured} measured post${measured === 1 ? "" : "s"}` : "No synced metrics yet"],
              ["Reactions and comments", measured ? num(snapshot.totals.reactions + snapshot.totals.comments) : "Not available", measured ? `${num(snapshot.totals.reposts)} reposts` : null],
              ["Weeks on target", snapshot.weeksInPeriod ? `${snapshot.weeksOnTarget} of ${snapshot.weeksInPeriod}` : "Too early", `Target: ${snapshot.cadenceTarget} per week`],
            ].map(([label, value, sub]) => (
              <div key={String(label)} className="rounded-2xl border border-zinc-200 bg-white p-4">
                <p className="text-xs font-medium text-zinc-500">{label}</p>
                <p className="mt-1 text-2xl font-bold text-zinc-900">{value}</p>
                {sub ? <p className="mt-0.5 text-[11px] text-zinc-500">{sub}</p> : null}
              </div>
            ))}
          </section>

          <section className="grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-zinc-200 bg-white p-5">
              <p className="text-xs font-medium text-zinc-500">Consistency</p>
              <p className="mt-1 text-lg font-bold text-zinc-900">{snapshot.streakWeeks ? `${snapshot.streakWeeks} week${snapshot.streakWeeks === 1 ? "" : "s"} in a row on target` : "Building the streak"}</p>
              <p className="mt-1 text-sm text-zinc-600">Showing up every week is what compounds on LinkedIn.</p>
            </div>
            <div className="rounded-2xl border border-zinc-200 bg-white p-5">
              <p className="text-xs font-medium text-zinc-500">Your review time</p>
              <p className="mt-1 text-lg font-bold text-zinc-900">{snapshot.approvals.medianHoursToDecision === null ? "No reviews in this period" : `Typically ${snapshot.approvals.medianHoursToDecision < 24 ? `${Math.max(1, Math.round(snapshot.approvals.medianHoursToDecision))} hours` : `${Math.round(snapshot.approvals.medianHoursToDecision / 24)} days`}`}</p>
              <p className="mt-1 text-sm text-zinc-600">{snapshot.approvals.decided} draft{snapshot.approvals.decided === 1 ? "" : "s"} reviewed{snapshot.approvals.autoApproved ? `, ${snapshot.approvals.autoApproved} approved by the agreed no-reply window` : ""}.</p>
            </div>
          </section>

          {snapshot.topPost ? (
            <section className="rounded-2xl border bg-white p-5" style={{ borderColor: accent }}>
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: accent }}>Strongest post</p>
              <p className="mt-2 text-lg font-bold text-zinc-900">{snapshot.topPost.title}</p>
              <p className="mt-1 text-sm leading-6 text-zinc-600">{snapshot.topPost.excerpt}</p>
              {snapshot.topPost.metrics ? (
                <p className="mt-3 text-sm font-semibold text-zinc-800">{num(snapshot.topPost.metrics.impressions)} impressions, {num(snapshot.topPost.metrics.reactions)} reactions, {num(snapshot.topPost.metrics.comments)} comments</p>
              ) : null}
              {snapshot.topPost.url ? <a href={snapshot.topPost.url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-sm font-semibold hover:underline" style={{ color: accent }}>View on LinkedIn</a> : null}
            </section>
          ) : null}

          <section className="rounded-2xl border border-zinc-200 bg-white">
            <h2 className="border-b border-zinc-100 px-5 py-3 text-sm font-bold text-zinc-900">Everything published</h2>
            {snapshot.posts.length ? (
              <ul className="divide-y divide-zinc-100">
                {snapshot.posts.map((post, index) => (
                  <li key={index} className="flex flex-wrap items-start justify-between gap-3 px-5 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-zinc-900">{post.title}</p>
                      <p className="mt-0.5 line-clamp-2 text-xs leading-5 text-zinc-500">{post.excerpt}</p>
                    </div>
                    <div className="shrink-0 text-right text-xs text-zinc-600">
                      <p>{fmtShort(post.publishedAt)}</p>
                      {post.metrics ? <p className="font-semibold text-zinc-800">{num(post.metrics.impressions)} impressions</p> : <p className="text-zinc-400">No metrics synced</p>}
                      {post.url ? <a href={post.url} target="_blank" rel="noopener noreferrer" className="font-semibold hover:underline" style={{ color: accent }}>Open</a> : null}
                    </div>
                  </li>
                ))}
              </ul>
            ) : <p className="px-5 py-6 text-sm text-zinc-500">No posts were published in this period.</p>}
          </section>

          <p className="text-center text-xs leading-5 text-zinc-500">
            Figures come from LinkedIn for posts published through Qalam. Posts without synced metrics are listed but not counted. Report generated {fmtDate(snapshot.generatedAt)}.
          </p>
        </article>
      ) : null}
    </ClientLinkShell>
  )
}
