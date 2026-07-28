"use client"

import { useEffect, useState } from "react"

type Order = {
  id: string
  addon_key: string
  amount_pkr: number
  quantity: number
  status: string
  payment_provider: string | null
  provider_reference: string | null
  consumed_at: string | null
  created_at: string
}

export function CareerAddonAdmin() {
  const [orders, setOrders] = useState<Order[]>([])
  const [message, setMessage] = useState("")
  const load = () => fetch("/api/admin/career-addons").then((response) => response.json()).then((data) => setOrders(data.orders || [])).catch(() => setMessage("Orders could not be loaded."))
  useEffect(() => { void load() }, [])
  const update = async (id: string, status: string) => {
    const response = await fetch(`/api/admin/career-addons/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) })
    setMessage(response.ok ? "Order updated." : "Order update failed.")
    if (response.ok) void load()
  }
  return <main className="min-h-screen bg-zinc-50 px-4 py-8 lg:px-8"><div className="mx-auto max-w-6xl"><header><p className="text-xs font-bold uppercase tracking-[0.14em] text-teal">Admin</p><h1 className="mt-1 text-2xl font-bold text-zinc-900">Career add-on orders</h1></header>{message && <p className="mt-4 rounded-xl bg-gold/10 px-4 py-3 text-sm">{message}</p>}<section className="mt-6 overflow-hidden rounded-2xl border border-zinc-200 bg-white"><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-zinc-50 text-xs uppercase text-zinc-500"><tr><th className="px-4 py-3">Add-on</th><th className="px-4 py-3">Amount</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Created</th><th className="px-4 py-3">Actions</th></tr></thead><tbody className="divide-y divide-zinc-100">{orders.map((order) => <tr key={order.id}><td className="px-4 py-4"><p className="font-bold text-zinc-900">{order.addon_key.replaceAll("_", " ")}</p><p className="text-xs text-zinc-400">Qty {order.quantity}{order.consumed_at ? " · credit used" : ""}</p></td><td className="px-4 py-4 font-semibold">PKR {order.amount_pkr.toLocaleString("en-PK")}</td><td className="px-4 py-4"><span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-bold">{order.status}</span></td><td className="px-4 py-4 text-xs text-zinc-500">{new Date(order.created_at).toLocaleDateString()}</td><td className="px-4 py-4"><div className="flex gap-2">{order.status === "pending" && <button onClick={() => update(order.id, "paid")} className="rounded-lg bg-teal px-3 py-2 text-xs font-bold text-white">Mark paid</button>}{order.status === "paid" && <button onClick={() => update(order.id, "fulfilled")} className="rounded-lg bg-gold px-3 py-2 text-xs font-bold text-white">Fulfill</button>}{!["cancelled", "refunded"].includes(order.status) && <button onClick={() => update(order.id, "cancelled")} className="rounded-lg border border-zinc-200 px-3 py-2 text-xs font-bold text-zinc-600">Cancel</button>}</div></td></tr>)}</tbody></table></div>{orders.length === 0 && <p className="px-5 py-12 text-center text-sm text-zinc-400">No add-on orders.</p>}</section></div></main>
}
