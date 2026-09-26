"use client"

import Link from "next/link"
import type { ClientException, LinkedInStatus } from "@/lib/agency/health"
import { CadenceMeter, LinkedInBadge, StreakBadge, relativeTime, type ClientCadence } from "@/components/agency/agency-ui"

export type ControlRoomClient = {
  id: string
  name: string
  brandingColor: string | null
  cadence: ClientCadence
  linkedIn: LinkedInStatus
  pendingApprovals: number
  failedPosts: number
  unusedVoiceDrops: number
  nextScheduledAt: string | null
  exceptions: ClientException[]
  health: "healthy" | "critical" | "warning" | "info"
}

export type ControlRoomData = {
  clients: ControlRoomClient[]
  exceptions: ClientException[]
  totals: { clients: number; healthy: number; shippedThisWeek: number; pendingApprovals: number; longestStreak: number }
}

const SEVERITY = {
  critical: { dot: "bg-red-500", text: "text-red-700", label: "Urgent" },
  warning: { dot: "bg-amber-500", text: "text-amber-800", label: "Soon" },
  info: { dot: "bg-teal", text: "text-teal-800", label: "Opportunity" },
}

const ACTION_FOR: Record<ClientException["code"], { label: string; tab?: "link" | "rules" | "drops" | "proof"; href?: (id: string) => string }> = {
  linkedin_expired: { label: "Send connect link", tab: "link" },
  linkedin_missing: { label: "Send connect link", tab: "link" },
  linkedin_expiring: { label: "Send connect link", tab: "link" },
  posts_failed: { label: "Open desk", href: () => "/desk" },
  scheduled_at_risk: { label: "Send connect link", tab: "link" },
  approval_stale: { label: "View approvals", href: (id) => `/approvals?client=${id}` },
  cadence_behind: { label: "Write a post", href: (id) => `/writer?compose=new&client=${id}` },
  voice_drops_waiting: { label: "Open desk", href: () => "/desk" },
}

export function ControlRoom({ data, loading, onOpenTab }: { data: ControlRoomData | null; loading: boolean; onOpenTab: (clientId: string, tab: "link" | "rules" | "drops" | "proof") => void }) {
  if (loading) return <div className="mb-6 h-56 animate-pulse rounded-2xl bg-zinc-100" />
  if (!data || !data.clients.length) return null
  const attention = data.exceptions.filter((item) => item.severity !== "info")
  const opportunities = data.exceptions.filter((item) => item.severity === "info")

  return (
    <section className="mb-8" aria-labelledby="control-room-title">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="control-room-title" className="text-lg font-bold text-zinc-900">Control Room</h2>
          <p className="text-xs text-zinc-500">Healthy clients stay quiet. Anything that needs you rises to the top.</p>
        </div>
        <p className="text-xs font-semibold text-zinc-600">
          <span className="text-emerald-700">{data.totals.healthy} of {data.totals.clients}</span> clients healthy
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          ["Posts shipped this week", data.totals.shippedThisWeek],
          ["Waiting on client approval", data.totals.pendingApprovals],
          ["Longest streak", `${data.totals.longestStreak} week${data.totals.longestStreak === 1 ? "" : "s"}`],
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-xl border border-zinc-200 bg-white px-4 py-3">
            <p className="text-xs font-medium text-zinc-500">{label}</p>
            <p className="mt-1 text-2xl font-bold text-zinc-900">{value}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-2xl border border-zinc-200 bg-white">
        {attention.length ? (
          <ul className="divide-y divide-zinc-100">
            {attention.map((item, index) => {
              const action = ACTION_FOR[item.code]
              const meta = SEVERITY[item.severity]
              return (
                <li key={`${item.workspaceId}-${item.code}-${index}`} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${meta.dot}`} aria-hidden="true" />
                    <div className="min-w-0">
                      <p className="text-sm text-zinc-800"><span className="font-bold text-zinc-900">{item.clientName}</span> <span className={`ml-1 t-eyebrow ${meta.text}`}>{meta.label}</span></p>
                      <p className="text-sm text-zinc-600">{item.message}</p>
                    </div>
                  </div>
                  {action.tab ? (
                    <button onClick={() => onOpenTab(item.workspaceId, action.tab!)} className="rounded-lg bg-zinc-900 px-3 py-2 text-xs font-semibold text-white hover:bg-zinc-800">{action.label}</button>
                  ) : action.href ? (
                    <Link href={action.href(item.workspaceId)} className="rounded-lg border border-zinc-200 px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50">{action.label}</Link>
                  ) : null}
                </li>
              )
            })}
          </ul>
        ) : (
          <div className="flex items-center gap-3 px-4 py-4">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} aria-hidden="true"><path d="M5 13l4 4L19 7" /></svg>
            </span>
            <p className="text-sm font-semibold text-zinc-800">Nothing needs you right now. Every client is connected, on cadence, and moving.</p>
          </div>
        )}
        {opportunities.length ? (
          <div className="border-t border-zinc-100 bg-zinc-50/60 px-4 py-3 text-xs text-zinc-600">
            {opportunities.map((item) => `${item.clientName}: ${item.message}`).join("  ·  ")}
          </div>
        ) : null}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {data.clients.map((client) => (
          <div key={client.id} className={`rounded-xl border bg-white p-4 ${client.health === "critical" ? "border-red-200" : client.health === "warning" ? "border-amber-200" : "border-zinc-200"}`}>
            <div className="flex items-center justify-between gap-2">
              <p className="flex min-w-0 items-center gap-2 text-sm font-bold text-zinc-900">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-teal" style={client.brandingColor ? { backgroundColor: client.brandingColor } : undefined} />
                <span className="truncate">{client.name}</span>
              </p>
              <StreakBadge cadence={client.cadence} />
            </div>
            <div className="mt-3"><CadenceMeter cadence={client.cadence} color={client.brandingColor} /></div>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-zinc-500">
              <LinkedInBadge status={client.linkedIn} />
              {client.pendingApprovals ? <span>{client.pendingApprovals} awaiting approval</span> : null}
              {client.nextScheduledAt ? <span>Next post {relativeTime(client.nextScheduledAt)}</span> : null}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
