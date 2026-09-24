"use client"

import { useState } from "react"
import type { LinkedInStatus } from "@/lib/agency/health"

export type ClientCadence = { target: number; publishedThisWeek: number; scheduledThisWeek: number; onTrack: boolean; streakWeeks: number }

const AGENCY_ERRORS: Record<string, string> = {
  forbidden: "Your role in this workspace cannot do that.",
  unauthorized_workspace: "You are not a member of this workspace.",
  upgrade_required: "This needs the Agency plan on the workspace owner's account.",
  client_workspace_required: "This only works in a client workspace.",
  workspace_archived: "This workspace is archived. Restore it first.",
  rate_limited: "Too many requests. Wait a little and try again.",
  recipient_email_required: "Add the client's email to send the link by email.",
  client_contact_email_required: "Add a client contact email in Client details first.",
  passport_full: "The Voice Passport is full. Remove an older rule first.",
  invalid_input: "Check the details and try again.",
  pitch_limit_reached: "You have reached this month's pitch limit.",
  draft_limit_reached: "Your monthly draft allowance is used up.",
  generation_failed: "The samples could not be generated. Try again in a moment.",
  pitch_already_converted: "This pitch is already a client workspace.",
  workspace_limit_reached: "You are at your client workspace limit. Archive a client or upgrade first.",
  auth_required: "Your session ended. Sign in again.",
  allocation_exceeds_pool: "That would exceed your account's shared pool. Lower another client's allocation first.",
  workspace_owner_missing: "This workspace has no owner on record. Contact support.",
}

export const friendlyError = (code: string | undefined, fallback = "Something went wrong. Try again.") =>
  (code && AGENCY_ERRORS[code]) || fallback

export async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { cache: "no-store", ...init, headers: { "Content-Type": "application/json", ...(init?.headers || {}) } })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error((data as { error?: string }).error || `http_${res.status}`)
  return data as T
}

export function relativeTime(iso: string | null | undefined, now = Date.now()): string {
  if (!iso) return ""
  const diff = Date.parse(iso) - now
  const abs = Math.abs(diff)
  const minutes = Math.round(abs / 60000)
  const hours = Math.round(abs / 3600000)
  const days = Math.round(abs / 86400000)
  const phrase = minutes < 60 ? `${Math.max(1, minutes)} min` : hours < 36 ? `${hours} h` : `${days} day${days === 1 ? "" : "s"}`
  return diff >= 0 ? `in ${phrase}` : `${phrase} ago`
}

export function formatDateTime(iso: string | null | undefined) {
  if (!iso) return ""
  return new Date(iso).toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
}

export function LinkedInBadge({ status }: { status: LinkedInStatus }) {
  const meta = {
    connected: { label: "LinkedIn connected", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    expiring: { label: `Expires in ${"daysLeft" in status ? status.daysLeft : 0}d`, cls: "bg-amber-50 text-amber-800 border-amber-200" },
    expired: { label: "LinkedIn expired", cls: "bg-red-50 text-red-700 border-red-200" },
    missing: { label: "LinkedIn not connected", cls: "bg-zinc-100 text-zinc-600 border-zinc-200" },
  }[status.state]
  return <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${meta.cls}`}>{meta.label}</span>
}

export function StreakBadge({ cadence }: { cadence: ClientCadence }) {
  const lit = cadence.streakWeeks > 0
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${lit ? "bg-gold-50 text-gold-700" : "bg-zinc-100 text-zinc-500"}`} title="Consecutive weeks that met the posting target">
      <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2c1.5 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2 .8-3.4 2-4.5.2 1.6 1 2.5 2 2.5-1-3 0-5.5 1-8Z" /></svg>
      {cadence.streakWeeks}-week streak
    </span>
  )
}

export function CadenceMeter({ cadence, color }: { cadence: ClientCadence; color?: string | null }) {
  const slots = Array.from({ length: Math.min(cadence.target, 14) }, (_, index) => {
    if (index < cadence.publishedThisWeek) return "published"
    if (index < cadence.publishedThisWeek + cadence.scheduledThisWeek) return "scheduled"
    return "empty"
  })
  return (
    <div className="flex items-center gap-2" aria-label={`${cadence.publishedThisWeek} of ${cadence.target} posts published this week, ${cadence.scheduledThisWeek} scheduled`}>
      <div className="flex flex-1 gap-1">
        {slots.map((slot, index) => (
          <span
            key={index}
            className={`h-2 flex-1 rounded-full ${slot === "published" ? "bg-teal" : slot === "scheduled" ? "bg-teal/30" : "bg-zinc-200"}`}
            style={slot === "published" && color ? { backgroundColor: color } : undefined}
          />
        ))}
      </div>
      <span className="shrink-0 text-xs font-semibold text-zinc-600">{cadence.publishedThisWeek}/{cadence.target}</span>
    </div>
  )
}

function CopyButton({ value, label = "Copy link", className = "" }: { value: string; label?: string; className?: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard?.writeText(value).then(() => {
          setCopied(true)
          window.setTimeout(() => setCopied(false), 2000)
        })
      }}
      className={`rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 ${className}`}
    >
      {copied ? "Copied" : label}
    </button>
  )
}

export function OneTimeLink({ url, note }: { url: string; note: string }) {
  return (
    <div className="rounded-xl border border-teal/20 bg-teal-50/60 p-3">
      <p className="text-xs font-semibold text-teal-900">{note}</p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <input readOnly value={url} onFocus={(event) => event.currentTarget.select()} className="min-w-0 flex-1 rounded-lg border border-zinc-200 bg-white px-3 py-2 font-mono text-[11px] text-zinc-700" aria-label="Private link" />
        <CopyButton value={url} />
      </div>
    </div>
  )
}