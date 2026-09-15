"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import type { LinkedInStatus } from "@/lib/agency/health"
import { AUTO_APPROVE_HOUR_OPTIONS, describeAutoApproveHours } from "@/lib/agency/approval-timing"
import { LinkedInBadge, OneTimeLink, fetchJson, formatDateTime, friendlyError, relativeTime } from "@/components/agency/agency-ui"

export type OpsTab = "link" | "rules" | "drops" | "proof"

const TABS: { id: OpsTab; label: string }[] = [
  { id: "link", label: "LinkedIn connect" },
  { id: "rules", label: "Operating rules" },
  { id: "drops", label: "Voice Drop" },
  { id: "proof", label: "Proof report" },
]

export function ClientOpsPanel({ workspaceId, workspaceName, canManage, initialTab = "link", onChanged }: { workspaceId: string; workspaceName: string; canManage: boolean; initialTab?: OpsTab; onChanged?: () => void }) {
  const [tab, setTab] = useState<OpsTab>(canManage ? initialTab : "drops")
  const tabs = canManage ? TABS : TABS.filter((item) => item.id === "drops")
  return (
    <div className="rounded-xl border border-zinc-200 bg-zinc-50/50">
      <div role="tablist" aria-label={`${workspaceName} operations`} className="flex gap-1 overflow-x-auto border-b border-zinc-200 px-2 pt-2">
        {tabs.map((item) => (
          <button
            key={item.id}
            role="tab"
            aria-selected={tab === item.id}
            onClick={() => setTab(item.id)}
            className={`shrink-0 rounded-t-lg px-3 py-2 text-xs font-semibold ${tab === item.id ? "border border-b-0 border-zinc-200 bg-white text-zinc-900" : "text-zinc-500 hover:text-zinc-800"}`}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="p-4" role="tabpanel">
        {tab === "link" ? <HandoffTab workspaceId={workspaceId} onChanged={onChanged} /> : null}
        {tab === "rules" ? <RulesTab workspaceId={workspaceId} onChanged={onChanged} /> : null}
        {tab === "drops" ? <DropsTab workspaceId={workspaceId} /> : null}
        {tab === "proof" ? <ProofTab workspaceId={workspaceId} /> : null}
      </div>
    </div>
  )
}

type HandoffLink = { id: string; recipient_name: string | null; recipient_email: string | null; source: "manual" | "guardian"; created_at: string; expires_at: string; status: "ready" | "used" | "expired" | "revoked" }

function HandoffTab({ workspaceId, onChanged }: { workspaceId: string; onChanged?: () => void }) {
  const [links, setLinks] = useState<HandoffLink[]>([])
  const [linkedIn, setLinkedIn] = useState<LinkedInStatus | null>(null)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [created, setCreated] = useState<{ url: string; emailed: boolean } | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const data = await fetchJson<{ links: HandoffLink[]; linkedIn: LinkedInStatus; defaultRecipient: { name: string | null; email: string | null } }>(`/api/workspaces/${workspaceId}/handoff`)
      setLinks(data.links)
      setLinkedIn(data.linkedIn)
      setName((current) => current || data.defaultRecipient.name || "")
      setEmail((current) => current || data.defaultRecipient.email || "")
    } catch (caught) {
      setError(friendlyError((caught as Error).message))
    }
  }, [workspaceId])

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0)
    return () => window.clearTimeout(timer)
  }, [load])

  const create = async (sendEmail: boolean) => {
    setBusy(true)
    setError(null)
    try {
      const data = await fetchJson<{ link: HandoffLink; url: string; emailed: boolean }>(`/api/workspaces/${workspaceId}/handoff`, {
        method: "POST",
        body: JSON.stringify({ recipientName: name, recipientEmail: email, sendEmail }),
      })
      setCreated({ url: data.url, emailed: data.emailed })
      setLinks((current) => [data.link, ...current])
      if (sendEmail && !data.emailed) setError("The link was created but the email could not be sent. Copy the link and share it directly.")
      onChanged?.()
    } catch (caught) {
      setError(friendlyError((caught as Error).message))
    } finally {
      setBusy(false)
    }
  }

  const revoke = async (link: HandoffLink) => {
    try {
      await fetchJson(`/api/workspaces/${workspaceId}/handoff?linkId=${link.id}`, { method: "DELETE" })
      setLinks((current) => current.map((item) => item.id === link.id ? { ...item, status: "revoked" } : item))
    } catch (caught) {
      setError(friendlyError((caught as Error).message))
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="max-w-lg text-sm leading-6 text-zinc-600">The client approves LinkedIn access on LinkedIn&apos;s own page. Nobody asks for a password, and nobody needs a Qalam account.</p>
        {linkedIn ? <LinkedInBadge status={linkedIn} /> : null}
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <input value={name} onChange={(event) => setName(event.target.value)} maxLength={100} placeholder="Client name" aria-label="Client name" className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-teal focus:ring-4 focus:ring-teal/10" />
        <input value={email} onChange={(event) => setEmail(event.target.value)} maxLength={254} type="email" placeholder="client@company.com" aria-label="Client email" className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-teal focus:ring-4 focus:ring-teal/10" />
      </div>
      <div className="flex flex-wrap gap-2">
        <button disabled={busy || !email} onClick={() => void create(true)} className="rounded-lg bg-teal px-3 py-2 text-xs font-bold text-white hover:bg-teal-600 disabled:opacity-40">{busy ? "Creating..." : "Email the connect link"}</button>
        <button disabled={busy} onClick={() => void create(false)} className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-40">Create link to share myself</button>
      </div>

      {created ? <OneTimeLink url={created.url} note={created.emailed ? "Emailed. You can also send this link over WhatsApp. It is shown only once and works for a single connection within 7 days." : "Copy this now. It is shown only once and works for a single connection within 7 days."} /> : null}
      {error ? <p className="text-xs font-medium text-red-600" role="alert">{error}</p> : null}

      {links.length ? (
        <ul className="divide-y divide-zinc-100 rounded-lg border border-zinc-200 bg-white text-xs">
          {links.slice(0, 6).map((link) => (
            <li key={link.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
              <span className="text-zinc-700">
                {link.recipient_name || link.recipient_email || "Shared link"}{link.source === "guardian" ? " (automatic reconnect)" : ""}
                <span className="ml-2 text-zinc-400">{relativeTime(link.created_at)}</span>
              </span>
              <span className="flex items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 font-semibold ${link.status === "used" ? "bg-emerald-50 text-emerald-700" : link.status === "ready" ? "bg-teal-50 text-teal-800" : "bg-zinc-100 text-zinc-500"}`}>{link.status === "ready" ? "Waiting" : link.status === "used" ? "Connected" : link.status === "expired" ? "Expired" : "Withdrawn"}</span>
                {link.status === "ready" ? <button onClick={() => void revoke(link)} className="font-semibold text-zinc-500 hover:text-red-600">Withdraw</button> : null}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

type Settings = { cadencePostsPerWeek: number; autoApproveHours: number | null; voiceDropEnabled: boolean; clientContactName: string | null; clientContactEmail: string | null }

function RulesTab({ workspaceId, onChanged }: { workspaceId: string; onChanged?: () => void }) {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [saving, setSaving] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetchJson<{ settings: Settings }>(`/api/workspaces/${workspaceId}/client-settings`)
      .then((data) => setSettings(data.settings))
      .catch((caught) => setError(friendlyError((caught as Error).message)))
  }, [workspaceId])

  const save = async (patch: Partial<Settings>, field: string) => {
    setSaving(field)
    setError(null)
    setSaved(false)
    try {
      const data = await fetchJson<{ settings: Settings }>(`/api/workspaces/${workspaceId}/client-settings`, { method: "PATCH", body: JSON.stringify(patch) })
      setSettings(data.settings)
      setSaved(true)
      onChanged?.()
    } catch (caught) {
      setError(friendlyError((caught as Error).message))
    } finally {
      setSaving(null)
    }
  }

  if (!settings) return error ? <p className="text-xs text-red-600">{error}</p> : <div className="h-32 animate-pulse rounded-lg bg-zinc-100" />

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-semibold text-zinc-900">Weekly posting target</p>
        <p className="text-xs text-zinc-500">Drives the cadence meter, streaks, and Friday Wrap.</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {[1, 2, 3, 4, 5, 7].map((count) => (
            <button key={count} disabled={saving !== null} onClick={() => void save({ cadencePostsPerWeek: count }, "cadence")} aria-pressed={settings.cadencePostsPerWeek === count} className={`min-w-10 rounded-lg border px-3 py-2 text-xs font-bold ${settings.cadencePostsPerWeek === count ? "border-teal bg-teal text-white" : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"}`}>
              {count}
            </button>
          ))}
          <span className="self-center text-xs text-zinc-500">posts per week</span>
        </div>
      </div>

      <div>
        <p className="text-sm font-semibold text-zinc-900">Silence means approved</p>
        <p className="text-xs text-zinc-500">Only turn this on after the client agrees. They always get a heads-up two hours before a draft is treated as approved.</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <button disabled={saving !== null} onClick={() => void save({ autoApproveHours: null }, "auto")} aria-pressed={settings.autoApproveHours === null} className={`rounded-lg border px-3 py-2 text-xs font-bold ${settings.autoApproveHours === null ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"}`}>Off</button>
          {AUTO_APPROVE_HOUR_OPTIONS.map((hours) => (
            <button key={hours} disabled={saving !== null} onClick={() => void save({ autoApproveHours: hours }, "auto")} aria-pressed={settings.autoApproveHours === hours} className={`rounded-lg border px-3 py-2 text-xs font-bold ${settings.autoApproveHours === hours ? "border-teal bg-teal text-white" : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"}`}>
              After {describeAutoApproveHours(hours)}
            </button>
          ))}
        </div>
        <p className="mt-1.5 text-[11px] text-zinc-500">Applies to approval requests sent from now on.</p>
      </div>

      <div>
        <p className="text-sm font-semibold text-zinc-900">Monday Voice Drop</p>
        <p className="text-xs text-zinc-500">Every Monday the client gets one question by email and answers by typing or recording a voice note.</p>
        <label className={`mt-2 inline-flex items-center gap-2 text-sm ${settings.clientContactEmail ? "text-zinc-800" : "text-zinc-400"}`}>
          <input
            type="checkbox"
            checked={settings.voiceDropEnabled}
            disabled={saving !== null || !settings.clientContactEmail}
            onChange={(event) => void save({ voiceDropEnabled: event.target.checked }, "drop")}
            className="h-4 w-4 rounded border-zinc-300 accent-teal"
          />
          {settings.clientContactEmail ? `Send weekly to ${settings.clientContactEmail}` : "Add a client contact email in Client details first"}
        </label>
      </div>

      <div className="flex items-center gap-3 text-xs" aria-live="polite">
        {saving ? <span className="text-zinc-500">Saving...</span> : saved ? <span className="font-semibold text-emerald-700">Saved</span> : null}
        {error ? <span className="font-medium text-red-600">{error}</span> : null}
        <Link href={`/passport?client=${workspaceId}`} className="ml-auto font-semibold text-teal-700 hover:underline">Edit Voice Passport</Link>
      </div>
    </div>
  )
}

type Drop = { id: string; question: string; answer: string | null; answered_at: string | null; created_at: string; source: "manual" | "weekly"; status: "waiting" | "answered" | "used" | "dismissed" | "expired" }

function DropsTab({ workspaceId }: { workspaceId: string }) {
  const [drops, setDrops] = useState<Drop[]>([])
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [hasEmail, setHasEmail] = useState(true)
  const [question, setQuestion] = useState("")
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    fetchJson<{ drops: Drop[]; suggestions: string[]; hasClientContactEmail: boolean }>(`/api/workspaces/${workspaceId}/voice-drops`)
      .then((data) => {
        setDrops(data.drops)
        setSuggestions(data.suggestions)
        setHasEmail(data.hasClientContactEmail)
      })
      .catch((caught) => setMessage({ tone: "error", text: friendlyError((caught as Error).message) }))
      .finally(() => setLoaded(true))
  }, [workspaceId])

  const send = async () => {
    setBusy(true)
    setMessage(null)
    try {
      const data = await fetchJson<{ drop: Drop; emailed: boolean }>(`/api/workspaces/${workspaceId}/voice-drops`, { method: "POST", body: JSON.stringify({ question }) })
      setDrops((current) => [data.drop, ...current])
      setQuestion("")
      setMessage(data.emailed ? { tone: "ok", text: "Sent. Their answer will appear on My Desk." } : { tone: "error", text: "Saved, but the email could not be sent. Check email configuration." })
    } catch (caught) {
      setMessage({ tone: "error", text: friendlyError((caught as Error).message) })
    } finally {
      setBusy(false)
    }
  }

  if (!loaded) return <div className="h-32 animate-pulse rounded-lg bg-zinc-100" />

  return (
    <div className="space-y-4">
      <p className="text-sm leading-6 text-zinc-600">Ask the client one good question. Their real answer becomes material a writer can turn into a post that could only have come from them.</p>
      {!hasEmail ? <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">Add a client contact email in Client details to send Voice Drops.</p> : null}
      <div className="space-y-2">
        <textarea value={question} onChange={(event) => setQuestion(event.target.value)} maxLength={300} rows={2} placeholder="What did a customer teach you this month?" aria-label="Question for the client" className="w-full resize-none rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-teal focus:ring-4 focus:ring-teal/10" />
        <div className="flex flex-wrap gap-1.5">
          {suggestions.slice(0, 4).map((suggestion) => (
            <button key={suggestion} onClick={() => setQuestion(suggestion)} className="rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-left text-[11px] text-zinc-600 hover:bg-zinc-50">{suggestion}</button>
          ))}
        </div>
        <button disabled={busy || !hasEmail || question.trim().length < 5} onClick={() => void send()} className="rounded-lg bg-teal px-3 py-2 text-xs font-bold text-white hover:bg-teal-600 disabled:opacity-40">{busy ? "Sending..." : "Send to client"}</button>
        {message ? <p className={`text-xs font-medium ${message.tone === "ok" ? "text-emerald-700" : "text-red-600"}`} role="status">{message.text}</p> : null}
      </div>
      {drops.length ? (
        <ul className="space-y-2">
          {drops.slice(0, 8).map((drop) => (
            <li key={drop.id} className="rounded-lg border border-zinc-200 bg-white px-3 py-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-zinc-800">{drop.question}</p>
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${drop.status === "answered" ? "bg-teal-50 text-teal-800" : drop.status === "used" ? "bg-emerald-50 text-emerald-700" : "bg-zinc-100 text-zinc-500"}`}>
                  {{ waiting: "Waiting", answered: "Answered", used: "Drafted", dismissed: "Dismissed", expired: "Expired" }[drop.status]}
                </span>
              </div>
              {drop.answer ? <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-xs leading-5 text-zinc-600">{drop.answer}</p> : <p className="mt-1 text-[11px] text-zinc-400">{drop.source === "weekly" ? "Monday question" : "Sent"} {relativeTime(drop.created_at)}</p>}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

type ProofPreview = {
  periodStart: string
  periodEnd: string
  totals: { postsPublished: number; postsWithMetrics: number; impressions: number; reactions: number; comments: number; reposts: number }
  weeksInPeriod: number
  weeksOnTarget: number
  streakWeeks: number
  approvals: { decided: number; medianHoursToDecision: number | null }
}
type ProofReport = { id: string; period_start: string; period_end: string; created_at: string; expires_at: string; revoked_at: string | null; view_count: number; last_viewed_at: string | null }

function ProofTab({ workspaceId }: { workspaceId: string }) {
  const [days, setDays] = useState<7 | 30 | 90>(30)
  const [now] = useState(() => Date.now())
  const [preview, setPreview] = useState<ProofPreview | null>(null)
  const [reports, setReports] = useState<ProofReport[]>([])
  const [created, setCreated] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchJson<{ reports: ProofReport[] }>(`/api/workspaces/${workspaceId}/proof`).then((data) => setReports(data.reports)).catch(() => undefined)
  }, [workspaceId])

  useEffect(() => {
    let active = true
    fetchJson<{ preview: ProofPreview }>(`/api/workspaces/${workspaceId}/proof?preview=${days}`)
      .then((data) => { if (active) { setPreview(data.preview); setError(null) } })
      .catch((caught) => { if (active) setError(friendlyError((caught as Error).message)) })
    return () => { active = false }
  }, [workspaceId, days])

  const create = async () => {
    setBusy(true)
    setError(null)
    try {
      const data = await fetchJson<{ report: ProofReport; url: string }>(`/api/workspaces/${workspaceId}/proof`, { method: "POST", body: JSON.stringify({ days }) })
      setCreated(data.url)
      setReports((current) => [data.report, ...current])
    } catch (caught) {
      setError(friendlyError((caught as Error).message))
    } finally {
      setBusy(false)
    }
  }

  const revoke = async (report: ProofReport) => {
    try {
      await fetchJson(`/api/workspaces/${workspaceId}/proof?reportId=${report.id}`, { method: "DELETE" })
      setReports((current) => current.map((item) => item.id === report.id ? { ...item, revoked_at: new Date().toISOString() } : item))
    } catch (caught) {
      setError(friendlyError((caught as Error).message))
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm leading-6 text-zinc-600">A clean, private page for the client showing what shipped and how it performed. It uses only posts published through Qalam and LinkedIn metrics that were actually synced.</p>
      <div className="flex flex-wrap gap-1.5">
        {([7, 30, 90] as const).map((option) => (
          <button key={option} onClick={() => setDays(option)} aria-pressed={days === option} className={`rounded-lg border px-3 py-2 text-xs font-bold ${days === option ? "border-teal bg-teal text-white" : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"}`}>Last {option} days</button>
        ))}
      </div>
      {preview ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            ["Posts published", preview.totals.postsPublished],
            ["Impressions", preview.totals.postsWithMetrics ? preview.totals.impressions.toLocaleString() : "Not synced"],
            ["Weeks on target", `${preview.weeksOnTarget}/${preview.weeksInPeriod}`],
            ["Median approval", preview.approvals.medianHoursToDecision === null ? "None yet" : `${preview.approvals.medianHoursToDecision} h`],
          ].map(([label, value]) => (
            <div key={String(label)} className="rounded-lg border border-zinc-200 bg-white px-3 py-2">
              <p className="text-[11px] text-zinc-500">{label}</p>
              <p className="text-base font-bold text-zinc-900">{value}</p>
            </div>
          ))}
        </div>
      ) : <div className="h-16 animate-pulse rounded-lg bg-zinc-100" />}
      {preview && !preview.totals.postsPublished ? <p className="text-xs text-amber-800">No posts were published through Qalam in this period, so the report will be mostly empty.</p> : null}
      <button disabled={busy || !preview} onClick={() => void create()} className="rounded-lg bg-zinc-900 px-3 py-2 text-xs font-bold text-white hover:bg-zinc-800 disabled:opacity-40">{busy ? "Creating..." : "Create shareable report"}</button>
      {created ? <OneTimeLink url={created} note="Copy this now. The link is shown only once and stays live for 90 days unless you withdraw it." /> : null}
      {error ? <p className="text-xs font-medium text-red-600" role="alert">{error}</p> : null}
      {reports.length ? (
        <ul className="divide-y divide-zinc-100 rounded-lg border border-zinc-200 bg-white text-xs">
          {reports.slice(0, 6).map((report) => {
            const live = !report.revoked_at && Date.parse(report.expires_at) > now
            return (
              <li key={report.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                <span className="text-zinc-700">
                  {new Date(report.period_start).toLocaleDateString("en-US", { month: "short", day: "numeric" })} to {new Date(report.period_end).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  <span className="ml-2 text-zinc-400">{report.view_count ? `Viewed ${report.view_count} time${report.view_count === 1 ? "" : "s"}, last ${formatDateTime(report.last_viewed_at)}` : "Not viewed yet"}</span>
                </span>
                {live ? <button onClick={() => void revoke(report)} className="font-semibold text-zinc-500 hover:text-red-600">Withdraw</button> : <span className="text-zinc-400">{report.revoked_at ? "Withdrawn" : "Expired"}</span>}
              </li>
            )
          })}
        </ul>
      ) : null}
    </div>
  )
}
