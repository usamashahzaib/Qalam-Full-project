"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { CAREER_ADD_ONS } from "@/lib/career-pricing"

type Order = {
  id: string
  addon_key: string
  amount_pkr: number
  quantity: number
  credits_consumed?: number
  status: string
  created_at?: string
}

export default function CareerAddOnsPage() {
  const searchParams = useSearchParams()
  const workspaceKey = searchParams.get("client") || undefined
  const suffix = workspaceKey ? `?client=${encodeURIComponent(workspaceKey)}` : ""
  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const [orders, setOrders] = useState<Order[]>([])
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)
  const [payingKey, setPayingKey] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/career/add-ons")
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((data) => setOrders(data.orders || []))
      .catch(() => setError("Purchase history could not be loaded."))
      .finally(() => setLoading(false))
  }, [])

  const availableCredits = (key: string) => orders
    .filter((order) => order.addon_key === key && ["paid", "partially_consumed", "fulfilled"].includes(order.status))
    .reduce((total, order) => total + Math.max(0, order.quantity - Number(order.credits_consumed || 0)), 0)

  const purchase = async (key: string) => {
    const quantity = quantities[key] || 1
    setError("")
    setPayingKey(key)
    try {
      const orderResponse = await fetch("/api/career/add-ons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceKey, items: [{ key, quantity }] }),
      })
      const orderData = await orderResponse.json().catch(() => ({}))
      const order = orderData.orders?.[0] as Order | undefined
      if (!orderResponse.ok || !order) {
        setError(orderData.error || "The order could not be created.")
        return
      }
      const checkoutResponse = await fetch("/api/career/add-ons/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order.id }),
      })
      const checkoutData = await checkoutResponse.json().catch(() => ({}))
      if (!checkoutResponse.ok || !checkoutData.url) {
        setError(checkoutResponse.status === 503
          ? "Card checkout is not configured for this product yet. No payment was taken."
          : checkoutData.error || "Checkout could not be opened.")
        return
      }
      window.location.href = checkoutData.url
    } finally {
      setPayingKey(null)
    }
  }

  return (
    <main className="min-h-full bg-zinc-50/70 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="grid overflow-hidden rounded-3xl bg-[#073f3b] text-white md:grid-cols-[1.45fr_0.55fr]">
          <div className="px-7 py-8 md:px-10 md:py-10"><p className="text-xs font-bold uppercase tracking-[0.16em] text-gold">Career add-ons</p><h1 className="mt-3 max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">Purchase a credit. Generate the result inside Qalam.</h1><p className="mt-4 max-w-2xl text-sm leading-6 text-white/70">Every product is software-delivered. No calls, emailed files, payment proof, or later fulfillment.</p></div>
          <div className="flex items-end border-t border-white/10 bg-white/[0.04] p-7 md:border-l md:border-t-0"><p className="text-sm leading-6 text-white/65">Select quantity, pay by card, then open the tool. Paid credits appear automatically after the webhook confirms payment.</p></div>
        </header>

        {error ? <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}

        <section className="mt-6 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <div className="divide-y divide-zinc-100">
            {CAREER_ADD_ONS.map((item, index) => {
              const quantity = quantities[item.key] || 1
              const credits = availableCredits(item.key)
              return <article key={item.key} className="grid gap-5 p-5 md:grid-cols-[2rem_minmax(0,1fr)_auto] md:items-center md:p-6">
                <span className="text-xs font-bold text-zinc-300">0{index + 1}</span>
                <div><div className="flex flex-wrap items-center gap-2"><h2 className="font-bold text-zinc-900">{item.name}</h2>{credits > 0 ? <span className="rounded-full bg-teal/10 px-2.5 py-1 text-[10px] font-bold uppercase text-teal">{credits} available</span> : null}</div><p className="mt-1 text-sm font-semibold text-teal">PKR {item.price.toLocaleString("en-PK")} per {item.unit}</p><Link href={`${item.route}${suffix}`} className="mt-2 inline-flex text-xs font-bold text-zinc-500 underline decoration-zinc-300 underline-offset-4">Open software tool</Link></div>
                <div className="flex flex-wrap items-center gap-3 md:justify-end">
                  <div className="flex items-center rounded-xl border border-zinc-200"><button aria-label={`Decrease ${item.name} quantity`} onClick={() => setQuantities({ ...quantities, [item.key]: Math.max(1, quantity - 1) })} className="h-11 w-11 text-lg text-zinc-600 active:scale-[0.96]">-</button><span className="w-9 text-center text-sm font-bold text-zinc-900">{quantity}</span><button aria-label={`Increase ${item.name} quantity`} onClick={() => setQuantities({ ...quantities, [item.key]: Math.min(20, quantity + 1) })} className="h-11 w-11 text-lg text-zinc-600 active:scale-[0.96]">+</button></div>
                  <button onClick={() => purchase(item.key)} disabled={payingKey === item.key} className="min-w-36 rounded-xl bg-gold px-5 py-3 text-sm font-bold text-white transition active:scale-[0.98] disabled:opacity-50">{payingKey === item.key ? "Opening checkout..." : `Purchase PKR ${(item.price * quantity).toLocaleString("en-PK")}`}</button>
                </div>
              </article>
            })}
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-zinc-200 bg-white p-6">
          <div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-zinc-400">Order history</p><h2 className="mt-1 font-bold text-zinc-900">Credits and purchases</h2></div><span className="text-xs text-zinc-400">{orders.length} orders</span></div>
          {loading ? <div className="mt-5 h-12 animate-pulse rounded-xl bg-zinc-100" /> : orders.length ? <div className="mt-5 divide-y divide-zinc-100 border-y border-zinc-100">{orders.map((order) => { const product = CAREER_ADD_ONS.find((item) => item.key === order.addon_key); return <div key={order.id} className="flex flex-col gap-2 py-4 text-sm sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold text-zinc-800">{product?.name || order.addon_key} x{order.quantity}</p><p className="mt-1 text-xs text-zinc-400">PKR {order.amount_pkr.toLocaleString("en-PK")} · {Number(order.credits_consumed || 0)} used</p></div><span className="w-fit rounded-full bg-zinc-100 px-2.5 py-1 text-[10px] font-bold uppercase text-zinc-600">{order.status.replaceAll("_", " ")}</span></div>})}</div> : <p className="mt-5 text-sm text-zinc-500">No purchases yet.</p>}
        </section>
      </div>
    </main>
  )
}
