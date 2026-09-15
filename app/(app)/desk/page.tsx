"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import type { LinkedInStatus } from "@/lib/agency/health"
import {
  CadenceMeter,
  LinkedInBadge,
  StreakBadge,
  fetchJson,
  formatDateTime,
  friendlyError,
  relativeTime,
  type ClientCadence,
} from "@/components/agency/agency-ui"

type DeskKind = "failed" | "needs_revision" | "approved_ready" | "fresh_material" | "draft" | "awaiting_client" | "scheduled"

type DeskItem = {
  id: string
  kind: DeskKind
  workspaceId: string
  workspaceName: string
  workspaceType: "personal" | "client"
  brandingColor: string | null
  title: string
  detail: string | null
  at: string
  postId: string | null
  approvalId: string | null
  inlineComments: { quote: string; note: string }[]
  autoApproveAt: string | null
}

type DeskClient = { id: string; name: string; brandingColor: string | null; cadence: ClientCadence; linkedIn: LinkedInStatus; nextScheduledAt: string | null }

type DeskResponse = { firstName: string; items: DeskItem[]; counts: Record<DeskKind, number>; actionable: number; clients: DeskClient[] }

const SECTIONS: { kind: DeskKind; title: string; hint: string }[] = [
  { kind: "failed", title: "Failed to publish", hint: "Fix these first. A client is expecting them live." },
  { kind: "needs_revision", title: "Client asked for changes", hint: "Their exact comments are below." },
  { kind: "approved_ready", title: "Approved and ready", hint: "Schedule or publish while the approval is fresh." },
  { kind: "fresh_material", title: "Fresh client material", hint: "Real answers from clients. The best raw material you will get." },
  { kind: "draft", title: "Drafts in progress", hint: "Most recent first." },
  { kind: "awaiting_client", title: "Waiting on the client", hint: "Nothing to do unless it stalls." },
  { kind: "scheduled", title: "Going out this week", hint: "In publishing order." },
]

const greeting = () => {
  const hour = new Date().getHours()
  return hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening"
}

const writerHref = (item: DeskItem, extra = "") => {
  const params = new URLSearchParams()
  if (item.postId) params.set("postId", item.postId)
  if (item.workspaceType === "client") params.set("client", item.workspaceId)
  return `/writer?${params.toString()}${extra}`
}

function ClientChip({ item }: { item: Pick<DeskItem, "workspaceName" | "brandingColor"> }) {
  return (
    <span className="inline-flex max-w-[12rem] items-center gap-1.5 truncate rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-semibold text-zinc-700">
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-teal" style={item.brandingColor ? { backgroundColor: item.brandingColor } : undefined} />
      <span className="truncate">{item.workspaceName}</span>
    </span>
  )
}

export default function DeskPage() {
  const [data, setData] = useState<DeskResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [savedCorrections, setSavedCorrections] = useState<Set<string>>(new Set())

  const load = useCallback(async () => {
    try {
      setData(await fetchJson<DeskResponse>("/api/desk"))
      setError(null)
    } catch (caught) {
      setError(friendlyError((caught as Error).message, "Could not load your desk. Refresh to try again."))
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0)
    return () => window.clearTimeout(timer)
  }, [load])

  const grouped = useMemo(() => {
    const map = new Map<DeskKind, DeskItem[]>()
    for (const item of data?.items || []) map.set(item.kind, [...(map.get(item.kind) || []), item])
    return map
  }, [data])

  const markDrop = async (item: DeskItem, state: "used" | "dismissed") => {
    setBusy(item.id)
    try {
      await fetchJson(`/api/workspaces/${item.workspaceId}/voice-drops`, { method: "PATCH", body: JSON.stringify({ dropId: item.id.replace("drop:", ""), state }) })
      setData((current) => current ? { ...current, items: current.items.filter((row) => row.id !== item.id), counts: { ...current.counts, fresh_material: Math.max(0, current.counts.fresh_material - 1) } } : current)
    } catch (caught) {
      setNotice(friendlyError((caught as Error).message))
    } finally {
      setBusy(null)
    }
  }

  const saveCorrection = async (item: DeskItem, comment: { quote: string; note: string }) => {
    const key = `${item.id}:${comment.quote}:${comment.note}`
    setBusy(key)
    try {
      await fetchJson(`/api/workspaces/${item.workspaceId}/passport`, {
        method: "POST",
        body: JSON.stringify({ kind: "correction", body: `Wrote "${comment.quote.slice(0, 400)}"`, note: comment.note.slice(0, 600), sourceApprovalId: item.approvalId || undefined }),
      })
      setSavedCorrections((current) => new Set(current).add(key))
      setNotice(`Saved to ${item.workspaceName}'s Voice Passport. Future drafts will avoid it.`)
    } catch (caught) {
      setNotice(friendlyError((caught as Error).message))
    } finally {
      setBusy(null)
    }
  }

  const draftFromDrop = (item: DeskItem) => {
    const topic = `${item.title}\n\nClient's answer: ${item.detail || ""}`.slice(0, 1500)
    const params = new URLSearchParams({ topic, compose: "new" })
    if (item.workspaceType === "client") params.set("client", item.workspaceId)
    void markDrop(item, "used").finally(() => { window.location.href = `/writer?${params.toString()}` })
  }

  const counts = data?.counts
  const clear = data && !data.items.length

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-8 sm:py-10">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal">My Desk</p>
          <h1 className="mt-1 text-3xl font-bold text-zinc-900">{greeting()}{data?.firstName ? `, ${data.firstName}` : ""}</h1>
          <p className="mt-1 text-sm text-zinc-600">Everything that needs you across every client, in the order it matters.</p>
        </div>
        <button onClick={() => void load()} className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50">Refresh</button>
      </header>

      {counts ? (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ["Needs you now", data.actionable, data.actionable ? "text-zinc-900" : "text-emerald-700"],
            ["Client changes", counts.needs_revision, "text-zinc-900"],
            ["Waiting on clients", counts.awaiting_client, "text-zinc-900"],
            ["Going out this week", counts.scheduled, "text-zinc-900"],
          ].map(([label, value, cls]) => (
            <div key={String(label)} className="rounded-xl border border-zinc-200 bg-white px-4 py-3">
              <p className="text-xs font-medium text-zinc-500">{label}</p>
              <p className={`mt-1 text-2xl font-bold ${cls}`}>{value}</p>
            </div>
          ))}
        </div>
      ) : null}

      {notice ? (
        <div className="mb-4 flex items-start justify-between gap-3 rounded-xl border border-teal/20 bg-teal-50 px-4 py-3 text-sm text-teal-900" role="status">
          <span>{notice}</span>
          <button onClick={() => setNotice(null)} className="text-xs font-semibold text-teal-800 hover:underline">Dismiss</button>
        </div>
      ) : null}
      {error ? <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          {!data && !error ? [0, 1, 2].map((key) => <div key={key} className="h-32 animate-pulse rounded-2xl bg-zinc-100" />) : null}

          {clear ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-6 py-10 text-center">
              <p className="text-lg font-bold text-emerald-900">Desk clear</p>
              <p className="mx-auto mt-1 max-w-md text-sm text-emerald-800">Nothing is waiting on you. Start the next post while you have the head space.</p>
              <Link href="/writer?compose=new" className="mt-4 inline-block rounded-xl bg-teal px-4 py-2.5 text-sm font-bold text-white hover:bg-teal-600">Write a post</Link>
            </div>
          ) : null}

          {SECTIONS.map((section) => {
            const items = grouped.get(section.kind)
            if (!items?.length) return null
            const quiet = section.kind === "awaiting_client" || section.kind === "scheduled"
            return (
              <section key={section.kind} aria-labelledby={`desk-${section.kind}`}>
                <div className="mb-2 flex items-baseline justify-between gap-3">
                  <h2 id={`desk-${section.kind}`} className="text-sm font-bold text-zinc-900">{section.title} <span className="font-semibold text-zinc-400">{items.length}</span></h2>
                  <p className="hidden text-xs text-zinc-500 sm:block">{section.hint}</p>
                </div>
                <ul className="space-y-2">
                  {items.map((item) => (
                    <li key={item.id} className={`rounded-xl border bg-white p-4 ${section.kind === "failed" ? "border-red-200" : section.kind === "needs_revision" ? "border-amber-200" : "border-zinc-200"} ${quiet ? "py-3" : ""}`}>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="mb-1 flex flex-wrap items-center gap-2">
                            <ClientChip item={item} />
                            <span className="text-[11px] text-zinc-400">
                              {item.kind === "scheduled" ? formatDateTime(item.at) : relativeTime(item.at)}
                            </span>
                            {item.autoApproveAt ? <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-600">Auto-approves {relativeTime(item.autoApproveAt)}</span> : null}
                          </div>
                          <p className={`font-semibold text-zinc-900 ${quiet ? "text-sm" : ""}`}>{item.title}</p>
                          {item.detail && item.kind !== "fresh_material" ? <p className="mt-1 text-sm text-zinc-600">{item.detail}</p> : null}
                          {item.kind === "fresh_material" && item.detail ? (
                            <blockquote className="mt-2 whitespace-pre-wrap rounded-lg border-l-2 border-teal bg-zinc-50 px-3 py-2 text-sm leading-6 text-zinc-700">{item.detail}</blockquote>
                          ) : null}
                        </div>
                        <div className="flex shrink-0 flex-wrap gap-2">
                          {item.kind === "fresh_material" ? (
                            <>
                              <button disabled={busy === item.id} onClick={() => draftFromDrop(item)} className="rounded-lg bg-teal px-3 py-2 text-xs font-bold text-white hover:bg-teal-600 disabled:opacity-50">Draft from this</button>
                              <button disabled={busy === item.id} onClick={() => void markDrop(item, "dismissed")} className="rounded-lg border border-zinc-200 px-3 py-2 text-xs font-semibold text-zinc-600 hover:bg-zinc-50 disabled:opacity-50">Dismiss</button>
                            </>
                          ) : item.postId ? (
                            <Link href={writerHref(item)} className={`rounded-lg px-3 py-2 text-xs font-bold ${quiet ? "border border-zinc-200 text-zinc-700 hover:bg-zinc-50" : "bg-zinc-900 text-white hover:bg-zinc-800"}`}>
                              {item.kind === "failed" ? "Fix post" : item.kind === "needs_revision" ? "Revise" : item.kind === "approved_ready" ? "Schedule" : "Open"}
                            </Link>
                          ) : item.kind === "awaiting_client" ? (
                            <Link href={item.workspaceType === "client" ? `/approvals?client=${item.workspaceId}` : "/approvals"} className="rounded-lg border border-zinc-200 px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50">View</Link>
                          ) : null}
                        </div>
                      </div>
                      {item.inlineComments.length ? (
                        <ul className="mt-3 space-y-2 border-t border-zinc-100 pt-3">
                          {item.inlineComments.map((comment) => {
                            const key = `${item.id}:${comment.quote}:${comment.note}`
                            const saved = savedCorrections.has(key)
                            return (
                              <li key={key} className="flex flex-wrap items-start justify-between gap-2 text-sm">
                                <div className="min-w-0 flex-1">
                                  <mark className="rounded bg-amber-100 px-1 text-zinc-800">{comment.quote}</mark>
                                  <p className="mt-1 text-zinc-700">{comment.note}</p>
                                </div>
                                {item.workspaceType === "client" ? (
                                  <button disabled={saved || busy === key} onClick={() => void saveCorrection(item, comment)} className="shrink-0 rounded-lg border border-zinc-200 px-2.5 py-1.5 text-[11px] font-semibold text-zinc-600 hover:bg-zinc-50 disabled:opacity-60">
                                    {saved ? "Saved to passport" : "Save to Voice Passport"}
                                  </button>
                                ) : null}
                              </li>
                            )
                          })}
                        </ul>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </section>
            )
          })}
        </div>

        <aside className="space-y-3 lg:sticky lg:top-6">
          <h2 className="text-sm font-bold text-zinc-900">Your clients this week</h2>
          {data && !data.clients.length ? <p className="rounded-xl border border-dashed border-zinc-300 bg-white px-4 py-6 text-center text-xs text-zinc-500">You are not assigned to any client workspace yet.</p> : null}
          {data?.clients.map((client) => (
            <div key={client.id} className="rounded-xl border border-zinc-200 bg-white p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-sm font-bold text-zinc-900">{client.name}</p>
                <StreakBadge cadence={client.cadence} />
              </div>
              <div className="mt-3"><CadenceMeter cadence={client.cadence} color={client.brandingColor} /></div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <LinkedInBadge status={client.linkedIn} />
                {client.nextScheduledAt ? <span className="text-[11px] text-zinc-500">Next {relativeTime(client.nextScheduledAt)}</span> : null}
              </div>
              <div className="mt-3 flex gap-3 text-xs font-semibold">
                <Link href={`/passport?client=${client.id}`} className="text-teal-700 hover:underline">Voice Passport</Link>
                <Link href={`/writer?compose=new&client=${client.id}`} className="text-zinc-600 hover:underline">New post</Link>
              </div>
            </div>
          ))}
        </aside>
      </div>
    </div>
  )
}
