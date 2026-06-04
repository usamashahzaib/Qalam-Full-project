"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useWorkspace } from "@/components/providers/WorkspaceProvider"
import { getPlanLimits } from "@/lib/entitlements"

const usageMonth = () => new Date().toISOString().slice(0, 7)

export const getDraftUsageKey = (workspaceId: string, month = usageMonth()) => `qalam-draft-usage:${workspaceId}:${month}`

export const readDraftUsage = (workspaceId: string) => {
  if (typeof window === "undefined") return 0
  const raw = localStorage.getItem(getDraftUsageKey(workspaceId))
  const value = raw ? Number(raw) : 0
  return Number.isFinite(value) ? value : 0
}

export const incrementDraftUsage = (workspaceId: string) => {
  if (typeof window === "undefined") return 0
  const key = getDraftUsageKey(workspaceId)
  const next = readDraftUsage(workspaceId) + 1
  localStorage.setItem(key, String(next))
  window.dispatchEvent(new CustomEvent("qalam:draft-usage", { detail: { key, value: next } }))
  return next
}

export function DraftCounter({ className = "" }: { className?: string }) {
  const { billing, posts, workspaceId } = useWorkspace()
  const [localUsed, setLocalUsed] = useState(0)
  const [showUpgrade, setShowUpgrade] = useState(false)
  const limit = getPlanLimits(billing.plan).aiDraftsPerMonth
  const serverUsed = useMemo(() => {
    const month = usageMonth()
    return posts.filter((post) => String(post.updatedAt || "").startsWith(month)).length
  }, [posts])
  const used = Math.max(localUsed, serverUsed)
  const cappedUsed = typeof limit === "number" ? Math.min(used, limit) : used
  const remaining = typeof limit === "number" ? Math.max(0, limit - used) : null
  const pct = typeof limit === "number" && limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0
  const tone = pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-amber-400" : "bg-teal"

  useEffect(() => {
    setLocalUsed(readDraftUsage(workspaceId))
    const sync = () => setLocalUsed(readDraftUsage(workspaceId))
    const hit = () => setShowUpgrade(true)
    window.addEventListener("qalam:draft-usage", sync)
    window.addEventListener("qalam:draft-limit-hit", hit)
    return () => {
      window.removeEventListener("qalam:draft-usage", sync)
      window.removeEventListener("qalam:draft-limit-hit", hit)
    }
  }, [workspaceId])

  useEffect(() => {
    if (typeof limit === "number" && used >= limit) setShowUpgrade(true)
  }, [limit, used])

  if (limit === "unlimited") return null

  return (
    <>
      <div className={`rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm ${className}`}>
        <div className="mb-2 flex items-center justify-between gap-3">
          <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">Draft usage</p>
          <p className="text-xs font-semibold text-zinc-700">{cappedUsed} / {limit} drafts used</p>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-zinc-100">
          <div className={`h-full rounded-full transition-all ${tone}`} style={{ width: `${pct}%` }} />
        </div>
        {remaining !== null && remaining <= 2 ? (
          <p className={`mt-2 text-xs font-semibold ${remaining === 0 ? "text-red-600" : "text-amber-700"}`}>{remaining} left this month</p>
        ) : null}
      </div>

      {showUpgrade ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/45 px-4">
          <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-6 text-center shadow-xl">
            <h2 className="text-lg font-bold text-zinc-900">Draft limit reached</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-500">You used {cappedUsed} / {limit} AI drafts this month. Upgrade to keep generating.</p>
            <div className="mt-5 flex justify-center gap-2">
              <button onClick={() => setShowUpgrade(false)} className="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50">Close</button>
              <Link href="/settings" className="rounded-xl bg-teal px-4 py-2 text-sm font-bold text-white hover:bg-teal-600">Upgrade</Link>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
