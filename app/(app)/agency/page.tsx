"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

type Client = {
  id: string
  client_name: string
  client_email?: string
  status: string
  plan: string
}

export default function AgencyDashboard() {
  const [clients, setClients] = useState<Client[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAdding, setIsAdding] = useState(false)
  const [newClientName, setNewClientName] = useState("")

  useEffect(() => {
    fetch("/api/agency/clients")
      .then((res) => res.json())
      .then((data) => {
        if (data.clients) setClients(data.clients)
      })
      .finally(() => setIsLoading(false))
  }, [])

  const handleAddClient = async () => {
    if (!newClientName.trim()) return
    setIsAdding(true)
    try {
      const res = await fetch("/api/agency/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientName: newClientName, plan: "Pro" }),
      })
      const data = await res.json()
      if (data.client) {
        setClients([data.client, ...clients])
        setNewClientName("")
      }
    } finally {
      setIsAdding(false)
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-10 sm:px-10">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900">Agency Hub</h1>
          <p className="mt-1 text-sm text-zinc-500">Manage multiple client workspaces and billing.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="col-span-1 md:col-span-2">
          <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
            <div className="border-b border-zinc-100 bg-zinc-50/50 px-6 py-4 flex flex-wrap gap-4 items-center justify-between">
              <h2 className="font-semibold text-zinc-900">Client Workspaces</h2>
              <div className="flex gap-2 w-full sm:w-auto">
                <input
                  type="text"
                  placeholder="New client name..."
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  className="flex-1 sm:w-48 rounded-lg border border-zinc-200 px-3 py-1.5 text-sm outline-none focus:border-teal/50"
                  onKeyDown={(e) => e.key === "Enter" && handleAddClient()}
                />
                <button
                  onClick={handleAddClient}
                  disabled={isAdding || !newClientName.trim()}
                  className="rounded-lg bg-zinc-900 px-4 py-1.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-zinc-800 disabled:opacity-50"
                >
                  {isAdding ? "Adding..." : "Add"}
                </button>
              </div>
            </div>
            
            <div className="divide-y divide-zinc-100 min-h-[300px]">
              {isLoading ? (
                <div className="p-8 text-center text-sm text-zinc-500">Loading clients...</div>
              ) : clients.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100">
                    <svg className="h-6 w-6 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-zinc-900">No clients yet</p>
                  <p className="text-xs text-zinc-500 mt-1">Add your first client to start managing them.</p>
                </div>
              ) : (
                clients.map(client => (
                  <div key={client.id} className="flex items-center justify-between p-6 transition-colors hover:bg-zinc-50">
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal/10 text-teal-800 font-bold uppercase">
                        {client.client_name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-medium text-zinc-900">{client.client_name}</h3>
                        <p className="text-xs text-zinc-500">{client.plan} Plan</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${client.status === "active" ? "bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20" : "bg-zinc-50 text-zinc-600 ring-1 ring-inset ring-zinc-500/20"}`}>
                        {client.status}
                      </span>
                      <Link href={`/dashboard?client=${client.id}`} className="text-sm font-medium text-teal hover:text-teal-700">
                        Manage &rarr;
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="col-span-1 space-y-6">
          <div className="rounded-2xl border border-gold-200 bg-gradient-to-br from-gold-50 to-white p-6 shadow-sm">
            <h3 className="font-bold text-zinc-900">Agency Billing</h3>
            <p className="mt-2 text-sm text-zinc-600">You are on the Agency Unlimited plan.</p>
            <div className="mt-4 pt-4 border-t border-gold-200/50">
              <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">Total Clients</p>
              <p className="text-3xl font-bold text-zinc-900 mt-1">{clients.length}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
