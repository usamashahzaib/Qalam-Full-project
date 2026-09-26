"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { OneTimeLink, fetchJson, formatDateTime, friendlyError, relativeTime } from "@/components/agency/agency-ui"

type Sample = { angle: string; content: string }
type Pitch = { id: string; agency_name: string; prospect_name: string; prospect_role: string | null; samples: Sample[]; created_at: string; expires_at: string; revoked_at: string | null; view_count: number; last_viewed_at: string | null; converted_at: string | null; converted_workspace_id: string | null }

const AGENCY_NAME_KEY = "qalam-pitch-agency-name"

export default function PitchModePage() {
  const [pitches, setPitches] = useState<Pitch[]>([])
  const [usage, setUsage] = useState<{ used: number; limit: number } | null>(null)
  const [locked, setLocked] = useState(false)
  const [form, setForm] = useState({ agencyName: "", prospectName: "", prospectRole: "", focus: "", sourcePosts: "" })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ pitch: Pitch; url: string } | null>(null)
  const [converting, setConverting] = useState<string | null>(null)

  const [now] = useState(() => Date.now())

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const saved = window.localStorage.getItem(AGENCY_NAME_KEY)
        if (saved) setForm((current) => (current.agencyName ? current : { ...current, agencyName: saved }))
      } catch { /* storage unavailable */ }
    }, 0)
    fetchJson<{ pitches: Pitch[]; usage: { used: number; limit: number } }>("/api/agency/pitch")
      .then((data) => { setPitches(data.pitches); setUsage(data.usage) })
      .catch((caught) => {
        if ((caught as Error).message === "upgrade_required") setLocked(true)
        else setError(friendlyError((caught as Error).message))
      })
    return () => window.clearTimeout(timer)
  }, [])

  const update = (field: keyof typeof form, value: string) => setForm((current) => ({ ...current, [field]: value }))
  const ready = form.agencyName.trim().length >= 2 && form.prospectName.trim().length >= 2 && form.sourcePosts.trim().length >= 300

  const generate = async () => {
    setBusy(true)
    setError(null)
    setResult(null)
    try {
      const data = await fetchJson<{ pitch: Pitch; url: string }>("/api/agency/pitch", { method: "POST", body: JSON.stringify(form) })
      setResult(data)
      setPitches((current) => [data.pitch, ...current])
      setUsage((current) => current ? { ...current, used: current.used + 1 } : current)
      try { window.localStorage.setItem(AGENCY_NAME_KEY, form.agencyName.trim()) } catch { /* storage unavailable */ }
    } catch (caught) {
      setError(friendlyError((caught as Error).message))
    } finally {
      setBusy(false)
    }
  }

  const revoke = async (pitch: Pitch) => {
    try {
      await fetchJson(`/api/agency/pitch?pitchId=${pitch.id}`, { method: "DELETE" })
      setPitches((current) => current.map((item) => item.id === pitch.id ? { ...item, revoked_at: new Date().toISOString() } : item))
    } catch (caught) {
      setError(friendlyError((caught as Error).message))
    }
  }

  const convert = async (pitch: Pitch) => {
    setConverting(pitch.id)
    setError(null)
    try {
      const data = await fetchJson<{ workspaceId: string; drafts: number }>("/api/agency/pitch/convert", { method: "POST", body: JSON.stringify({ pitchId: pitch.id }) })
      setPitches((current) => current.map((item) => item.id === pitch.id ? { ...item, converted_at: new Date().toISOString(), converted_workspace_id: data.workspaceId } : item))
    } catch (caught) {
      setError(friendlyError((caught as Error).message))
    } finally {
      setConverting(null)
    }
  }

  if (locked) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-zinc-900">Pitch Mode is part of the Agency plan</h1>
        <p className="mt-2 text-sm text-zinc-600">Turn a prospect&apos;s public posts into three sample drafts in their voice, and send them a private preview.</p>
        <Link href="/pricing" className="mt-6 inline-block rounded-xl bg-zinc-900 px-5 py-2.5 text-sm font-bold text-white hover:bg-zinc-800">View Agency plan</Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-8 sm:py-10">
      <Link href="/agency" className="text-xs font-semibold text-zinc-500 hover:text-zinc-800">Back to Agency Hub</Link>
      <header className="mb-6 mt-3">
        <p className="t-eyebrow text-teal">Pitch Mode</p>
        <h1 className="mt-1 text-3xl font-bold text-zinc-900">Show a prospect their own voice, done well</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600">Paste a few of the prospect&apos;s public LinkedIn posts. Qalam drafts three sample posts in their voice and gives you a private preview link to send. Their posts are used once and not stored.</p>
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-5">
          <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-semibold text-zinc-600">Your agency name
                <input value={form.agencyName} onChange={(event) => update("agencyName", event.target.value)} maxLength={100} placeholder="Northline Studio" className="mt-1.5 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm font-normal text-zinc-900 outline-none focus:border-teal focus:ring-4 focus:ring-teal/10" />
              </label>
              <label className="text-xs font-semibold text-zinc-600">Prospect name
                <input value={form.prospectName} onChange={(event) => update("prospectName", event.target.value)} maxLength={100} placeholder="Sara Malik" className="mt-1.5 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm font-normal text-zinc-900 outline-none focus:border-teal focus:ring-4 focus:ring-teal/10" />
              </label>
              <label className="text-xs font-semibold text-zinc-600">Their role <span className="font-normal text-zinc-400">(optional)</span>
                <input value={form.prospectRole} onChange={(event) => update("prospectRole", event.target.value)} maxLength={160} placeholder="COO, regional logistics company" className="mt-1.5 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm font-normal text-zinc-900 outline-none focus:border-teal focus:ring-4 focus:ring-teal/10" />
              </label>
              <label className="text-xs font-semibold text-zinc-600">Focus topics <span className="font-normal text-zinc-400">(optional)</span>
                <input value={form.focus} onChange={(event) => update("focus", event.target.value)} maxLength={300} placeholder="Hiring, operations, customer retention" className="mt-1.5 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm font-normal text-zinc-900 outline-none focus:border-teal focus:ring-4 focus:ring-teal/10" />
              </label>
            </div>
            <label className="mt-3 block text-xs font-semibold text-zinc-600">Their public posts
              <textarea value={form.sourcePosts} onChange={(event) => update("sourcePosts", event.target.value)} maxLength={20000} rows={10} placeholder="Paste 2 to 5 of their recent LinkedIn posts. More posts give a closer voice match." className="mt-1.5 w-full resize-y rounded-lg border border-zinc-200 px-3 py-2 text-sm font-normal leading-6 text-zinc-900 outline-none focus:border-teal focus:ring-4 focus:ring-teal/10" />
            </label>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-zinc-500">{form.sourcePosts.trim().length < 300 ? `${300 - form.sourcePosts.trim().length} more characters needed` : `${form.sourcePosts.trim().length.toLocaleString()} characters`}</p>
              <button onClick={() => void generate()} disabled={!ready || busy} className="rounded-xl bg-teal px-5 py-2.5 text-sm font-bold text-white hover:bg-teal-600 disabled:opacity-40">{busy ? "Drafting three samples..." : "Create pitch"}</button>
            </div>
            {error ? <p className="mt-3 text-sm font-medium text-red-600" role="alert">{error}</p> : null}
          </section>

          {result ? (
            <section className="space-y-3" aria-live="polite">
              <OneTimeLink url={result.url} note={`Send this to ${result.pitch.prospect_name}. It is shown only once and stays live for 30 days.`} />
              {result.pitch.samples.map((sample, index) => (
                <article key={index} className="rounded-2xl border border-zinc-200 bg-white p-5">
                  <p className="t-eyebrow text-teal-700">Sample {index + 1}: {sample.angle}</p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-zinc-800">{sample.content}</p>
                </article>
              ))}
            </section>
          ) : null}
        </div>

        <aside className="space-y-3">
          <div className="rounded-xl border border-zinc-200 bg-white p-4">
            <p className="text-sm font-bold text-zinc-900">This month</p>
            <p className="mt-1 text-xs text-zinc-500">{usage ? `${usage.used} of ${usage.limit} pitches used. Each pitch also counts as one draft.` : "Loading..."}</p>
          </div>
          <h2 className="pt-2 text-sm font-bold text-zinc-900">Sent pitches</h2>
          {!pitches.length ? <p className="rounded-xl border border-dashed border-zinc-300 bg-white px-4 py-6 text-center text-xs text-zinc-500">No pitches yet.</p> : null}
          {pitches.map((pitch) => {
            const live = !pitch.revoked_at && Date.parse(pitch.expires_at) > now
            return (
              <div key={pitch.id} className="rounded-xl border border-zinc-200 bg-white p-3">
                <p className="text-sm font-semibold text-zinc-900">{pitch.prospect_name}</p>
                <p className="text-[11px] text-zinc-500">Created {relativeTime(pitch.created_at)}</p>
                <p className={`mt-1 text-xs font-semibold ${pitch.view_count ? "text-emerald-700" : "text-zinc-500"}`}>
                  {pitch.view_count ? `Opened ${pitch.view_count} time${pitch.view_count === 1 ? "" : "s"}, last ${formatDateTime(pitch.last_viewed_at)}` : "Not opened yet"}
                </p>
                {pitch.converted_workspace_id ? (
                  <Link href={`/agency?client=${pitch.converted_workspace_id}`} className="mt-2 inline-flex min-h-9 items-center text-xs font-bold text-teal-700 hover:underline">Client created. Open workspace</Link>
                ) : (
                  <button onClick={() => void convert(pitch)} disabled={converting !== null || Boolean(pitch.converted_at)} className="mt-2 inline-flex min-h-9 w-full items-center justify-center rounded-lg bg-teal px-3 text-xs font-bold text-white hover:bg-teal-600 disabled:opacity-40">
                    {converting === pitch.id ? "Creating client..." : "Won them? Create client"}
                  </button>
                )}
                {live ? <button onClick={() => void revoke(pitch)} className="mt-2 block text-[11px] font-semibold text-zinc-500 hover:text-red-600">Withdraw link</button> : <p className="mt-2 text-[11px] text-zinc-400">{pitch.revoked_at ? "Withdrawn" : "Expired"}</p>}
              </div>
            )
          })}
        </aside>
      </div>
    </div>
  )
}
