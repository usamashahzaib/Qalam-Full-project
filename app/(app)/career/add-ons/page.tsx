"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { CAREER_ADD_ONS, CAREER_PACKS, CAREER_PRODUCTS, getCareerProduct } from "@/lib/career-pricing"
import { isCareerProductSelfServe } from "@/lib/career-checkout"

type Order = {
  id: string
  addon_key: string
  product_key?: string
  amount_pkr: number
  quantity: number
  credits_consumed?: number
  status: string
  source_type?: string
  eligible_addons?: string[]
  expires_at?: string | null
  created_at?: string
}

type MarketplaceData = {
  orders?: Order[]
  creditOrders?: Order[]
  plan?: string
  billingCycle?: string
}

const money = (value: number) => `PKR ${value.toLocaleString("en-PK")}`

export default function CareerAddOnsPage() {
  const searchParams = useSearchParams()
  const workspaceKey = searchParams.get("client") || undefined
  const checkoutReturned = searchParams.get("checkout") === "success"
  const suffix = workspaceKey ? `?client=${encodeURIComponent(workspaceKey)}` : ""
  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const [orders, setOrders] = useState<Order[]>([])
  const [creditOrders, setCreditOrders] = useState<Order[]>([])
  const [plan, setPlan] = useState("Free")
  const [billingCycle, setBillingCycle] = useState("monthly")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)
  const [payingKey, setPayingKey] = useState<string | null>(null)
  const checkoutReady = CAREER_PRODUCTS.every((item) => isCareerProductSelfServe(item.key))

  const loadOrders = useCallback(async () => {
    const response = await fetch("/api/career/add-ons", { cache: "no-store" })
    if (!response.ok) throw new Error("Purchase history could not be loaded.")
    const data = await response.json() as MarketplaceData
    setOrders(data.orders || [])
    setCreditOrders(data.creditOrders || [])
    setPlan(data.plan || "Free")
    setBillingCycle(data.billingCycle || "monthly")
  }, [])

  useEffect(() => {
    let active = true
    const run = async () => {
      try {
        await loadOrders()
        if (checkoutReturned) {
          for (let attempt = 0; attempt < 4 && active; attempt += 1) {
            await new Promise((resolve) => setTimeout(resolve, 1800))
            await loadOrders()
          }
        }
      } catch (loadError) {
        if (active) setError((loadError as Error).message)
      } finally {
        if (active) setLoading(false)
      }
    }
    void run()
    return () => { active = false }
  }, [checkoutReturned, loadOrders])

  const activeCredits = useMemo(() => creditOrders.filter((order) =>
    ["paid", "partially_consumed", "fulfilled"].includes(order.status)
  ), [creditOrders])

  const planCredits = activeCredits
    .filter((order) => order.addon_key === "career_credit")
    .reduce((total, order) => total + Math.max(0, order.quantity - Number(order.credits_consumed || 0)), 0)

  const purchasedCredits = (key: string) => activeCredits
    .filter((order) => order.addon_key === key)
    .reduce((total, order) => total + Math.max(0, order.quantity - Number(order.credits_consumed || 0)), 0)

  const purchase = async (key: string) => {
    const product = getCareerProduct(key)
    if (!product) return
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
      if (!orderResponse.ok || !order) throw new Error(orderData.error || "The order could not be created.")

      const checkoutResponse = await fetch("/api/career/add-ons/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order.id }),
      })
      const checkoutData = await checkoutResponse.json().catch(() => ({}))
      if (!checkoutResponse.ok || !checkoutData.url) {
        throw new Error(checkoutData.error || "Card checkout could not be opened. No payment was taken.")
      }
      window.location.assign(checkoutData.url)
    } catch (purchaseError) {
      setError((purchaseError as Error).message)
      setPayingKey(null)
    }
  }

  return (
    <main className="min-h-full bg-[#f6f7f4] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="overflow-hidden rounded-[2rem] bg-[#073f3b] text-white">
          <div className="grid md:grid-cols-[1.35fr_0.65fr]">
            <div className="px-7 py-9 md:px-10 md:py-12">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-gold">Career commerce</p>
              <h1 className="mt-3 max-w-2xl text-3xl font-bold tracking-tight sm:text-5xl">Buy the outcome your next move needs.</h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-white/70">Every purchase becomes verified in-app credits. Generate, edit, and save the work inside Qalam.</p>
            </div>
            <div className="border-t border-white/10 bg-white/[0.045] px-7 py-8 md:border-l md:border-t-0 md:px-8 md:py-12">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/50">{plan} plan</p>
              <p className="mt-2 text-4xl font-bold text-gold">{loading ? "..." : planCredits}</p>
              <p className="mt-1 text-sm text-white/70">career credits available</p>
              <p className="mt-5 text-xs leading-5 text-white/50">Billing cycle: {billingCycle}. Purchased credits do not expire. Plan credits expire with the paid period.</p>
            </div>
          </div>
        </header>

        {checkoutReturned ? <p className="mt-4 rounded-xl border border-teal/20 bg-teal/5 px-4 py-3 text-sm font-medium text-teal">Payment returned successfully. Credits are being confirmed from the signed payment webhook.</p> : null}
        {error ? <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}

        <section className="mt-10">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-gold">Outcome packs</p>
              <h2 className="mt-2 text-3xl font-bold text-zinc-900">One checkout. A complete workflow.</h2>
            </div>
            <p className="max-w-md text-sm leading-6 text-zinc-500">Job-Win is the recommended path for one high-priority application. Every included tool unlocks separately.</p>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
            {CAREER_PACKS.map((pack) => {
              const featured = "featured" in pack && pack.featured
              return <article key={pack.key} className={featured ? "row-span-3 rounded-3xl bg-zinc-900 p-7 text-white lg:p-9" : "border-t border-zinc-300 py-5 lg:px-2"}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="max-w-xl">
                    {featured ? <span className="rounded-full bg-gold px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white">Recommended</span> : null}
                    <h3 className={`font-bold ${featured ? "mt-5 text-3xl" : "text-xl text-zinc-900"}`}>{pack.name}</h3>
                    <p className={`mt-2 text-sm leading-6 ${featured ? "text-white/65" : "text-zinc-500"}`}>{pack.description}</p>
                  </div>
                  <div className={featured ? "text-left sm:text-right" : "text-right"}>
                    <p className={`text-xs line-through ${featured ? "text-white/40" : "text-zinc-400"}`}>{money(pack.originalPrice)}</p>
                    <p className={`mt-1 text-xl font-bold ${featured ? "text-gold" : "text-teal"}`}>{money(pack.price)}</p>
                  </div>
                </div>
                {featured ? <div className="mt-8 grid gap-3 border-y border-white/10 py-6 sm:grid-cols-2">{pack.items.map((key) => <span key={key} className="text-sm text-white/75">{getCareerProduct(key)?.name}</span>)}</div> : null}
                <button onClick={() => purchase(pack.key)} disabled={!checkoutReady || payingKey === pack.key} className={`mt-6 min-h-12 rounded-xl px-6 text-sm font-bold transition active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-zinc-200 disabled:text-zinc-500 ${featured ? "bg-gold text-white" : "bg-teal text-white"}`}>
                  {!checkoutReady ? "Checkout setup pending" : payingKey === pack.key ? "Opening secure checkout..." : `Buy ${pack.name}`}
                </button>
              </article>
            })}
          </div>
        </section>

        <section className="mt-14 border-t border-zinc-300 pt-10">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-teal">Individual tools</p>
            <h2 className="mt-2 text-3xl font-bold text-zinc-900">Add only what you need.</h2>
            <p className="mt-3 text-sm leading-6 text-zinc-500">Plan credits are used first when eligible. Purchased tool credits remain available until used.</p>
          </div>

          <div className="mt-6 divide-y divide-zinc-200 border-y border-zinc-200">
            {CAREER_ADD_ONS.map((item, index) => {
              const quantity = quantities[item.key] || 1
              const specificCredits = purchasedCredits(item.key)
              return <article key={item.key} className="grid gap-5 py-6 md:grid-cols-[2rem_minmax(0,1fr)_auto] md:items-center">
                <span className="text-xs font-bold text-zinc-300">{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-bold text-zinc-900">{item.name}</h3>
                    <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-[10px] font-bold uppercase text-zinc-600">{item.creditCost} plan {item.creditCost === 1 ? "credit" : "credits"}</span>
                    {specificCredits > 0 ? <span className="rounded-full bg-teal/10 px-2.5 py-1 text-[10px] font-bold uppercase text-teal">{specificCredits} purchased</span> : null}
                  </div>
                  <p className="mt-1 text-sm font-semibold text-teal">{money(item.price)} per {item.unit}</p>
                  <Link href={`${item.route}${suffix}`} className="mt-2 inline-flex text-xs font-bold text-zinc-500 underline decoration-zinc-300 underline-offset-4">Open tool</Link>
                </div>
                <div className="flex flex-wrap items-center gap-3 md:justify-end">
                  <div className="flex items-center rounded-xl border border-zinc-200 bg-white">
                    <button aria-label={`Decrease ${item.name} quantity`} onClick={() => setQuantities({ ...quantities, [item.key]: Math.max(1, quantity - 1) })} className="h-11 w-11 text-lg text-zinc-600">-</button>
                    <span className="w-9 text-center text-sm font-bold text-zinc-900">{quantity}</span>
                    <button aria-label={`Increase ${item.name} quantity`} onClick={() => setQuantities({ ...quantities, [item.key]: Math.min(20, quantity + 1) })} className="h-11 w-11 text-lg text-zinc-600">+</button>
                  </div>
                  <button onClick={() => purchase(item.key)} disabled={!checkoutReady || payingKey === item.key} className="min-h-11 min-w-40 rounded-xl bg-teal px-5 text-sm font-bold text-white transition active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-zinc-200 disabled:text-zinc-500">
                    {!checkoutReady ? "Setup pending" : payingKey === item.key ? "Opening..." : `Buy ${money(item.price * quantity)}`}
                  </button>
                </div>
              </article>
            })}
          </div>
        </section>

        <section className="mt-10 rounded-2xl bg-white px-6 py-7 shadow-[0_1px_0_rgba(9,43,40,0.08)]">
          <div className="flex items-center justify-between gap-4">
            <div><p className="text-xs font-bold uppercase tracking-[0.14em] text-zinc-400">Order history</p><h2 className="mt-1 font-bold text-zinc-900">Payments and plan grants</h2></div>
            <span className="text-xs text-zinc-400">{orders.length} records</span>
          </div>
          {loading ? <div className="mt-5 h-12 animate-pulse rounded-xl bg-zinc-100" /> : orders.length ? <div className="mt-5 divide-y divide-zinc-100 border-y border-zinc-100">{orders.map((order) => { const product = getCareerProduct(order.product_key || order.addon_key); return <div key={order.id} className="flex flex-col gap-2 py-4 text-sm sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold text-zinc-800">{product?.name || (order.source_type === "plan_credit" ? `${plan} plan credits` : order.addon_key.replaceAll("_", " "))}{order.quantity > 1 ? ` x${order.quantity}` : ""}</p><p className="mt-1 text-xs text-zinc-400">{order.amount_pkr > 0 ? money(order.amount_pkr) : "Included with plan"} · {Number(order.credits_consumed || 0)} used</p></div><span className="w-fit rounded-full bg-zinc-100 px-2.5 py-1 text-[10px] font-bold uppercase text-zinc-600">{order.status.replaceAll("_", " ")}</span></div>})}</div> : <p className="mt-5 text-sm text-zinc-500">No purchases or plan credits yet.</p>}
        </section>
      </div>
    </main>
  )
}
