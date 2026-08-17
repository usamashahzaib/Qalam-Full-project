"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"

type Organization = { id: string; name: string; organization_type: string; website: string | null; verification_status: string; created_at: string }

export function CareerOrganizationAdmin() {
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState("")
  const load = useCallback(async () => { const response = await fetch("/api/admin/career-organizations"); const data = await response.json().catch(() => ({})); setOrganizations(data.organizations || []); setLoading(false) }, [])
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0)
    return () => window.clearTimeout(timer)
  }, [load])
  const update = async (id: string, status: "verified" | "rejected" | "suspended") => { const response = await fetch("/api/admin/career-organizations", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status }) }); setMessage(response.ok ? `Organization ${status}.` : "Organization could not be updated."); if (response.ok) await load() }
  return <main className="min-h-screen bg-zinc-50 px-4 py-8 text-zinc-900 lg:px-8"><div className="mx-auto max-w-6xl"><div className="flex items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-teal">Trust operations</p><h1 className="mt-2 text-2xl font-bold">Career organization verification</h1></div><Link href="/admin" className="text-sm font-bold text-teal">Back to admin</Link></div>{message && <p className="mt-5 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm">{message}</p>}<section className="mt-6 overflow-hidden rounded-2xl border border-zinc-200 bg-white"><div className="grid grid-cols-[1.4fr_0.8fr_0.7fr_1fr] gap-4 border-b border-zinc-200 bg-zinc-50 px-5 py-3 text-xs font-bold uppercase tracking-wider text-zinc-500"><span>Organization</span><span>Type</span><span>Status</span><span>Decision</span></div>{loading ? <p className="p-8 text-sm text-zinc-500">Loading...</p> : organizations.length ? organizations.map((item) => <article key={item.id} className="grid grid-cols-[1.4fr_0.8fr_0.7fr_1fr] items-center gap-4 border-b border-zinc-100 px-5 py-4 last:border-b-0"><div><p className="font-bold">{item.name}</p>{item.website && <a href={item.website} target="_blank" rel="noreferrer" className="text-xs text-teal">{item.website}</a>}</div><p className="text-sm text-zinc-600">{item.organization_type.replace("_", " ")}</p><p className="text-sm font-semibold capitalize">{item.verification_status}</p><div className="flex gap-2"><button onClick={() => void update(item.id, "verified")} className="rounded-lg bg-teal px-3 py-2 text-xs font-bold text-white">Verify</button><button onClick={() => void update(item.id, "rejected")} className="rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-700">Reject</button></div></article>) : <p className="p-10 text-center text-sm text-zinc-500">No organizations submitted.</p>}</section></div></main>
}
