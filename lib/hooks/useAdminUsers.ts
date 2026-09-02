"use client"

import { useCallback, useMemo, useState } from "react"
import type {
  AdminUser,
  AuditLogEntry as AuditRow,
  AdminStats as Stats,
  CircuitState,
  CronRunHealth,
  RecentUser,
} from "@/types/admin"
import { addBillingCycleIso } from "@/lib/plan-expiry"

const FEATURES = [
  ["scheduling", "Scheduling"],
  ["voiceProfiles", "Voice Profiles"],
  ["analytics", "Analytics"],
  ["carouselBuilder", "Carousel Builder"],
  ["competitorResearch", "Competitor Research"],
  ["approvalWorkflow", "Approval Workflow"],
  ["exportPdf", "Export PDF"],
  ["whiteLabel", "White Label"],
] as const

export { FEATURES }

export const USAGE_FIELDS = [
  ["ai_drafts_used", "AI Drafts"],
  ["carousels_used", "Carousels"],
  ["hooks_used", "Hooks"],
  ["analyses_used", "Analyses"],
  ["competitor_runs_used", "Competitor Research"],
  ["comment_generations_used", "Comment Generator"],
] as const

export type UsageFieldKey = (typeof USAGE_FIELDS)[number][0]

export const emptyFlags = () =>
  Object.fromEntries(FEATURES.map(([key]) => [key, false])) as Record<string, boolean>

export interface AdminFormState {
  planOverride: string
  draftLimitOverride: string
  workspaceLimitOverride: string
  featureFlags: Record<string, boolean>
  notes: string
  expiresAt: string
  billingCycle: "monthly" | "quarterly" | "annual"
}

export function useAdminUsers(adminEmail: string) {
  const [query, setQuery] = useState("")
  const [adminKey, setAdminKey] = useState("")
  const [unlocked, setUnlocked] = useState(false)
  const [users, setUsers] = useState<AdminUser[]>([])
  const [auditLog, setAuditLog] = useState<AuditRow[]>([])
  const [selected, setSelected] = useState<AdminUser | null>(null)
  const [status, setStatus] = useState<{ text: string; type: "ok" | "err" } | null>(null)
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState<Stats | null>(null)
  const [circuits, setCircuits] = useState<CircuitState | null>(null)
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([])
  const [cronRuns, setCronRuns] = useState<CronRunHealth[]>([])
  const [selfId, setSelfId] = useState<string | null>(null)
  const [resettingCircuits, setResettingCircuits] = useState(false)
  const [deletingUser, setDeletingUser] = useState(false)
  const [resettingUsage, setResettingUsage] = useState(false)

  const [form, setForm] = useState<AdminFormState>({
    planOverride: "",
    draftLimitOverride: "",
    workspaceLimitOverride: "",
    featureFlags: emptyFlags(),
    notes: "",
    expiresAt: "",
    billingCycle: "monthly",
  })

  const headers = useMemo(() => ({ "x-admin-key": adminKey }), [adminKey])

  const load = useCallback(async (q = query) => {
    if (!adminKey.trim()) throw new Error("Admin key required")
    setLoading(true)
    const [usersRes, statsRes] = await Promise.all([
      fetch(`/api/admin/users?q=${encodeURIComponent(q)}`, { headers: { "x-admin-key": adminKey } }),
      fetch("/api/admin/stats", { headers: { "x-admin-key": adminKey } }),
    ])
    const usersData = await usersRes.json().catch(() => ({})) as { users?: AdminUser[]; auditLog?: AuditRow[]; error?: string }
    const statsData = await statsRes.json().catch(() => ({})) as { stats?: Stats; recentUsers?: RecentUser[]; circuits?: CircuitState; cronRuns?: CronRunHealth[]; selfId?: string; error?: string }
    if (!usersRes.ok) throw new Error(usersData.error || "Admin data unavailable")
    const nextUsers = usersData.users || []
    setUsers(nextUsers)
    setAuditLog(usersData.auditLog || [])
    if (statsData.stats) setStats(statsData.stats)
    if (statsData.circuits) setCircuits(statsData.circuits)
    if (statsData.recentUsers) setRecentUsers(statsData.recentUsers)
    if (statsData.cronRuns) setCronRuns(statsData.cronRuns)
    if (statsData.selfId) setSelfId(statsData.selfId)
    setLoading(false)
    return nextUsers
  }, [adminKey, query])

  const setMsg = (text: string, type: "ok" | "err" = "ok") => {
    setStatus({ text, type })
    if (type === "ok") setTimeout(() => setStatus(null), 4000)
  }

  const unlock = async () => {
    setStatus({ text: "Checking admin key...", type: "ok" })
    try {
      await load("")
      setUnlocked(true)
      setStatus(null)
    } catch (error) {
      setUnlocked(false)
      setStatus({ text: (error as Error).message, type: "err" })
      setLoading(false)
    }
  }

  const selectUser = (user: AdminUser) => {
    setSelected(user)
    const flags = { ...emptyFlags(), ...(user.override?.feature_flags || {}) }
    setForm({
      planOverride: user.override?.plan_override || "",
      draftLimitOverride: user.override?.draft_limit_override == null ? "" : String(user.override.draft_limit_override),
      workspaceLimitOverride: user.override?.workspace_limit_override == null ? "" : String(user.override.workspace_limit_override),
      featureFlags: flags,
      notes: user.override?.notes || "",
      expiresAt: user.override?.expires_at ? user.override.expires_at.slice(0, 10) : "",
      billingCycle: user.billingCycle === "quarterly" || user.billingCycle === "annual" ? user.billingCycle : "monthly",
    })
  }

  const mutate = async (method: "POST" | "PATCH" | "DELETE") => {
    if (!selected) return
    setMsg(method === "DELETE" ? "Deleting..." : method === "PATCH" ? "Resetting..." : "Applying...")
    const body = method === "POST"
      ? {
          userId: selected.id,
          targetEmail: selected.email,
          planOverride: form.planOverride || null,
          draftLimitOverride: form.draftLimitOverride === "" ? null : Number(form.draftLimitOverride),
          workspaceLimitOverride: form.workspaceLimitOverride === "" ? null : Number(form.workspaceLimitOverride),
          featureFlags: form.featureFlags,
          notes: form.notes || null,
          expiresAt: form.expiresAt || null,
          billingCycle: form.billingCycle,
        }
      : { userId: selected.id, targetEmail: selected.email }
    const res = await fetch("/api/admin/overrides", {
      method,
      headers: { "Content-Type": "application/json", "x-admin-key": adminKey },
      body: JSON.stringify(body),
    })
    const data = await res.json().catch(() => ({})) as { error?: string }
    if (!res.ok) { setMsg(data.error || "Override update failed", "err"); return }
    await load(query)
    setMsg(method === "DELETE" ? "Override deleted" : method === "PATCH" ? "Override reset" : "Override applied")
  }

  const giveSelfPro = async () => {
    if (!adminKey.trim()) { setMsg("Enter your admin key first", "err"); return }
    setMsg("Giving you Pro...")
    // Set expires_at to 1 year from now for a clear, stable override.
    // Route resolves userId from email so selfId is not strictly required.
    const oneYearLater = addBillingCycleIso("annual")
    const res = await fetch("/api/admin/overrides", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-key": adminKey },
      body: JSON.stringify({
        userId: selfId || "",
        targetEmail: adminEmail,
        planOverride: "Pro",
        draftLimitOverride: null,
        workspaceLimitOverride: null,
        featureFlags: Object.fromEntries(FEATURES.map(([k]) => [k, true])),
        notes: "Admin self-assign",
        expiresAt: oneYearLater,
        billingCycle: "annual",
      }),
    })
    if (res.ok) {
      await load(query).catch(() => undefined)
      setMsg("You now have Pro with all features. Reload the app to see the updated plan.")
    } else {
      const d = await res.json().catch(() => ({})) as { error?: string }
      setMsg(d.error || "Failed", "err")
    }
  }

  const deleteUser = async () => {
    if (!selected) return
    if (selected.email.toLowerCase() === adminEmail.toLowerCase()) {
      setMsg("You cannot delete your own account from here", "err")
      return
    }
    setDeletingUser(true)
    setMsg("Deleting user...")
    const res = await fetch(`/api/admin/users/${selected.id}`, {
      method: "DELETE",
      headers: { "x-admin-key": adminKey },
    })
    const data = await res.json().catch(() => ({})) as { error?: string }
    setDeletingUser(false)
    if (!res.ok) {
      setMsg(data.error || "Failed to delete user", "err")
      return
    }
    setSelected(null)
    await load(query)
    setMsg("User deleted")
  }

  const resetUsage = async (fields?: UsageFieldKey[]) => {
    if (!selected) return
    setResettingUsage(true)
    setMsg(fields ? "Resetting usage..." : "Resetting all usage...")
    const res = await fetch("/api/admin/usage/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-key": adminKey },
      body: JSON.stringify({ userId: selected.id, targetEmail: selected.email, fields }),
    })
    const data = await res.json().catch(() => ({})) as { error?: string }
    setResettingUsage(false)
    if (!res.ok) { setMsg(data.error || "Usage reset failed", "err"); return }
    const selectedId = selected.id
    const nextUsers = await load(query)
    const refreshed = nextUsers.find((u) => u.id === selectedId)
    if (refreshed) setSelected(refreshed)
    setMsg(fields ? "Usage reset" : "All usage reset to zero")
  }

  const resetCircuits = async () => {
    setResettingCircuits(true)
    const res = await fetch("/api/admin/reset-circuits", {
      method: "POST",
      headers: { "x-admin-key": adminKey },
    })
    const d = await res.json().catch(() => ({})) as { message?: string; error?: string }
    setMsg(d.message || d.error || "Done")
    const statsRes = await fetch("/api/admin/stats", { headers: { "x-admin-key": adminKey } })
    const sd = await statsRes.json().catch(() => ({})) as { circuits?: CircuitState }
    if (sd.circuits) setCircuits(sd.circuits)
    setResettingCircuits(false)
  }

  const activeOverride = useMemo(() => Boolean(selected?.override), [selected])

  return {
    query, setQuery,
    adminKey, setAdminKey,
    unlocked,
    users, auditLog,
    selected,
    status,
    loading,
    stats, circuits, recentUsers, cronRuns,
    resettingCircuits,
    form, setForm,
    headers,
    activeOverride,
    load,
    unlock,
    selectUser,
    setMsg,
    mutate,
    giveSelfPro,
    resetCircuits,
    deleteUser,
    deletingUser,
    resetUsage,
    resettingUsage,
    FEATURES,
    USAGE_FIELDS,
  }
}
