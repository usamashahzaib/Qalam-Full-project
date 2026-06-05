"use client"

import { useEffect, useMemo, useState } from "react"

type Override = {
  plan_override: string | null
  draft_limit_override: number | null
  workspace_limit_override: number | null
  feature_flags: Record<string, boolean> | null
  notes?: string | null
  expires_at?: string | null
}

type AdminUser = {
  id: string
  name: string
  email: string
  linkedInId: string
  currentPlan: string
  draftsUsed: number
  workspaces: number
  override: Override | null
}

type AuditRow = {
  id: string
  admin_email: string
  target_user_email: string
  action: string
  old_value: unknown
  new_value: unknown
  created_at: string
}

const PLANS = ["Free", "Solo", "Pro", "Agency"]
const FEATURES = [
  ["scheduling", "Scheduling"],
  ["voiceProfiles", "Voice profiles"],
  ["analytics", "Analytics"],
  ["carouselBuilder", "Carousel builder"],
  ["competitorResearch", "Competitor research"],
  ["approvalWorkflow", "Approval workflow"],
  ["exportPdf", "Export to PDF"],
  ["whiteLabel", "White-label"],
] as const

const emptyFlags = () => Object.fromEntries(FEATURES.map(([key]) => [key, false])) as Record<string, boolean>

export function AdminDashboard({ adminEmail }: { adminEmail: string }) {
  const [query, setQuery] = useState("")
  const [adminKey, setAdminKey] = useState("")
  const [unlocked, setUnlocked] = useState(false)
  const [users, setUsers] = useState<AdminUser[]>([])
  const [auditLog, setAuditLog] = useState<AuditRow[]>([])
  const [selected, setSelected] = useState<AdminUser | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    planOverride: "",
    draftLimitOverride: "",
    workspaceLimitOverride: "",
    featureFlags: emptyFlags(),
    notes: "",
    expiresAt: "",
  })

  const load = async (q = query) => {
    if (!adminKey.trim()) throw new Error("Admin key required")
    setLoading(true)
    const res = await fetch(`/api/admin/users?q=${encodeURIComponent(q)}`, { headers: { "x-admin-key": adminKey } })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.error || "Admin data unavailable")
    setUsers(data.users || [])
    setAuditLog(data.auditLog || [])
    setLoading(false)
  }

  const unlock = async () => {
    setStatus("Checking admin key...")
    try {
      await load("")
      setUnlocked(true)
      setStatus(null)
    } catch (error) {
      setUnlocked(false)
      setStatus((error as Error).message)
      setLoading(false)
    }
  }

  const selectUser = (user: AdminUser) => {
    setSelected(user)
    const flags = { ...emptyFlags(), ...(user.override?.feature_flags || {}) }
    setForm({
      planOverride: user.override?.plan_override || "",
      draftLimitOverride: user.override?.draft_limit_override === null || user.override?.draft_limit_override === undefined ? "" : String(user.override.draft_limit_override),
      workspaceLimitOverride: user.override?.workspace_limit_override === null || user.override?.workspace_limit_override === undefined ? "" : String(user.override.workspace_limit_override),
      featureFlags: flags,
      notes: user.override?.notes || "",
      expiresAt: user.override?.expires_at ? user.override.expires_at.slice(0, 10) : "",
    })
  }

  const activeOverride = useMemo(() => Boolean(selected?.override), [selected])

  const mutate = async (method: "POST" | "PATCH" | "DELETE") => {
    if (!selected) return
    setStatus(method === "DELETE" ? "Deleting override..." : method === "PATCH" ? "Resetting override..." : "Applying override...")
    const body = method === "POST"
      ? {
          userId: selected.id,
          targetEmail: selected.email,
          planOverride: form.planOverride || null,
          draftLimitOverride: form.draftLimitOverride === "" ? null : Number(form.draftLimitOverride),
          workspaceLimitOverride: form.workspaceLimitOverride === "" ? null : Number(form.workspaceLimitOverride),
          featureFlags: form.featureFlags,
          notes: form.notes || null,
          expiresAt: form.expiresAt ? new Date(`${form.expiresAt}T23:59:59`).toISOString() : null,
        }
      : { userId: selected.id, targetEmail: selected.email }
    const res = await fetch("/api/admin/overrides", {
      method,
      headers: { "Content-Type": "application/json", "x-admin-key": adminKey },
      body: JSON.stringify(body),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.error || "Override update failed")
    await load(query)
    setStatus(method === "DELETE" ? "Override deleted" : method === "PATCH" ? "Override reset" : "Override applied")
  }

  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-8 font-jakarta text-zinc-900">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Admin overrides</h1>
            <p className="mt-1 text-sm text-zinc-500">Signed in as {adminEmail}</p>
          </div>
          <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-700">Admin</span>
        </div>

        {!unlocked ? (
          <section className="max-w-xl rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500">Admin secret key</label>
            <input
              value={adminKey}
              onChange={(event) => setAdminKey(event.target.value)}
              onKeyDown={(event) => { if (event.key === "Enter") unlock().catch(() => undefined) }}
              type="password"
              placeholder="Enter ADMIN_SECRET_KEY"
              className="mt-2 w-full rounded-xl border border-zinc-200 px-4 py-2 text-sm outline-none focus:border-teal"
            />
            <button onClick={() => unlock().catch(() => undefined)} disabled={loading || !adminKey.trim()} className="mt-3 rounded-xl bg-teal px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
              {loading ? "Checking..." : "Unlock admin panel"}
            </button>
            {status ? <p className="mt-3 rounded-xl bg-zinc-50 px-3 py-2 text-xs text-zinc-600">{status}</p> : null}
          </section>
        ) : null}

        {unlocked ? <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
          <section className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
            <div className="border-b border-zinc-100 p-4">
              <form onSubmit={(event) => { event.preventDefault(); load(query).catch((error) => setStatus((error as Error).message)) }} className="flex gap-2">
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by email, LinkedIn ID, or name" className="flex-1 rounded-xl border border-zinc-200 px-4 py-2 text-sm outline-none focus:border-teal" />
                <button className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-bold text-white">Search</button>
              </form>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-zinc-50 text-xs uppercase tracking-wider text-zinc-500">
                  <tr>
                    <th className="px-4 py-3">User</th>
                    <th className="px-4 py-3">Plan</th>
                    <th className="px-4 py-3">Drafts</th>
                    <th className="px-4 py-3">Workspaces</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {loading ? <tr><td colSpan={4} className="px-4 py-8 text-center text-zinc-500">Loading users...</td></tr> : users.map((user) => (
                    <tr key={user.id} onClick={() => selectUser(user)} className={`cursor-pointer hover:bg-zinc-50 ${selected?.id === user.id ? "bg-teal/5" : ""}`}>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-zinc-900">{user.name}</p>
                        <p className="text-xs text-zinc-500">{user.email}</p>
                        {user.override ? <span className="mt-1 inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">Override active</span> : null}
                      </td>
                      <td className="px-4 py-3">{user.currentPlan}</td>
                      <td className="px-4 py-3">{user.draftsUsed}</td>
                      <td className="px-4 py-3">{user.workspaces}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <aside className="space-y-6">
            <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
              <h2 className="text-base font-bold">Override panel</h2>
              {!selected ? <p className="mt-4 text-sm text-zinc-500">Select a user to edit overrides.</p> : (
                <div className="mt-4 space-y-4">
                  <div>
                    <p className="font-semibold">{selected.name}</p>
                    <p className="text-xs text-zinc-500">{selected.email}</p>
                    {activeOverride ? <span className="mt-2 inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">Override active</span> : null}
                  </div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500">Current plan override</label>
                  <select value={form.planOverride} onChange={(event) => setForm((prev) => ({ ...prev, planOverride: event.target.value }))} className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm">
                    <option value="">Use subscribed plan</option>
                    {PLANS.map((plan) => <option key={plan} value={plan}>{plan}</option>)}
                  </select>
                  <div className="grid grid-cols-2 gap-3">
                    <input type="number" min="0" value={form.draftLimitOverride} onChange={(event) => setForm((prev) => ({ ...prev, draftLimitOverride: event.target.value }))} placeholder="Custom draft limit" className="rounded-xl border border-zinc-200 px-3 py-2 text-sm" />
                    <input type="number" min="0" value={form.workspaceLimitOverride} onChange={(event) => setForm((prev) => ({ ...prev, workspaceLimitOverride: event.target.value }))} placeholder="Workspace limit" className="rounded-xl border border-zinc-200 px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-zinc-500">Override expires</label>
                    <input type="date" value={form.expiresAt} onChange={(event) => setForm((prev) => ({ ...prev, expiresAt: event.target.value }))} className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {FEATURES.map(([key, label]) => (
                      <label key={key} className="flex items-center gap-2 rounded-lg border border-zinc-100 px-3 py-2 text-xs font-semibold text-zinc-700">
                        <input type="checkbox" checked={Boolean(form.featureFlags[key])} onChange={(event) => setForm((prev) => ({ ...prev, featureFlags: { ...prev.featureFlags, [key]: event.target.checked } }))} />
                        {label}
                      </label>
                    ))}
                  </div>
                  <textarea value={form.notes} onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))} placeholder="Internal notes" className="min-h-20 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm" />
                  <div className="grid gap-2">
                    <button onClick={() => mutate("POST").catch((error) => setStatus((error as Error).message))} className="rounded-xl bg-teal px-4 py-2 text-sm font-bold text-white">Apply Override</button>
                    <button onClick={() => mutate("PATCH").catch((error) => setStatus((error as Error).message))} className="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-bold text-zinc-700">Reset to plan defaults</button>
                    <button onClick={() => mutate("DELETE").catch((error) => setStatus((error as Error).message))} className="rounded-xl border border-red-200 px-4 py-2 text-sm font-bold text-red-700">Delete override</button>
                  </div>
                </div>
              )}
              {status ? <p className="mt-4 rounded-xl bg-zinc-50 px-3 py-2 text-xs text-zinc-600">{status}</p> : null}
            </section>
          </aside>
        </div> : null}

        {unlocked ? <section className="mt-6 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-base font-bold">Audit log</h2>
          <div className="divide-y divide-zinc-100">
            {auditLog.map((row) => (
              <div key={row.id} className="grid gap-2 py-3 text-xs text-zinc-600 md:grid-cols-[180px_1fr_1fr_160px]">
                <span className="font-semibold text-zinc-900">{row.action}</span>
                <span>{row.admin_email}</span>
                <span>{row.target_user_email}</span>
                <span>{new Date(row.created_at).toLocaleString()}</span>
              </div>
            ))}
            {!auditLog.length ? <p className="py-6 text-center text-sm text-zinc-500">No audit entries yet.</p> : null}
          </div>
        </section> : null}
      </div>
    </main>
  )
}
