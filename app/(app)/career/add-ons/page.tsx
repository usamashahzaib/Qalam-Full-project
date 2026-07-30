"use client"

import { useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { CAREER_ADD_ONS } from "@/lib/career-pricing"
import { UPGRADES_EMAIL } from "@/lib/contact"

type CreatedOrder = {
  id: string
  addon_key: string
  amount_pkr: number
  quantity: number
  status: string
}

export default function CareerAddOnsPage() {
  const searchParams = useSearchParams()
  const workspaceKey = searchParams.get("client") || undefined
  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const [orders, setOrders] = useState<CreatedOrder[]>([])
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [payingId, setPayingId] = useState<string | null>(null)
  const [manualFallback, setManualFallback] = useState<Record<string, boolean>>({})

  const total = useMemo(
    () => CAREER_ADD_ONS.reduce((sum, item) => sum + item.price * (quantities[item.key] || 0), 0),
    [quantities]
  )

  const createOrders = async () => {
    const items = CAREER_ADD_ONS.filter((item) => quantities[item.key]).map((item) => ({ key: item.key, quantity: quantities[item.key] }))
    if (!items.length) return
    setError(null)
    setCreating(true)
    try {
      const response = await fetch("/api/career/add-ons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceKey, items }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        setError(data.error || "Order could not be created.")
        return
      }
      setOrders((prev) => [...(data.orders as CreatedOrder[] || []), ...prev])
      setQuantities({})
    } finally {
      setCreating(false)
    }
  }

  const payNow = async (order: CreatedOrder) => {
    setError(null)
    setPayingId(order.id)
    try {
      const response = await fetch("/api/career/add-ons/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order.id }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        if (response.status === 503) {
          setManualFallback((prev) => ({ ...prev, [order.id]: true }))
        } else {
          setError(data.error || "Could not start checkout.")
        }
        return
      }
      window.location.href = data.url
    } finally {
      setPayingId(null)
    }
  }

  return (
    <main className="min-h-full bg-zinc-50/70 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="rounded-3xl bg-[#073f3b] px-7 py-8 text-white">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-gold">Career add-ons</p>
          <h1 className="mt-2 text-3xl font-bold">Buy only the extra work you need.</h1>
          <p className="mt-2 text-sm text-white/70">No oversized package. Add quantities, pay by card, done.</p>
        </header>

        {error ? <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}

        <section className="mt-5 overflow-hidden rounded-2xl border border-zinc-200 bg-white">
          <div className="divide-y divide-zinc-100">
            {CAREER_ADD_ONS.map((item) => (
              <div key={item.key} className="flex items-center justify-between gap-4 p-5">
                <div>
                  <h2 className="font-bold text-zinc-900">{item.name}</h2>
                  <p className="mt-1 text-sm font-semibold text-teal">PKR {item.price.toLocaleString("en-PK")}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setQuantities({ ...quantities, [item.key]: Math.max(0, (quantities[item.key] || 0) - 1) })}
                    className="h-9 w-9 rounded-lg border border-zinc-200 text-lg"
                  >
                    -
                  </button>
                  <span className="w-8 text-center font-bold">{quantities[item.key] || 0}</span>
                  <button
                    onClick={() => setQuantities({ ...quantities, [item.key]: Math.min(20, (quantities[item.key] || 0) + 1) })}
                    className="h-9 w-9 rounded-lg border border-zinc-200 text-lg"
                  >
                    +
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="flex flex-col items-center justify-between gap-4 bg-zinc-50 p-5 sm:flex-row">
            <div>
              <p className="text-xs font-bold uppercase text-zinc-400">Total</p>
              <p className="text-2xl font-bold text-zinc-900">PKR {total.toLocaleString("en-PK")}</p>
            </div>
            <button
              disabled={!total || creating}
              onClick={createOrders}
              className="rounded-xl bg-teal px-6 py-3 text-sm font-bold text-white disabled:opacity-40"
            >
              {creating ? "Creating order..." : "Create order"}
            </button>
          </div>
        </section>

        {orders.length > 0 ? (
          <section className="mt-6 overflow-hidden rounded-2xl border border-zinc-200 bg-white">
            <div className="border-b border-zinc-100 p-5">
              <h2 className="font-bold text-zinc-900">Awaiting payment</h2>
            </div>
            <div className="divide-y divide-zinc-100">
              {orders.map((order) => {
                const addon = CAREER_ADD_ONS.find((a) => a.key === order.addon_key)
                return (
                  <div key={order.id} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-semibold text-zinc-900">
                        {addon?.name || order.addon_key} &times;{order.quantity}
                      </p>
                      <p className="text-sm text-zinc-500">PKR {order.amount_pkr.toLocaleString("en-PK")}</p>
                    </div>
                    {manualFallback[order.id] ? (
                      <p className="max-w-sm text-sm leading-relaxed text-zinc-600">
                        Card checkout isn&apos;t set up for this add-on yet. Send payment via JazzCash, Easypaisa, or bank transfer and email
                        proof to{" "}
                        <a href={`mailto:${UPGRADES_EMAIL}`} className="font-semibold text-teal underline">
                          {UPGRADES_EMAIL}
                        </a>
                        .
                      </p>
                    ) : (
                      <button
                        onClick={() => payNow(order)}
                        disabled={payingId === order.id}
                        className="rounded-xl bg-gold px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50"
                      >
                        {payingId === order.id ? "Opening checkout..." : "Pay with card"}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </section>
        ) : null}
      </div>
    </main>
  )
}
