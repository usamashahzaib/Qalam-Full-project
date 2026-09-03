"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { TeamManagement } from "@/components/TeamManagement"
import { WorkspaceBranding } from "@/components/WorkspaceBranding"
import { useSearchParams } from "next/navigation"

type Client = {
  id: string
  client_name: string
  clientContactName?: string | null
  clientContactEmail?: string | null
  status: "active" | "archived"
  plan: string
  role: string
  canManage: boolean
  isAgencyOwner: boolean
  created_at?: string
  planExpiresAt?: string | null
  brandingColor?: string | null
  teamCount?: number
  draftsUsed?: number
  draftsLimit?: number | null
}

type AgencyAccess = {
  accountPlan: string
  canCreate: boolean
  ownedClientCount: number
  workspaceLimit: number | "unlimited"
}

type ClientFormValue = {
  clientName: string
  primaryContactName: string
  primaryContactEmail: string
}

const EMPTY_ACCESS: AgencyAccess = {
  accountPlan: "Free",
  canCreate: false,
  ownedClientCount: 0,
  workspaceLimit: 0,
}

const ROLE_LABELS: Record<string, string> = {
  owner: "Agency owner",
  admin: "Workspace manager",
  editor: "Editor",
  client_reviewer: "Client reviewer",
  viewer: "Viewer",
}

const fmtDate = (iso?: string | null) => {
  if (!iso) return null
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? null : date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

function WorkspaceModal({
  mode,
  client,
  onClose,
  onSaved,
}: {
  mode: "create" | "edit"
  client?: Client
  onClose: () => void
  onSaved: (client: Client) => void
}) {
  const [value, setValue] = useState<ClientFormValue>({
    clientName: client?.client_name ?? "",
    primaryContactName: client?.clientContactName ?? "",
    primaryContactEmail: client?.clientContactEmail ?? "",
  })
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const canSubmit = value.clientName.trim().length >= 2

  const update = (field: keyof ClientFormValue, next: string) => {
    setValue((current) => ({ ...current, [field]: next }))
  }

  const save = async () => {
    if (!canSubmit) return
    setIsSaving(true)
    setError(null)
    try {
      const endpoint = mode === "create" ? "/api/agency/clients" : `/api/workspaces/${client?.id}`
      const res = await fetch(endpoint, {
        method: mode === "create" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(value),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "workspace_save_failed")
      onSaved(mode === "edit" ? { ...client!, ...data.client } : data.client)
      onClose()
    } catch (caught) {
      const code = (caught as Error).message
      const friendly: Record<string, string> = {
        forbidden: "Your role cannot manage this client workspace.",
        upgrade_required: "An Agency account is required to create client workspaces.",
        workspace_limit_reached: "All five client workspace slots are already in use.",
        "Invalid input": "Check the client name and contact email, then try again.",
      }
      setError(friendly[code] || "Could not save this workspace. Try again.")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/40 px-4" role="dialog" aria-modal="true" aria-label={mode === "create" ? "Create client workspace" : "Edit client details"}>
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl">
        <h2 className="text-base font-bold text-zinc-900">{mode === "create" ? "Create client workspace" : "Edit client details"}</h2>
        <p className="mt-1 text-sm text-zinc-500">Keep the client name and primary contact attached to the correct workspace.</p>
        <div className="mt-5 space-y-4">
          <label className="block text-xs font-semibold text-zinc-600">
            Client or brand name
            <input
              type="text"
              autoFocus
              value={value.clientName}
              onChange={(event) => update("clientName", event.target.value)}
              placeholder="Acme Corp"
              maxLength={100}
              className="mt-1.5 w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-4 py-2.5 text-sm font-normal text-zinc-900 outline-none focus:border-teal focus:bg-white focus:ring-4 focus:ring-teal/10"
            />
          </label>
          <label className="block text-xs font-semibold text-zinc-600">
            Primary contact name <span className="font-normal text-zinc-400">(optional)</span>
            <input
              type="text"
              value={value.primaryContactName}
              onChange={(event) => update("primaryContactName", event.target.value)}
              placeholder="Ayesha Khan"
              maxLength={100}
              className="mt-1.5 w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-4 py-2.5 text-sm font-normal text-zinc-900 outline-none focus:border-teal focus:bg-white focus:ring-4 focus:ring-teal/10"
            />
          </label>
          <label className="block text-xs font-semibold text-zinc-600">
            Primary contact email <span className="font-normal text-zinc-400">(optional)</span>
            <input
              type="email"
              value={value.primaryContactEmail}
              onChange={(event) => update("primaryContactEmail", event.target.value)}
              placeholder="ayesha@acme.com"
              maxLength={254}
              className="mt-1.5 w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-4 py-2.5 text-sm font-normal text-zinc-900 outline-none focus:border-teal focus:bg-white focus:ring-4 focus:ring-teal/10"
            />
          </label>
        </div>
        {error ? <p className="mt-3 text-xs font-medium text-red-600">{error}</p> : null}
        <div className="mt-6 flex gap-2">
          <button onClick={onClose} className="flex-1 rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50">Cancel</button>
          <button onClick={() => void save()} disabled={isSaving || !canSubmit} className="flex-1 rounded-xl bg-teal px-4 py-2.5 text-sm font-bold text-white hover:bg-teal-600 disabled:opacity-50">
            {isSaving ? "Saving..." : mode === "create" ? "Create workspace" : "Save details"}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AgencyDashboard() {
  const searchParams = useSearchParams()
  const activeClientId = searchParams.get("client")
  const [clients, setClients] = useState<Client[]>([])
  const [access, setAccess] = useState<AgencyAccess>(EMPTY_ACCESS)
  const [isLoading, setIsLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [teamOpenFor, setTeamOpenFor] = useState<string | null>(null)
  const [brandingOpenFor, setBrandingOpenFor] = useState<string | null>(null)
  const [busyArchiveId, setBusyArchiveId] = useState<string | null>(null)
  const [showArchived, setShowArchived] = useState(false)

  useEffect(() => {
    fetch("/api/agency/clients", { cache: "no-store" })
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || "Could not load client workspaces.")
        setClients(Array.isArray(data.clients) ? data.clients : [])
        setAccess(data.access || EMPTY_ACCESS)
      })
      .catch((error) => setFetchError((error as Error).message || "Could not load client workspaces. Please refresh."))
      .finally(() => setIsLoading(false))
  }, [])

  const visibleClients = useMemo(
    () => clients.filter((client) => showArchived || client.status !== "archived"),
    [clients, showArchived]
  )
  const archivedCount = clients.filter((client) => client.status === "archived").length
  const numericLimit = typeof access.workspaceLimit === "number" ? access.workspaceLimit : null
  const slotsRemaining = numericLimit === null ? null : Math.max(0, numericLimit - access.ownedClientCount)
  const createDisabled = !access.canCreate || slotsRemaining === 0

  const handleToggleArchive = async (client: Client) => {
    const archiving = client.status !== "archived"
    setBusyArchiveId(client.id)
    setFetchError(null)
    try {
      const res = await fetch(`/api/workspaces/${client.id}/archive`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archived: archiving }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "workspace_status_failed")
      setClients((current) => current.map((item) => item.id === client.id ? { ...item, status: archiving ? "archived" : "active" } : item))
    } catch {
      setFetchError("Could not update that workspace's status.")
    } finally {
      setBusyArchiveId(null)
    }
  }

  const upsertClient = (client: Client) => {
    setClients((current) => {
      const exists = current.some((item) => item.id === client.id)
      return exists ? current.map((item) => item.id === client.id ? client : item) : [client, ...current]
    })
    if (!clients.some((item) => item.id === client.id)) {
      setAccess((current) => ({ ...current, ownedClientCount: current.ownedClientCount + 1 }))
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-8 sm:py-10">
      <div className="mb-6 overflow-hidden rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal">Agency operations</p>
            <h1 className="mt-1 text-3xl font-bold text-zinc-900">Agency Hub</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600">One control room for client names, assigned managers, voice-isolated workspaces, approvals, and monthly usage.</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            disabled={createDisabled}
            title={!access.canCreate ? "Only the Agency account owner can create client workspaces" : slotsRemaining === 0 ? "All workspace slots are in use" : undefined}
            className="rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Create client workspace
          </button>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3">
            <p className="text-xs font-medium text-zinc-500">Owned client workspaces</p>
            <p className="mt-1 text-xl font-bold text-zinc-900">{access.ownedClientCount}{numericLimit !== null ? ` of ${numericLimit}` : ""}</p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3">
            <p className="text-xs font-medium text-zinc-500">Assigned workspaces</p>
            <p className="mt-1 text-xl font-bold text-zinc-900">{clients.filter((client) => !client.isAgencyOwner).length}</p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3">
            <p className="text-xs font-medium text-zinc-500">Account access</p>
            <p className="mt-1 text-sm font-bold text-zinc-900">{access.canCreate ? `${access.accountPlan} owner` : clients.length ? "Assigned manager" : access.accountPlan}</p>
          </div>
        </div>

        {numericLimit !== null && access.canCreate ? (
          <div className="mt-4 flex flex-wrap items-center gap-2" aria-label={`${access.ownedClientCount} of ${numericLimit} client workspace slots used`}>
            {Array.from({ length: numericLimit }, (_, index) => (
              <span key={index} className={`h-2.5 flex-1 rounded-full ${index < access.ownedClientCount ? "bg-teal" : "bg-zinc-200"}`} />
            ))}
            <span className="ml-1 text-xs font-medium text-zinc-500">{slotsRemaining} slot{slotsRemaining === 1 ? "" : "s"} available</span>
          </div>
        ) : null}
      </div>

      {fetchError ? <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{fetchError}</div> : null}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-zinc-900">Client workspaces</h2>
          <p className="text-xs text-zinc-500">Open one workspace at a time. Its posts, voice, approvals, and analytics stay separate.</p>
        </div>
        {archivedCount ? (
          <button onClick={() => setShowArchived((value) => !value)} className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-600 hover:bg-zinc-50">
            {showArchived ? "Hide archived" : `Show archived (${archivedCount})`}
          </button>
        ) : null}
      </div>

      {isLoading ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {[0, 1, 2, 3].map((item) => <div key={item} className="h-56 animate-pulse rounded-2xl bg-zinc-100" />)}
        </div>
      ) : !visibleClients.length ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-white px-6 py-14 text-center">
          <p className="font-semibold text-zinc-900">{clients.length ? "No active client workspaces" : "No client workspaces yet"}</p>
          <p className="mx-auto mt-2 max-w-lg text-sm text-zinc-500">
            {access.canCreate ? "Create the first client workspace, then assign a manager, editor, reviewer, or viewer." : "You do not own an Agency account and have not been assigned as a workspace manager."}
          </p>
          {access.canCreate ? <button onClick={() => setShowCreateModal(true)} className="mt-5 rounded-xl bg-teal px-5 py-2.5 text-sm font-bold text-white hover:bg-teal-600">Create first workspace</button> : <Link href="/pricing" className="mt-5 inline-block rounded-xl bg-zinc-900 px-5 py-2.5 text-sm font-bold text-white hover:bg-zinc-800">View Agency plan</Link>}
        </div>
      ) : (
        <div className="grid items-start gap-4 lg:grid-cols-2">
          {visibleClients.map((client) => {
            const active = activeClientId === client.id
            const archived = client.status === "archived"
            const draftsPct = client.draftsLimit ? Math.min(100, ((client.draftsUsed ?? 0) / client.draftsLimit) * 100) : 0
            const expiry = fmtDate(client.planExpiresAt)
            return (
              <article key={client.id} className={`rounded-2xl border bg-white p-5 shadow-sm ${active ? "border-teal/40 ring-2 ring-teal/10" : "border-zinc-200"} ${archived ? "opacity-65" : ""}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal/10 text-sm font-bold uppercase text-teal-800" style={client.brandingColor ? { backgroundColor: `${client.brandingColor}1a`, color: client.brandingColor } : undefined}>{client.client_name.charAt(0)}</div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate font-bold text-zinc-900">{client.client_name}</h3>
                        {active ? <span className="rounded-full bg-teal px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">Open</span> : null}
                      </div>
                      <p className="mt-0.5 text-xs text-zinc-500">{ROLE_LABELS[client.role] || client.role} · {client.teamCount ?? 1} member{(client.teamCount ?? 1) === 1 ? "" : "s"}</p>
                    </div>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${archived ? "bg-zinc-100 text-zinc-500" : "bg-emerald-50 text-emerald-700"}`}>{client.status}</span>
                </div>

                <div className="mt-4 rounded-xl border border-zinc-100 bg-zinc-50 px-4 py-3 text-xs text-zinc-600">
                  <p><span className="font-semibold text-zinc-800">Primary contact:</span> {client.clientContactName || "Not added"}</p>
                  <p className="mt-1"><span className="font-semibold text-zinc-800">Email:</span> {client.clientContactEmail || "Not added"}</p>
                  {expiry ? <p className="mt-1"><span className="font-semibold text-zinc-800">Plan renewal:</span> {expiry}</p> : null}
                </div>

                {client.draftsLimit ? (
                  <div className="mt-4">
                    <div className="mb-1.5 flex items-center justify-between text-xs text-zinc-500"><span>Monthly drafts</span><span className="font-semibold text-zinc-700">{client.draftsUsed ?? 0} / {client.draftsLimit}</span></div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-zinc-100"><div className="h-full rounded-full bg-teal" style={{ width: `${draftsPct}%`, backgroundColor: client.brandingColor || undefined }} /></div>
                  </div>
                ) : null}

                <div className="mt-5 flex flex-wrap gap-2">
                  {!archived ? <Link href={`/dashboard?client=${client.id}`} className="rounded-lg bg-zinc-900 px-3 py-2 text-xs font-semibold text-white hover:bg-zinc-800">Open workspace</Link> : null}
                  {!archived ? <Link href={`/approvals?client=${client.id}`} className="rounded-lg border border-zinc-200 px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50">Approvals</Link> : null}
                  <button onClick={() => setTeamOpenFor((current) => current === client.id ? null : client.id)} className="rounded-lg border border-zinc-200 px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50">{teamOpenFor === client.id ? "Close team" : "Team"}</button>
                  <button onClick={() => setEditingClient(client)} className="rounded-lg border border-zinc-200 px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50">Client details</button>
                  <button onClick={() => setBrandingOpenFor((current) => current === client.id ? null : client.id)} className="rounded-lg border border-zinc-200 px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50">Branding</button>
                  <button onClick={() => void handleToggleArchive(client)} disabled={busyArchiveId === client.id} className="rounded-lg px-3 py-2 text-xs font-semibold text-zinc-500 hover:bg-zinc-50 disabled:opacity-50">{busyArchiveId === client.id ? "Saving..." : archived ? "Restore" : "Archive"}</button>
                </div>

                {teamOpenFor === client.id ? <div className="mt-4"><TeamManagement workspaceId={client.id} workspaceName={client.client_name} currentRole={client.role} /></div> : null}
                {brandingOpenFor === client.id ? <div className="mt-4"><WorkspaceBranding workspaceId={client.id} initialColor={client.brandingColor ?? null} canManage={client.canManage} onSaved={(color) => setClients((current) => current.map((item) => item.id === client.id ? { ...item, brandingColor: color } : item))} /></div> : null}
              </article>
            )
          })}
        </div>
      )}

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {[
          ["Agency owner", "Creates up to five client workspaces and controls all workspace managers."],
          ["Workspace manager", "Runs one assigned client workspace, including its team, branding, approvals, and publishing."],
          ["Editor and reviewer", "Editors create and publish. Client reviewers approve through a private review link. Viewers stay read-only."],
        ].map(([title, body]) => <div key={title} className="rounded-xl border border-zinc-200 bg-white p-4"><p className="text-sm font-bold text-zinc-900">{title}</p><p className="mt-1 text-xs leading-5 text-zinc-500">{body}</p></div>)}
      </div>

      {showCreateModal ? <WorkspaceModal mode="create" onClose={() => setShowCreateModal(false)} onSaved={upsertClient} /> : null}
      {editingClient ? <WorkspaceModal mode="edit" client={editingClient} onClose={() => setEditingClient(null)} onSaved={upsertClient} /> : null}
    </div>
  )
}
