"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import type { AddonToolConfig } from "@/lib/career-addon-tools"

type FormState = Record<AddonToolConfig["fields"][number]["key"], string>
type Result = { summary: string; score: number; sections: { title: string; items: string[] }[] }
type Artifact = { id: string; title: string; result: Result; created_at: string; updated_at: string }
type Order = { addon_key: string; quantity: number; credits_consumed?: number; status: string }

const emptyForm: FormState = { title: "", targetRole: "", targetCompany: "", jobDescription: "", sourceResume: "", profileText: "", goals: "" }
const fieldClass = "w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-teal focus:ring-2 focus:ring-teal/10"

export default function SoftwareAddonPage({ config }: { config: AddonToolConfig }) {
  const searchParams = useSearchParams()
  const workspaceKey = searchParams.get("client") || undefined
  const apiSuffix = workspaceKey ? `?workspaceKey=${encodeURIComponent(workspaceKey)}` : ""
  const appSuffix = workspaceKey ? `?client=${encodeURIComponent(workspaceKey)}` : ""
  const [form, setForm] = useState<FormState>(emptyForm)
  const [artifacts, setArtifacts] = useState<Artifact[]>([])
  const [selected, setSelected] = useState<Artifact | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState("")
  const [copied, setCopied] = useState(false)

  const credits = useMemo(() => orders
    .filter((order) => order.addon_key === config.addonKey && ["paid", "partially_consumed", "fulfilled"].includes(order.status))
    .reduce((total, order) => total + Math.max(0, order.quantity - Number(order.credits_consumed || 0)), 0), [orders, config.addonKey])

  useEffect(() => {
    let active = true
    Promise.all([
      fetch(`/api/career/addon-tools/${config.slug}${apiSuffix}`).then((response) => response.json()),
      fetch("/api/career/add-ons").then((response) => response.json()),
    ]).then(([artifactData, orderData]) => {
      if (!active) return
      const rows = artifactData.artifacts || []
      setArtifacts(rows)
      setSelected(rows[0] || null)
      setOrders(orderData.orders || [])
    }).catch(() => active && setError("This workspace could not be loaded."))
      .finally(() => active && setLoading(false))
    return () => { active = false }
  }, [apiSuffix, config.slug])

  const generate = async () => {
    setGenerating(true)
    setError("")
    const response = await fetch(`/api/career/addon-tools/${config.slug}${apiSuffix}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, workspaceKey }),
    })
    const data = await response.json().catch(() => ({}))
    if (response.ok) {
      setArtifacts((current) => [data.artifact, ...current])
      setSelected(data.artifact)
      setForm(emptyForm)
      setOrders((current) => current.map((order) => order.addon_key === config.addonKey && credits > 0
        ? { ...order, credits_consumed: Number(order.credits_consumed || 0) + 1 }
        : order))
    } else setError(data.error || "Generation failed. Your credit was not used.")
    setGenerating(false)
  }

  const copy = async () => {
    if (!selected) return
    const text = [selected.result.summary, ...selected.result.sections.flatMap((section) => [section.title, ...section.items])].join("\n\n")
    await navigator.clipboard.writeText(text)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }

  return (
    <main className="min-h-full bg-zinc-50/70 px-4 py-6 sm:px-6 lg:px-8">
      <style jsx global>{`@media print { body * { visibility: hidden !important; } #career-addon-output, #career-addon-output * { visibility: visible !important; } #career-addon-output { position: absolute; inset: 0; width: 100%; border: 0 !important; box-shadow: none !important; } @page { size: A4; margin: 1.6cm; } }`}</style>
      <div className="mx-auto max-w-7xl">
        <header className="grid overflow-hidden rounded-3xl bg-[#073f3b] text-white md:grid-cols-[1.45fr_0.55fr]">
          <div className="px-6 py-8 md:px-10 md:py-10">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-gold-700">{config.eyebrow}</p>
            <h1 className="mt-3 max-w-3xl text-3xl font-bold tracking-tight sm:text-4xl">{config.title}</h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-white/70">{config.description}</p>
          </div>
          <div className="flex items-end border-t border-white/10 bg-white/[0.04] p-6 md:border-l md:border-t-0 md:p-8">
            <div><p className="text-xs font-bold uppercase tracking-[0.14em] text-white/45">Available credits</p><p className="mt-2 text-4xl font-bold text-gold">{loading ? "..." : credits}</p><p className="mt-2 text-xs leading-5 text-white/55">One generation uses one credit.</p></div>
          </div>
        </header>

        {error ? <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,0.72fr)_minmax(0,1.28fr)]">
          <aside className="space-y-5">
            <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3"><h2 className="font-bold text-zinc-900">Create new</h2><span className="rounded-full bg-teal/10 px-2.5 py-1 text-xs font-bold text-teal">{credits} left</span></div>
              <div className="mt-5 space-y-4">
                {config.fields.map((field) => <label key={field.key} className="block"><span className="mb-2 block text-xs font-semibold text-zinc-600">{field.label}{field.required ? " *" : ""}</span>{field.multiline
                  ? <textarea className={`${fieldClass} min-h-32 resize-y`} value={form[field.key]} placeholder={field.placeholder} onChange={(event) => setForm({ ...form, [field.key]: event.target.value })} />
                  : <input className={fieldClass} value={form[field.key]} placeholder={field.placeholder} onChange={(event) => setForm({ ...form, [field.key]: event.target.value })} />}</label>)}
              </div>
              {credits > 0 ? <button onClick={generate} disabled={generating} className="mt-5 w-full rounded-xl bg-teal px-5 py-3 text-sm font-bold text-white transition active:scale-[0.98] disabled:opacity-50">{generating ? "Generating and saving..." : config.generateLabel}</button>
                : <Link href={`/career/add-ons${appSuffix}`} className="mt-5 block rounded-xl bg-gold px-5 py-3 text-center text-sm font-bold text-teal-900 transition active:scale-[0.98]">Purchase credit</Link>}
            </section>

            <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
              <div className="border-b border-zinc-100 px-5 py-4"><h2 className="text-sm font-bold text-zinc-900">Saved results</h2></div>
              {loading ? <div className="space-y-3 p-5"><div className="h-10 animate-pulse rounded-lg bg-zinc-100"/><div className="h-10 animate-pulse rounded-lg bg-zinc-100"/></div>
                : artifacts.length ? <div className="divide-y divide-zinc-100">{artifacts.map((artifact) => <button key={artifact.id} onClick={() => setSelected(artifact)} className={`w-full px-5 py-4 text-left transition ${selected?.id === artifact.id ? "bg-teal/[0.05]" : "hover:bg-zinc-50"}`}><p className="text-sm font-semibold text-zinc-900">{artifact.title}</p><p className="mt-1 text-xs text-zinc-400">{new Date(artifact.updated_at).toLocaleDateString()}</p></button>)}</div>
                  : <div className="px-5 py-10 text-center"><p className="text-sm font-semibold text-zinc-700">Nothing generated yet.</p><p className="mt-1 text-xs leading-5 text-zinc-500">Your saved software outputs will appear here.</p></div>}
            </section>
          </aside>

          <section id="career-addon-output" className="min-w-0 rounded-2xl border border-zinc-200 bg-white shadow-sm">
            {generating ? <div className="space-y-5 p-7"><div className="h-7 w-2/5 animate-pulse rounded-lg bg-zinc-100"/><div className="h-20 animate-pulse rounded-xl bg-zinc-100"/>{[1,2,3].map((item) => <div key={item} className="space-y-2 border-t border-zinc-100 pt-5"><div className="h-5 w-1/3 animate-pulse rounded bg-zinc-100"/><div className="h-4 animate-pulse rounded bg-zinc-100"/><div className="h-4 w-4/5 animate-pulse rounded bg-zinc-100"/></div>)}</div>
              : selected ? <div>
                <div className="flex flex-col gap-3 border-b border-zinc-100 px-6 py-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-teal">Saved output</p><h2 className="mt-1 text-xl font-bold text-zinc-900">{selected.title}</h2></div><div className="flex gap-2 print:hidden"><button onClick={() => window.print()} className="rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-bold text-zinc-700 transition active:scale-[0.98]">Export PDF</button><button onClick={copy} className="rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-bold text-zinc-700 transition active:scale-[0.98]">{copied ? "Copied" : "Copy all"}</button></div></div>
                <div className="p-6 md:p-8"><div className="rounded-2xl border border-teal/15 bg-teal/[0.035] p-5"><div className="flex items-start justify-between gap-5"><div><p className="text-xs font-bold uppercase tracking-[0.12em] text-teal">Summary</p><p className="mt-2 text-sm leading-6 text-zinc-700">{selected.result.summary}</p></div>{selected.result.score > 0 ? <p className="shrink-0 text-2xl font-bold text-teal">{selected.result.score}<span className="text-xs text-zinc-400">/100</span></p> : null}</div></div><div className="mt-7 divide-y divide-zinc-100 border-y border-zinc-100">{selected.result.sections.map((section) => <article key={section.title} className="grid gap-3 py-6 md:grid-cols-[0.35fr_0.65fr]"><h3 className="font-bold text-zinc-900">{section.title}</h3><ul className="space-y-3">{section.items.map((item, index) => <li key={`${section.title}-${index}`} className="flex gap-3 text-sm leading-6 text-zinc-600"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gold"/>{item}</li>)}</ul></article>)}</div></div>
              </div>
                : <div className="flex min-h-96 items-center justify-center p-8 text-center"><div><p className="text-lg font-bold text-zinc-800">Your software output will appear here.</p><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-500">Complete the inputs, use one credit, and Qalam will generate and save the full result immediately.</p></div></div>}
          </section>
        </div>
      </div>
    </main>
  )
}
