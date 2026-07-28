"use client"

import { useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { CAREER_ADD_ONS } from "@/lib/career-pricing"
import { UPGRADES_EMAIL } from "@/lib/contact"

export default function CareerAddOnsPage() {
  const searchParams = useSearchParams()
  const workspaceKey = searchParams.get("client") || undefined
  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const [message, setMessage] = useState("")
  const total = useMemo(() => CAREER_ADD_ONS.reduce((sum, item) => sum + item.price * (quantities[item.key] || 0), 0), [quantities])
  const order = async () => {
    const items = CAREER_ADD_ONS.filter((item) => quantities[item.key]).map((item) => ({ key: item.key, quantity: quantities[item.key] }))
    const response = await fetch("/api/career/add-ons", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ workspaceKey, items }) })
    const data = await response.json().catch(() => ({}))
    setMessage(response.ok ? `Order created for PKR ${data.total.toLocaleString("en-PK")}. Send payment proof to ${UPGRADES_EMAIL}.` : data.error || "Order could not be created.")
  }
  return <main className="min-h-full bg-zinc-50/70 px-4 py-6 sm:px-6 lg:px-8"><div className="mx-auto max-w-5xl"><header className="rounded-3xl bg-[#073f3b] px-7 py-8 text-white"><p className="text-xs font-bold uppercase tracking-[0.16em] text-gold">Career add-ons</p><h1 className="mt-2 text-3xl font-bold">Buy only the extra work you need.</h1><p className="mt-2 text-sm text-white/70">No oversized package. Add quantities and see the total immediately.</p></header>{message && <p className="mt-4 rounded-xl bg-gold/10 px-4 py-3 text-sm text-zinc-700">{message}</p>}<section className="mt-5 overflow-hidden rounded-2xl border border-zinc-200 bg-white"><div className="divide-y divide-zinc-100">{CAREER_ADD_ONS.map((item) => <div key={item.key} className="flex items-center justify-between gap-4 p-5"><div><h2 className="font-bold text-zinc-900">{item.name}</h2><p className="mt-1 text-sm font-semibold text-teal">PKR {item.price.toLocaleString("en-PK")}</p></div><div className="flex items-center gap-2"><button onClick={() => setQuantities({ ...quantities, [item.key]: Math.max(0, (quantities[item.key] || 0) - 1) })} className="h-9 w-9 rounded-lg border border-zinc-200 text-lg">-</button><span className="w-8 text-center font-bold">{quantities[item.key] || 0}</span><button onClick={() => setQuantities({ ...quantities, [item.key]: Math.min(20, (quantities[item.key] || 0) + 1) })} className="h-9 w-9 rounded-lg border border-zinc-200 text-lg">+</button></div></div>)}</div><div className="flex flex-col items-center justify-between gap-4 bg-zinc-50 p-5 sm:flex-row"><div><p className="text-xs font-bold uppercase text-zinc-400">Total</p><p className="text-2xl font-bold text-zinc-900">PKR {total.toLocaleString("en-PK")}</p></div><button disabled={!total} onClick={order} className="rounded-xl bg-teal px-6 py-3 text-sm font-bold text-white disabled:opacity-40">Create add-on order</button></div></section></div></main>
}
