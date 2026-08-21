"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { PlanGate } from "@/components/PlanGate"
import { TeamManagement } from "@/components/TeamManagement"
import { WorkspaceBranding } from "@/components/WorkspaceBranding"
import { useSearchParams } from "next/navigation"

type Client = {
  id: string
  client_name: string
  client_email?: string
  status: string
  plan: string
  role?: string
  created_at?: string
  planExpiresAt?: string | null
  brandingColor?: string | null
  teamCount?: number
  draftsUsed?: number
  draftsLimit?: number | null
}

const fmtDate = (iso?: string | null) => {
  if (!iso) return "-"
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

function CreateWorkspaceModal({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated: (client: Client) => void
}) {
  const [newClientName, setNewClientName] = useState("")
  const [isAdding, setIsAdding] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)

  const handleAddClient = async () => {
    if (!newClientName.trim()) return
    setIsAdding(true)
    setAddError(null)
    try {
      const res = await fetch("/api/agency/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientName: newClientName, plan: "Pro" }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Client could not be added")
      if (data.client) {
        onCreated(data.client)
        onClose()
      }
    } catch (e) {
      const msg = (e as Error).message
      const friendly: Record<string, string> = {
        forbidden: "Your role cannot add client workspaces.",
        workspace_limit_reached: "You've reached your plan's 5-workspace limit.",
      }
      setAddError(friendly[msg] || msg)
    } finally {
      setIsAdding(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/40 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl">
        <h2 className="text-base font-bold text-zinc-900">Create client workspace</h2>
        <p className="mt-1 text-sm text-zinc-500">Gives this client an isolated voice profile, posts, and approvals.</p>
        <input
          type="text"
          autoFocus
          placeholder="e.g. Acme Corp"
          value={newClientName}
          onChange={(e) => setNewClientName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAddClient()}
          className="mt-4 w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-4 py-2.5 text-sm text-zinc-900 outline-none transition-all focus:border-teal focus:bg-white focus:ring-4 focus:ring-teal/10"
        />
        {addError ? <p className="mt-2 text-xs font-medium text-red-600">{addError}</p> : null}
        <div className="mt-5 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 cursor-pointer rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
          >
            Cancel
          </button>
          <button
            onClick={handleAddClient}
            disabled={isAdding || !newClientName.trim()}
            className="flex-1 cursor-pointer rounded-xl bg-teal px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-teal-600 disabled:opacity-50"
          >
            {isAdding ? "Creating..." : "Create workspace"}
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
  const [isLoading, setIsLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [teamOpenFor, setTeamOpenFor] = useState<string | null>(null)
  const [brandingOpenFor, setBrandingOpenFor] = useState<string | null>(null)
  const [busyArchiveId, setBusyArchiveId] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/agency/clients")
      .then((res) => res.json())
      .then((data) => {
        if (data.clients) setClients(data.clients)
        else if (data.error) setFetchError(data.error)
      })
      .catch(() => setFetchError("Could not load client workspaces. Please refresh."))
      .finally(() => setIsLoading(false))
  }, [])

  const handleToggleArchive = async (client: Client) => {
    const archiving = client.status !== "archived"
    setBusyArchiveId(client.id)
    try {
      const res = await fetch(`/api/workspaces/${client.id}/archive`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archived: archiving }),
      })
      if (!res.ok) throw new Error()
      setClients((prev) => prev.map((c) => (c.id === client.id ? { ...c, status: archiving ? "archived" : "active" } : c)))
    } catch {
      setFetchError("Could not update that workspace's status.")
    } finally {
      setBusyArchiveId(null)
    }
  }

  return (
    <PlanGate requiredPlan="Agency" feature="Agency Hub" description="Apply for Agency to unlock five client workspaces, team seats, approvals, and analytics.">
    <div className="mx-auto max-w-5xl px-6 py-10 sm:px-10">
      <div className="relative mb-8 overflow-hidden rounded-2xl border border-zinc-100 bg-white px-6 py-5 shadow-sm">
        <div
          className="pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full"
          style={{ background: "radial-gradient(circle, rgba(201,135,31,0.1) 0%, transparent 70%)" }}
        />
        <div className="relative">
          <h1 className="text-3xl font-bold text-zinc-900">Agency Hub</h1>
          <p className="mt-1 text-sm text-zinc-500">Add client workspaces, switch into them, and control who can draft, review, or publish.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="col-span-1 md:col-span-2">
          <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-100 bg-zinc-50/50 px-6 py-4">
              <h2 className="font-semibold text-zinc-900">Client Workspaces</h2>
              <button
                onClick={() => setShowCreateModal(true)}
                className="rounded-lg bg-zinc-900 px-4 py-1.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-zinc-800"
              >
                Create workspace
              </button>
            </div>

            <div className="border-b border-zinc-100 bg-teal/5 px-6 py-4">
              <p className="text-sm font-medium text-zinc-900">How this works</p>
              <div className="mt-2 grid gap-2 text-xs text-zinc-600 sm:grid-cols-3">
                <p>1. Add a client workspace here.</p>
                <p>2. Open Manage to switch into that client workspace posts, approvals, and chat.</p>
                <p>3. Give teammates only the access they need: admin, editor, reviewer, or viewer.</p>
              </div>
            </div>

            <div className="min-h-[300px] divide-y divide-zinc-100">
              {isLoading ? (
                <div className="p-8 text-center text-sm text-zinc-500">Loading clients...</div>
              ) : fetchError ? (
                <div className="p-8 text-center text-sm text-red-600">{fetchError}</div>
              ) : !clients.length ? (
                <div className="p-8 text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100">
                    <svg className="h-6 w-6 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-zinc-900">No clients yet</p>
                  <p className="mt-1 text-xs text-zinc-500">Add your first client to start managing them.</p>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="mt-4 rounded-lg bg-teal px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-teal-600"
                  >
                    Create workspace
                  </button>
                </div>
              ) : (
                clients.map((client) => {
                  const active = activeClientId === client.id
                  const archived = client.status === "archived"
                  const draftsPct = client.draftsLimit ? Math.min(100, ((client.draftsUsed ?? 0) / client.draftsLimit) * 100) : 0
                  return (
                  <div key={client.id} className={`p-6 transition-colors hover:bg-zinc-50 ${active ? "bg-teal/[0.04]" : ""} ${archived ? "opacity-60" : ""}`}>
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-lg font-bold uppercase text-teal-800 ${client.brandingColor ? "" : "bg-teal/10"}`}
                        style={client.brandingColor ? { backgroundColor: `${client.brandingColor}1a` } : undefined}
                      >
                        {client.client_name.charAt(0)}
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-medium text-zinc-900">{client.client_name}</h3>
                          {active ? <span className="rounded-full bg-teal px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white">Active</span> : null}
                        </div>
                        <p className="text-xs text-zinc-500">{client.plan} Plan{client.role ? ` - ${client.role.replaceAll("_", " ")}` : ""} - {client.teamCount ?? 1} member{(client.teamCount ?? 1) !== 1 ? "s" : ""}</p>
                        <p className="mt-0.5 text-[11px] font-medium text-zinc-400">Expires {fmtDate(client.planExpiresAt)}</p>
                      </div>
                      </div>
                      <div className="flex items-center gap-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${!archived ? "bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20" : "bg-zinc-100 text-zinc-500 ring-1 ring-inset ring-zinc-400/20"}`}>{client.status}</span>
                        <Link href={`/dashboard?client=${client.id}`} className="text-sm font-medium text-teal hover:text-teal-700">{active ? "Open" : "Switch"}</Link>
                      </div>
                    </div>

                    {client.draftsLimit ? (
                      <div className="mt-3">
                        <div className="mb-1 flex items-center justify-between text-[11px] text-zinc-400">
                          <span>{client.draftsUsed ?? 0} of {client.draftsLimit} drafts this month</span>
                        </div>
                        <div className="h-1 overflow-hidden rounded-full bg-zinc-100">
                          <div
                            className="h-full rounded-full bg-teal"
                            style={{ width: `${draftsPct}%`, backgroundColor: client.brandingColor || undefined }}
                          />
                        </div>
                      </div>
                    ) : null}

                    <div className="mt-4 flex flex-wrap gap-2">
                      <Link href={`/dashboard?client=${client.id}`} className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50">Dashboard</Link>
                      <Link href={`/writer?client=${client.id}`} className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50">Writer</Link>
                      <Link href={`/library?client=${client.id}`} className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50">Library</Link>
                      <Link href={`/approvals?client=${client.id}`} className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50">Approvals</Link>
                      <button
                        onClick={() => setTeamOpenFor((prev) => (prev === client.id ? null : client.id))}
                        className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${teamOpenFor === client.id ? "border-teal/40 bg-teal/10 text-teal-800" : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"}`}
                      >
                        {teamOpenFor === client.id ? "Hide team" : "Manage team"}
                      </button>
                      <button
                        onClick={() => setBrandingOpenFor((prev) => (prev === client.id ? null : client.id))}
                        className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${brandingOpenFor === client.id ? "border-teal/40 bg-teal/10 text-teal-800" : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"}`}
                      >
                        {brandingOpenFor === client.id ? "Hide branding" : "Branding"}
                      </button>
                      <button
                        onClick={() => handleToggleArchive(client)}
                        disabled={busyArchiveId === client.id}
                        className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-500 transition-colors hover:bg-zinc-50 disabled:opacity-50"
                      >
                        {busyArchiveId === client.id ? "..." : archived ? "Restore" : "Archive"}
                      </button>
                    </div>
                    {teamOpenFor === client.id ? (
                      <div className="mt-3">
                        <TeamManagement workspaceId={client.id} workspaceName={client.client_name} />
                      </div>
                    ) : null}
                    {brandingOpenFor === client.id ? (
                      <div className="mt-3">
                        <WorkspaceBranding
                          workspaceId={client.id}
                          initialColor={client.brandingColor ?? null}
                          onSaved={(color) => setClients((prev) => prev.map((c) => (c.id === client.id ? { ...c, brandingColor: color } : c)))}
                        />
                      </div>
                    ) : null}
                  </div>
                )})
              )}
            </div>
          </div>
        </div>

        <div className="col-span-1 space-y-6">
          <div className="rounded-2xl border border-amber-200/60 bg-gradient-to-br from-amber-50/40 to-white p-6 shadow-sm">
            <h3 className="font-bold text-zinc-900">Agency Billing</h3>
            <p className="mt-2 text-sm text-zinc-600">Billing is still guided manually. Use pricing to request plan changes.</p>
            <div className="mt-4 border-t border-amber-100 pt-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Total Clients</p>
              <p className="mt-1 text-3xl font-bold text-zinc-900">{clients.length}</p>
            </div>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h3 className="font-bold text-zinc-900">Workspace separation</h3>
            <div className="mt-3 space-y-2 text-sm text-zinc-600">
              <p><span className="font-semibold text-zinc-900">Voice memory</span> - each client keeps its own tone, goals, and LinkedIn profile.</p>
              <p><span className="font-semibold text-zinc-900">Post library</span> - templates and archive stay scoped to the active client.</p>
              <p><span className="font-semibold text-zinc-900">Approvals and analytics</span> - queues and data stay inside that workspace.</p>
            </div>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h3 className="font-bold text-zinc-900">Access model</h3>
            <div className="mt-3 space-y-2 text-sm text-zinc-600">
              <p><span className="font-semibold text-zinc-900">Super admin</span> - full platform control.</p>
              <p><span className="font-semibold text-zinc-900">Agency admin</span> - manages client workspaces and approvals.</p>
              <p><span className="font-semibold text-zinc-900">Editor</span> - drafts and schedules content.</p>
              <p><span className="font-semibold text-zinc-900">Client reviewer</span> - approves or rejects drafts.</p>
              <p><span className="font-semibold text-zinc-900">Viewer</span> - read-only visibility.</p>
            </div>
          </div>
        </div>
      </div>

      {showCreateModal ? (
        <CreateWorkspaceModal
          onClose={() => setShowCreateModal(false)}
          onCreated={(client) => setClients((prev) => [client, ...prev])}
        />
      ) : null}
    </div>
    </PlanGate>
  )
}
