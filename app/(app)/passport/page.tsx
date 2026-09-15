"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useWorkspace } from "@/components/providers/WorkspaceProvider"
import { fetchJson, friendlyError, relativeTime } from "@/components/agency/agency-ui"

type Kind = "do" | "dont" | "banned_phrase" | "correction"
type Entry = { id: string; kind: Kind; body: string; note: string | null; source_approval_id: string | null; created_by: string | null; created_at: string }
type PassportResponse = {
  workspace: { id: string; name: string; type: "personal" | "client"; brandingColor: string | null }
  summary: string | null
  entries: Entry[]
  limit: number
  permissions: { canAdd: boolean; canManage: boolean; userId: string }
}

const KINDS: { kind: Kind; title: string; hint: string; placeholder: string }[] = [
  { kind: "do", title: "Always", hint: "Habits every post should keep.", placeholder: "Use British spelling" },
  { kind: "dont", title: "Never", hint: "Lines the author will not cross.", placeholder: "Mention competitors by name" },
  { kind: "banned_phrase", title: "Banned words", hint: "Words or phrases they dislike.", placeholder: "game-changer" },
  { kind: "correction", title: "Corrections", hint: "Things the author fixed in earlier drafts.", placeholder: "Called the product a platform" },
]

export default function VoicePassportPage() {
  const { workspaceId, activeClientId } = useWorkspace()
  const targetId = activeClientId || workspaceId
  const [data, setData] = useState<PassportResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [summaryDraft, setSummaryDraft] = useState("")
  const [savingSummary, setSavingSummary] = useState(false)
  const [drafts, setDrafts] = useState<Record<Kind, { body: string; note: string }>>({
    do: { body: "", note: "" }, dont: { body: "", note: "" }, banned_phrase: { body: "", note: "" }, correction: { body: "", note: "" },
  })
  const [busy, setBusy] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!targetId) return
    try {
      const response = await fetchJson<PassportResponse>(`/api/workspaces/${targetId}/passport`)
      setData(response)
      setSummaryDraft(response.summary || "")
      setError(null)
    } catch (caught) {
      setError(friendlyError((caught as Error).message, "Could not load the Voice Passport."))
    }
  }, [targetId])

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0)
    return () => window.clearTimeout(timer)
  }, [load])

  const addEntry = async (kind: Kind) => {
    const draft = drafts[kind]
    if (draft.body.trim().length < 2) return
    setBusy(kind)
    try {
      const { entry } = await fetchJson<{ entry: Entry }>(`/api/workspaces/${targetId}/passport`, {
        method: "POST",
        body: JSON.stringify({ kind, body: draft.body.trim(), note: draft.note.trim() }),
      })
      setData((current) => current ? { ...current, entries: [entry, ...current.entries] } : current)
      setDrafts((current) => ({ ...current, [kind]: { body: "", note: "" } }))
      setError(null)
    } catch (caught) {
      setError(friendlyError((caught as Error).message))
    } finally {
      setBusy(null)
    }
  }

  const removeEntry = async (entry: Entry) => {
    setBusy(entry.id)
    try {
      await fetchJson(`/api/workspaces/${targetId}/passport?entryId=${entry.id}`, { method: "DELETE" })
      setData((current) => current ? { ...current, entries: current.entries.filter((item) => item.id !== entry.id) } : current)
    } catch (caught) {
      setError(friendlyError((caught as Error).message))
    } finally {
      setBusy(null)
    }
  }

  const saveSummary = async () => {
    setSavingSummary(true)
    try {
      const { summary } = await fetchJson<{ summary: string | null }>(`/api/workspaces/${targetId}/passport`, { method: "PATCH", body: JSON.stringify({ summary: summaryDraft }) })
      setData((current) => current ? { ...current, summary } : current)
      setError(null)
    } catch (caught) {
      setError(friendlyError((caught as Error).message))
    } finally {
      setSavingSummary(false)
    }
  }

  const total = data?.entries.length ?? 0

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-8 sm:py-10">
      <header className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal">Voice Passport</p>
        <h1 className="mt-1 text-3xl font-bold text-zinc-900">{data ? data.workspace.type === "personal" ? "Your writing rules" : `How ${data.workspace.name} writes` : "Voice Passport"}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600">
          Rules your team saves on purpose. Every draft, rewrite, hook, and carousel generated in this workspace follows them, so a new writer sounds right on day one.
        </p>
      </header>

      {error ? <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{error}</div> : null}
      {!data && !error ? <div className="h-64 animate-pulse rounded-2xl bg-zinc-100" /> : null}

      {data ? (
        <div className="space-y-5">
          <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-zinc-900">In one paragraph</h2>
                <p className="mt-0.5 text-xs text-zinc-500">Who they are and how they want to come across. Writers read this first.</p>
              </div>
              <span className="text-xs text-zinc-400">{total} of {data.limit} rules</span>
            </div>
            {data.permissions.canManage ? (
              <>
                <textarea
                  value={summaryDraft}
                  onChange={(event) => setSummaryDraft(event.target.value)}
                  maxLength={2000}
                  rows={4}
                  placeholder="An operator in B2B logistics. Plain, dry, specific. Proud of the team, allergic to hype. Talks about decisions and trade-offs, never about hustle."
                  className="mt-3 w-full resize-y rounded-xl border border-zinc-200 bg-zinc-50/50 px-4 py-3 text-sm leading-6 text-zinc-900 outline-none focus:border-teal focus:bg-white focus:ring-4 focus:ring-teal/10"
                />
                <div className="mt-2 flex justify-end">
                  <button onClick={() => void saveSummary()} disabled={savingSummary || summaryDraft === (data.summary || "")} className="rounded-lg bg-zinc-900 px-3 py-2 text-xs font-semibold text-white hover:bg-zinc-800 disabled:opacity-40">
                    {savingSummary ? "Saving..." : "Save summary"}
                  </button>
                </div>
              </>
            ) : (
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-zinc-700">{data.summary || "No summary yet. A workspace manager can add one."}</p>
            )}
          </section>

          <div className="grid gap-5 md:grid-cols-2">
            {KINDS.map((section) => {
              const entries = data.entries.filter((entry) => entry.kind === section.kind)
              const draft = drafts[section.kind]
              return (
                <section key={section.kind} className="flex flex-col rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
                  <h2 className="text-base font-bold text-zinc-900">{section.title} <span className="text-sm font-semibold text-zinc-400">{entries.length}</span></h2>
                  <p className="mt-0.5 text-xs text-zinc-500">{section.hint}</p>

                  <ul className="mt-3 flex-1 space-y-2">
                    {!entries.length ? <li className="rounded-lg border border-dashed border-zinc-200 px-3 py-4 text-center text-xs text-zinc-400">Nothing saved yet</li> : null}
                    {entries.map((entry) => {
                      const canDelete = data.permissions.canManage || entry.created_by === data.permissions.userId
                      return (
                        <li key={entry.id} className="group flex items-start justify-between gap-2 rounded-lg bg-zinc-50 px-3 py-2">
                          <div className="min-w-0">
                            <p className="text-sm text-zinc-800">{entry.body}</p>
                            {entry.note ? <p className="mt-0.5 text-xs text-zinc-500">{entry.note}</p> : null}
                            <p className="mt-0.5 text-[11px] text-zinc-400">{entry.source_approval_id ? "From a client review, " : ""}{relativeTime(entry.created_at)}</p>
                          </div>
                          {canDelete ? (
                            <button onClick={() => void removeEntry(entry)} disabled={busy === entry.id} aria-label={`Remove rule: ${entry.body}`} className="shrink-0 rounded-md px-2 py-1 text-xs font-semibold text-zinc-400 hover:bg-white hover:text-red-600 disabled:opacity-50">Remove</button>
                          ) : null}
                        </li>
                      )
                    })}
                  </ul>

                  {data.permissions.canAdd ? (
                    <form className="mt-3 space-y-2" onSubmit={(event) => { event.preventDefault(); void addEntry(section.kind) }}>
                      <input
                        value={draft.body}
                        onChange={(event) => setDrafts((current) => ({ ...current, [section.kind]: { ...draft, body: event.target.value } }))}
                        maxLength={600}
                        placeholder={section.placeholder}
                        aria-label={`New ${section.title.toLowerCase()} rule`}
                        className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-teal focus:ring-4 focus:ring-teal/10"
                      />
                      {section.kind === "correction" ? (
                        <input
                          value={draft.note}
                          onChange={(event) => setDrafts((current) => ({ ...current, [section.kind]: { ...draft, note: event.target.value } }))}
                          maxLength={600}
                          placeholder="What they wanted instead"
                          aria-label="What the author wanted instead"
                          className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-teal focus:ring-4 focus:ring-teal/10"
                        />
                      ) : null}
                      <button type="submit" disabled={busy === section.kind || draft.body.trim().length < 2} className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-40">
                        {busy === section.kind ? "Saving..." : "Add rule"}
                      </button>
                    </form>
                  ) : null}
                </section>
              )
            })}
          </div>

          <p className="text-xs leading-5 text-zinc-500">
            Qalam does not change these rules on its own. Corrections are saved when someone on the team chooses to, for example from a client&apos;s line comment on <Link href="/desk" className="font-semibold text-teal-700 hover:underline">My Desk</Link>.
          </p>
        </div>
      ) : null}
    </div>
  )
}
