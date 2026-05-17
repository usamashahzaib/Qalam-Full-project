"use client"

import { useWorkspace } from "@/components/providers/WorkspaceProvider"
import Link from "next/link"

export default function AgencyDashboard() {
  const { state } = useWorkspace()

  // Mock list of clients for the Agency UI layout
  const clients = [
    { id: "1", name: "Acme Corp", plan: "Enterprise", status: "Active" },
    { id: "2", name: "Global Tech", plan: "Pro", status: "Active" },
    { id: "3", name: "Startup Inc", plan: "Free", status: "Inactive" },
  ]

  return (
    <div className="mx-auto max-w-5xl px-6 py-10 sm:px-10">
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900">Agency Hub</h1>
          <p className="mt-1 text-sm text-zinc-500">Manage multiple client workspaces and billing.</p>
        </div>
        <button className="rounded-xl bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:scale-[1.02] hover:bg-zinc-800">
          Add Client
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="col-span-2">
          <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
            <div className="border-b border-zinc-100 bg-zinc-50/50 px-6 py-4">
              <h2 className="font-semibold text-zinc-900">Client Workspaces</h2>
            </div>
            <div className="divide-y divide-zinc-100">
              {clients.map(client => (
                <div key={client.id} className="flex items-center justify-between p-6 transition-colors hover:bg-zinc-50">
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal/10 text-teal-800 font-bold">
                      {client.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-medium text-zinc-900">{client.name}</h3>
                      <p className="text-xs text-zinc-500">{client.plan} Plan</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${client.status === "Active" ? "bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20" : "bg-zinc-50 text-zinc-600 ring-1 ring-inset ring-zinc-500/20"}`}>
                      {client.status}
                    </span>
                    <Link href={`/dashboard`} className="text-sm font-medium text-teal hover:text-teal-700">
                      Manage &rarr;
                    </Link>
                  </div>
                </div>
              ))}
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
