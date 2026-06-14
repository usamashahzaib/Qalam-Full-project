"use client"

import { useCallback, useEffect, useMemo, useState } from "react"

import type {
  AdminOverride as Override,
  AdminUser,
  AuditLogEntry as AuditRow,
  AdminStats as Stats,
  CircuitState,
  RecentUser,
} from "@/types/admin"

const PLANS = ["Free", "Solo", "Pro", "Agency"]
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

const emptyFlags = () =>
  Object.fromEntries(FEATURES.map(([key]) => [key, false])) as Record<string, boolean>

const planColor: Record<string, string> = {
  Free: "bg-zinc-100 text-zinc-700",
  Solo: "bg-blue-50 text-blue-700 border border-blue-200",
  Pro: "bg-teal-50 text-teal-700 border border-teal-200",
  Agency: "bg-amber-50 text-amber-700 border border-amber-200",
}

const circuitColor = (state: unknown) => {
  const s = String(state || "")
  if (s === "closed" || s === "no-redis") return "bg-emerald-100 text-emerald-700"
  if (s === "open") return "bg-red-100 text-red-700"
  return "bg-zinc-100 text-zinc-600"
}

const fmt = (n: number) => n.toLocaleString()
const fmtDate = (iso: string) => {
  try {
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
  } catch {
    return "-"
  }
}

export function AdminDashboard({ adminEmail }: { adminEmail: string }) {
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
  const [selfId, setSelfId] = useState<string | null>(null)
  const [resettingCircuits, setResettingCircuits] = useState(false)

  const [form, setForm] = useState({
    planOverride: "",
    draftLimitOverride: "",
    workspaceLimitOverride: "",
    featureFlags: emptyFlags(),
    notes: "",
    expiresAt: "",
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
    const statsData = await statsRes.json().catch(() => ({})) as { stats?: Stats; recentUsers?: RecentUser[]; circuits?: CircuitState; selfId?: string; error?: string }
    if (!usersRes.ok) throw new Error(usersData.error || "Admin data unavailable")
    setUsers(usersData.users || [])
    setAuditLog(usersData.auditLog || [])
    if (statsData.stats) setStats(statsData.stats)
    if (statsData.circuits) setCircuits(statsData.circuits)
    if (statsData.recentUsers) setRecentUsers(statsData.recentUsers)
    if (statsData.selfId) setSelfId(statsData.selfId)
    setLoading(false)
  }, [adminKey, query])

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
      draftLimitOverride:
        user.override?.draft_limit_override == null ? "" : String(user.override.draft_limit_override),
      workspaceLimitOverride:
        user.override?.workspace_limit_override == null ? "" : String(user.override.workspace_limit_override),
      featureFlags: flags,
      notes: user.override?.notes || "",
      expiresAt: user.override?.expires_at ? user.override.expires_at.slice(0, 10) : "",
    })
  }

  const setMsg = (text: string, type: "ok" | "err" = "ok") => {
    setStatus({ text, type })
    if (type === "ok") setTimeout(() => setStatus(null), 4000)
  }

  const mutate = async (method: "POST" | "PATCH" | "DELETE") => {
    if (!selected) return
    setMsg(method === "DELETE" ? "Deleting..." : method === "PATCH" ? "Resetting..." : "Applying...")
    const body = method === "POST"
      ? {
          userId: selected.externalId,
          targetEmail: selected.email,
          planOverride: form.planOverride || null,
          draftLimitOverride: form.draftLimitOverride === "" ? null : Number(form.draftLimitOverride),
          workspaceLimitOverride: form.workspaceLimitOverride === "" ? null : Number(form.workspaceLimitOverride),
          featureFlags: form.featureFlags,
          notes: form.notes || null,
          expiresAt: form.expiresAt ? new Date(`${form.expiresAt}T23:59:59`).toISOString() : null,
        }
      : { userId: selected.externalId, targetEmail: selected.email }
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
    if (!selfId) { setMsg("Could not determine your user ID", "err"); return }
    setMsg("Giving you Pro...")
    const res = await fetch("/api/admin/overrides", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-key": adminKey },
      body: JSON.stringify({
        userId: selfId,
        targetEmail: adminEmail,
        planOverride: "Pro",
        draftLimitOverride: 9999,
        workspaceLimitOverride: null,
        featureFlags: Object.fromEntries(FEATURES.map(([k]) => [k, true])),
        notes: "Admin self-assign",
        expiresAt: null,
      }),
    })
    if (res.ok) {
      await load(query)
      setMsg("You now have Pro with all features unlocked")
    } else {
      const d = await res.json().catch(() => ({})) as { error?: string }
      setMsg(d.error || "Failed", "err")
    }
  }

  const resetCircuits = async () => {
    setResettingCircuits(true)
    const res = await fetch("/api/admin/reset-circuits", {
      method: "POST",
      headers: { "x-admin-key": adminKey },
    })
    const d = await res.json().catch(() => ({})) as { message?: string; error?: string }
    setMsg(d.message || d.error || "Done")
    // Refresh circuit status
    const statsRes = await fetch("/api/admin/stats", { headers: { "x-admin-key": adminKey } })
    const sd = await statsRes.json().catch(() => ({})) as { circuits?: CircuitState }
    if (sd.circuits) setCircuits(sd.circuits)
    setResettingCircuits(false)
  }

  const activeOverride = useMemo(() => Boolean(selected?.override), [selected])

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-8 font-jakarta text-zinc-900 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Qalam Admin</h1>
            <p className="mt-0.5 text-sm text-zinc-500">{adminEmail}</p>
          </div>
          <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-700 ring-1 ring-red-200">
            Admin access
          </span>
        </div>

        {/* Unlock form */}
        {!unlocked && (
          <section className="max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-bold text-zinc-900">Enter admin key to unlock</h2>
            <p className="mt-1 text-xs text-zinc-500">Set <code className="rounded bg-zinc-100 px-1">ADMIN_SECRET_KEY</code> in Vercel environment variables.</p>
            <input
              value={adminKey}
              onChange={(e) => setAdminKey(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") unlock().catch(() => undefined) }}
              type="password"
              placeholder="ADMIN_SECRET_KEY value"
              className="mt-4 w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm outline-none focus:border-teal"
            />
            <button
              onClick={() => unlock().catch(() => undefined)}
              disabled={loading || !adminKey.trim()}
              className="mt-3 w-full cursor-pointer rounded-xl bg-teal px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
            >
              {loading ? "Verifying..." : "Unlock admin panel"}
            </button>
            {status && (
              <p className={`mt-3 rounded-xl px-3 py-2 text-xs ${status.type === "err" ? "bg-red-50 text-red-700" : "bg-zinc-50 text-zinc-600"}`}>
                {status.text}
              </p>
            )}
          </section>
        )}

        {unlocked && (
          <>
            {/* Status banner */}
            {status && (
              <div className={`rounded-xl px-4 py-3 text-sm font-medium ${status.type === "err" ? "bg-red-50 text-red-700 border border-red-200" : "bg-emerald-50 text-emerald-700 border border-emerald-200"}`}>
                {status.text}
              </div>
            )}

            {/* Stats grid */}
            {stats && (
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <StatCard label="Total users" value={fmt(stats.totalUsers)} sub="registered accounts" />
                <StatCard label="Plan breakdown" value={`${fmt(stats.planCounts.pro)}P / ${fmt(stats.planCounts.solo)}S / ${fmt(stats.planCounts.free)}F`} sub="Pro / Solo / Free" />
                <StatCard label="Drafts generated" value={fmt(stats.usage.totalDrafts)} sub="all time total" />
                <StatCard label="Carousels + Hooks" value={`${fmt(stats.usage.totalCarousels)} / ${fmt(stats.usage.totalHooks)}`} sub="carousels / hooks" />
              </div>
            )}

            {/* Plan breakdown detail + AI status row */}
            <div className="grid gap-4 lg:grid-cols-2">

              {/* Plan breakdown */}
              {stats && (
                <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
                  <h2 className="mb-4 text-sm font-bold text-zinc-900">Users by plan</h2>
                  <div className="space-y-2.5">
                    {(["Free", "Solo", "Pro", "Agency"] as const).map((plan) => {
                      const key = plan.toLowerCase() as keyof typeof stats.planCounts
                      const count = stats.planCounts[key]
                      const pct = stats.totalUsers > 0 ? Math.round((count / stats.totalUsers) * 100) : 0
                      return (
                        <div key={plan} className="flex items-center gap-3">
                          <span className={`w-16 shrink-0 rounded-full px-2 py-0.5 text-center text-[10px] font-bold ${planColor[plan]}`}>{plan}</span>
                          <div className="flex-1 overflow-hidden rounded-full bg-zinc-100 h-2">
                            <div className="h-2 rounded-full bg-teal transition-all" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="w-10 shrink-0 text-right text-xs font-semibold text-zinc-700">{count}</span>
                        </div>
                      )
                    })}
                  </div>
                </section>
              )}

              {/* AI services + quick actions */}
              <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
                <h2 className="mb-4 text-sm font-bold text-zinc-900">AI services</h2>
                {circuits && (
                  <div className="mb-4 flex gap-3">
                    <div className="flex-1 rounded-xl border border-zinc-100 bg-zinc-50 px-4 py-3">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Groq</p>
                      <span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${circuitColor(circuits.groq)}`}>
                        {String(circuits.groq)}
                      </span>
                    </div>
                    <div className="flex-1 rounded-xl border border-zinc-100 bg-zinc-50 px-4 py-3">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Gemini</p>
                      <span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${circuitColor(circuits.gemini)}`}>
                        {String(circuits.gemini)}
                      </span>
                    </div>
                  </div>
                )}
                <div className="space-y-2">
                  <button
                    onClick={() => resetCircuits().catch(() => undefined)}
                    disabled={resettingCircuits}
                    className="w-full cursor-pointer rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-50"
                  >
                    {resettingCircuits ? "Resetting..." : "Reset AI circuit breakers"}
                  </button>
                  <button
                    onClick={() => giveSelfPro().catch(() => undefined)}
                    className="w-full cursor-pointer rounded-xl bg-teal px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-teal-600"
                  >
                    Give myself Pro (all features)
                  </button>
                </div>
              </section>
            </div>

            {/* Recent signups */}
            {recentUsers.length > 0 && (
              <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
                <h2 className="mb-3 text-sm font-bold text-zinc-900">Recent signups</h2>
                <div className="divide-y divide-zinc-100">
                  {recentUsers.map((u) => (
                    <div key={u.id} className="flex items-center justify-between py-2.5">
                      <div>
                        <p className="text-sm font-semibold text-zinc-900">{u.name}</p>
                        <p className="text-xs text-zinc-500">{u.email}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="text-xs text-zinc-400">{fmtDate(u.joinedAt)}</p>
                        <button
                          onClick={() => {
                            const found = users.find((usr) => usr.id === u.id)
                            if (found) selectUser(found)
                            else setMsg(`Load user list first (search) to manage ${u.email}`)
                          }}
                          className="cursor-pointer rounded-lg border border-zinc-200 px-2 py-1 text-[10px] font-bold text-zinc-600 hover:bg-zinc-50"
                        >
                          Manage
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* User management */}
            <div className="grid gap-6 lg:grid-cols-[1fr_380px]">

              {/* User list */}
              <section className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
                <div className="border-b border-zinc-100 p-4">
                  <form
                    onSubmit={(e) => { e.preventDefault(); load(query).catch((err) => setMsg((err as Error).message, "err")) }}
                    className="flex gap-2"
                  >
                    <input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search by email or name..."
                      className="flex-1 rounded-xl border border-zinc-200 px-4 py-2 text-sm outline-none focus:border-teal"
                    />
                    <button className="cursor-pointer rounded-xl bg-zinc-900 px-4 py-2 text-sm font-bold text-white">
                      Search
                    </button>
                  </form>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-zinc-50 text-[10px] uppercase tracking-wider text-zinc-500">
                      <tr>
                        <th className="px-4 py-3">User</th>
                        <th className="px-4 py-3">Plan</th>
                        <th className="px-4 py-3">Drafts</th>
                        <th className="px-4 py-3">WS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {loading ? (
                        <tr><td colSpan={4} className="px-4 py-8 text-center text-zinc-500">Loading...</td></tr>
                      ) : users.length === 0 ? (
                        <tr><td colSpan={4} className="px-4 py-8 text-center text-zinc-400 text-sm">No users found. Try a different search.</td></tr>
                      ) : (
                        users.map((user) => (
                          <tr
                            key={user.id}
                            onClick={() => selectUser(user)}
                            className={`cursor-pointer transition-colors hover:bg-zinc-50 ${selected?.id === user.id ? "bg-teal/5" : ""}`}
                          >
                            <td className="px-4 py-3">
                              <p className="font-semibold text-zinc-900">{user.name}</p>
                              <p className="text-xs text-zinc-500">{user.email}</p>
                              {user.override && (
                                <span className="mt-0.5 inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-bold text-amber-800">
                                  Override active
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${planColor[user.currentPlan] || "bg-zinc-100 text-zinc-700"}`}>
                                {user.currentPlan}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-zinc-700">{user.draftsUsed}</td>
                            <td className="px-4 py-3 text-zinc-700">{user.workspaces}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* Override panel */}
              <aside>
                <section className="sticky top-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
                  <h2 className="text-sm font-bold text-zinc-900">Override panel</h2>
                  {!selected ? (
                    <p className="mt-4 text-sm text-zinc-500">Select a user from the list to edit their plan and feature access.</p>
                  ) : (
                    <div className="mt-4 space-y-4">
                      <div className="rounded-xl bg-zinc-50 px-4 py-3">
                        <p className="font-semibold text-zinc-900">{selected.name}</p>
                        <p className="text-xs text-zinc-500">{selected.email}</p>
                        <p className="mt-1 text-xs text-zinc-400">
                          Current plan: <span className="font-bold text-zinc-700">{selected.currentPlan}</span>
                        </p>
                        {activeOverride && (
                          <span className="mt-1.5 inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                            Override active
                          </span>
                        )}
                      </div>

                      {/* Plan override */}
                      <div>
                        <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-zinc-400">Plan override</label>
                        <select
                          value={form.planOverride}
                          onChange={(e) => setForm((p) => ({ ...p, planOverride: e.target.value }))}
                          className="w-full cursor-pointer rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-teal"
                        >
                          <option value="">Use subscribed plan (default)</option>
                          {PLANS.map((plan) => <option key={plan} value={plan}>{plan}</option>)}
                        </select>
                      </div>

                      {/* Limit overrides */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-zinc-400">Draft limit</label>
                          <input
                            type="number"
                            min="0"
                            value={form.draftLimitOverride}
                            onChange={(e) => setForm((p) => ({ ...p, draftLimitOverride: e.target.value }))}
                            placeholder="e.g. 9999"
                            className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-teal"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-zinc-400">WS limit</label>
                          <input
                            type="number"
                            min="0"
                            value={form.workspaceLimitOverride}
                            onChange={(e) => setForm((p) => ({ ...p, workspaceLimitOverride: e.target.value }))}
                            placeholder="e.g. 10"
                            className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-teal"
                          />
                        </div>
                      </div>

                      {/* Expiry */}
                      <div>
                        <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-zinc-400">Override expires (optional)</label>
                        <input
                          type="date"
                          value={form.expiresAt}
                          onChange={(e) => setForm((p) => ({ ...p, expiresAt: e.target.value }))}
                          className="w-full cursor-pointer rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-teal"
                        />
                      </div>

                      {/* Feature flags */}
                      <div>
                        <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-zinc-400">Feature flags</label>
                        <div className="grid grid-cols-2 gap-1.5">
                          {FEATURES.map(([key, label]) => (
                            <label key={key} className="flex cursor-pointer items-center gap-2 rounded-lg border border-zinc-100 px-3 py-2 text-[11px] font-semibold text-zinc-700 hover:bg-zinc-50">
                              <input
                                type="checkbox"
                                checked={Boolean(form.featureFlags[key])}
                                onChange={(e) => setForm((p) => ({ ...p, featureFlags: { ...p.featureFlags, [key]: e.target.checked } }))}
                                className="accent-teal"
                              />
                              {label}
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* Notes */}
                      <div>
                        <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-zinc-400">Internal notes</label>
                        <textarea
                          value={form.notes}
                          onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                          placeholder="e.g. Beta tester, 30-day trial..."
                          rows={2}
                          className="w-full resize-none rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-teal"
                        />
                      </div>

                      {/* Actions */}
                      <div className="grid gap-2">
                        <button
                          onClick={() => mutate("POST").catch(() => undefined)}
                          className="cursor-pointer rounded-xl bg-teal px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-teal-600"
                        >
                          Apply override
                        </button>
                        <button
                          onClick={() => mutate("PATCH").catch(() => undefined)}
                          className="cursor-pointer rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
                        >
                          Reset to plan defaults
                        </button>
                        <button
                          onClick={() => mutate("DELETE").catch(() => undefined)}
                          className="cursor-pointer rounded-xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-700 transition-colors hover:bg-red-50"
                        >
                          Delete override
                        </button>
                      </div>
                    </div>
                  )}
                </section>
              </aside>
            </div>

            {/* Audit log */}
            <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
              <h2 className="mb-3 text-sm font-bold text-zinc-900">Audit log</h2>
              <div className="divide-y divide-zinc-100">
                {auditLog.length === 0 ? (
                  <p className="py-6 text-center text-sm text-zinc-500">No admin actions recorded yet.</p>
                ) : (
                  auditLog.map((row) => (
                    <div key={row.id} className="flex flex-wrap items-start justify-between gap-2 py-3 text-xs">
                      <div>
                        <span className="font-bold text-zinc-900">{row.action}</span>
                        <span className="ml-2 text-zinc-500">{row.target_user_email}</span>
                      </div>
                      <div className="flex items-center gap-3 text-zinc-400">
                        <span>by {row.admin_email}</span>
                        <span>{fmtDate(row.created_at)}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  )
}

function StatCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white px-5 py-4 shadow-sm">
      <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">{label}</p>
      <p className="mt-1.5 text-2xl font-bold text-zinc-900">{value}</p>
      <p className="mt-0.5 text-xs text-zinc-400">{sub}</p>
    </div>
  )
}
