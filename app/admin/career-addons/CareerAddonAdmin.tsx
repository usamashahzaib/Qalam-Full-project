"use client"

import { useEffect, useState } from "react"

type Order = {
  id: string
  addon_key: string
  product_key: string
  source_type: string
  parent_order_id: string | null
  amount_pkr: number
  quantity: number
  credits_consumed: number
  status: string
  payment_provider: string | null
  provider_reference: string | null
  expires_at: string | null
  consumed_at: string | null
  created_at: string
}

export function CareerAddonAdmin() {
  const [orders, setOrders] = useState<Order[]>([])
  const [message, setMessage] = useState("")
  useEffect(() => {
    fetch("/api/admin/career-addons")
      .then((response) => response.json())
      .then((data) => setOrders(data.orders || []))
      .catch(() => setMessage("Orders could not be loaded."))
  }, [])

  return <main className="min-h-screen bg-zinc-50 px-4 py-8 lg:px-8"><div className="mx-auto max-w-6xl"><header><p className="text-xs font-bold uppercase tracking-[0.14em] text-teal">Admin</p><h1 className="mt-1 text-2xl font-bold text-zinc-900">Career commerce</h1><p className="mt-2 text-sm text-zinc-500">Read-only payment, pack, and plan-credit diagnostics. Fulfillment is automatic.</p></header>{message && <p className="mt-4 rounded-xl bg-gold/10 px-4 py-3 text-sm">{message}</p>}<section className="mt-6 overflow-hidden rounded-2xl border border-zinc-200 bg-white"><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-zinc-50 text-xs uppercase text-zinc-500"><tr><th className="px-4 py-3">Product</th><th className="px-4 py-3">Source</th><th className="px-4 py-3">Amount</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Created</th><th className="px-4 py-3">Provider</th></tr></thead><tbody className="divide-y divide-zinc-100">{orders.map((order) => <tr key={order.id}><td className="px-4 py-4"><p className="font-bold text-zinc-900">{(order.product_key || order.addon_key).replaceAll("_", " ")}</p><p className="text-xs text-zinc-400">{order.credits_consumed}/{order.quantity} used{order.expires_at ? ` · expires ${new Date(order.expires_at).toLocaleDateString()}` : ""}</p></td><td className="px-4 py-4 text-xs text-zinc-500">{order.source_type.replaceAll("_", " ")}{order.parent_order_id ? " · child credit" : ""}</td><td className="px-4 py-4 font-semibold">PKR {order.amount_pkr.toLocaleString("en-PK")}</td><td className="px-4 py-4"><span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-bold">{order.status}</span></td><td className="px-4 py-4 text-xs text-zinc-500">{new Date(order.created_at).toLocaleDateString()}</td><td className="px-4 py-4 text-xs text-zinc-500">{order.payment_provider || "Internal"}</td></tr>)}</tbody></table></div>{orders.length === 0 && <p className="px-5 py-12 text-center text-sm text-zinc-400">No career commerce records.</p>}</section></div></main>
}
