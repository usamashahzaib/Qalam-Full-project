"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { PlanGate } from "@/components/PlanGate"
import { useSearchParams } from "next/navigation"

type Client = {
  id: string
  client_name: string
  client_email?: string
  status: string
  plan: string
  role?: string
  created_at?: string
}

export default function AgencyDashboard() {
  const searchParams = useSearchParams()
  const activeClientId = searchParams.get("client")
  const [clients, setClients] = useState<Client[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [newClientName, setNewClientName] = useState("")
  const [addError, setAddError] = useState<string | null>(null)

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
        setClients((prev) => [data.client, ...prev])
        setNewClientName("")
      }
    } catch (e) {
      setAddError((e as Error).message === "forbidden" ? "Your role cannot add client workspaces." : (e as Error).message)
    } finally {
      setIsAdding(false)
    }
  }

  return (
    <PlanGate requiredPlan="Agency Starter" feature="Agency Hub" description="Manage multiple client workspaces and team seats with the ">
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
              <div className="flex w-full gap-2 sm:w-auto">
                <input type="text" placeholder="New client name..." value={newClientName} onChange={(e) => setNewClientName(e.target.value)} className="flex-1 rounded-lg border border-zinc-200 px-3 py-1.5 text-sm outline-none focus:border-teal/50 sm:w-48" onKeyDown={(e) => e.key === "Enter" && handleAddClient()} />
                <button onClick={handleAddClient} disabled={isAdding || !newClientName.trim()} className="rounded-lg bg-zinc-900 px-4 py-1.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-zinc-800 disabled:opacity-50">{isAdding ? "Adding..." : "Add"}</button>
              </div>
            </div>

            <div className="border-b border-zinc-100 bg-teal/5 px-6 py-4">
              <p className="text-sm font-medium text-zinc-900">How this works</p>
              <div className="mt-2 grid gap-2 text-xs text-zinc-600 sm:grid-cols-3">
                <p>1. Add a client workspace here.</p>
                <p>2. Open Manage to switch into that client workspace posts, approvals, and chat.</p>
                <p>3. Give teammates only the access they need: admin, editor, reviewer, or viewer.</p>
              </div>
            </div>
            {addError ? <div className="border-b border-red-100 bg-red-50 px-6 py-3 text-sm text-red-700">{addError}</div> : null}

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
                </div>
              ) : (
                clients.map((client) => {
                  const active = activeClientId === client.id
                  return (
                  <div key={client.id} className={`p-6 transition-colors hover:bg-zinc-50 ${active ? "bg-teal/[0.04]" : ""}`}>
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal/10 font-bold uppercase text-teal-800">{client.client_name.charAt(0)}</div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-medium text-zinc-900">{client.client_name}</h3>
                          {active ? <span className="rounded-full bg-teal px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">Active</span> : null}
                        </div>
                        <p className="text-xs text-zinc-500">{client.plan} Plan{client.role ? ` - ${client.role.replaceAll("_", " ")}` : ""}</p>
                      </div>
                      </div>
                      <div className="flex items-center gap-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${client.status === "active" ? "bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20" : "bg-zinc-50 text-zinc-600 ring-1 ring-inset ring-zinc-500/20"}`}>{client.status}</span>
                        <Link href={`/dashboard?client=${client.id}`} className="text-sm font-medium text-teal hover:text-teal-700">{active ? "Open" : "Switch"}</Link>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Link href={`/dashboard?client=${client.id}`} className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50">Dashboard</Link>
                      <Link href={`/writer?client=${client.id}`} className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50">Writer</Link>
                      <Link href={`/library?client=${client.id}`} className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50">Library</Link>
                      <Link href={`/approvals?client=${client.id}`} className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50">Approvals</Link>
                    </div>
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
    </div>
    </PlanGate>
  )
}
