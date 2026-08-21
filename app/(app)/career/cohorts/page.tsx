"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"

type Cohort = { id: string; name: string; code: string; description: string; role: string; is_active: boolean }

export default function CohortsPage() {
  const searchParams = useSearchParams()
  const workspaceKey = searchParams.get("client") || undefined
  const [cohorts, setCohorts] = useState<Cohort[]>([])
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [code, setCode] = useState("")
  const [message, setMessage] = useState("")
  const load = () => fetch("/api/career/cohorts").then((response) => response.json()).then((data) => setCohorts(data.cohorts || [])).catch(() => undefined)
  useEffect(() => { void load() }, [])

  const submit = async (payload: Record<string, unknown>) => {
    const response = await fetch("/api/career/cohorts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
    const data = await response.json().catch(() => ({}))
    setMessage(response.ok ? "Cohort updated." : data.error || "Cohort action failed.")
    if (response.ok) void load()
  }

  return (
    <main className="min-h-full bg-zinc-50/70 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="rounded-3xl bg-[#073f3b] px-7 py-8 text-white">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-gold-700">Learning cohorts</p>
          <h1 className="mt-2 text-3xl font-bold">Turn career development into a practical module.</h1>
          <p className="mt-2 max-w-2xl text-sm text-white/70">CHRP, CHRMP, universities, and career coaches can give learners one shared workflow for LinkedIn and resumes.</p>
        </header>
        {message && <p className="mt-4 rounded-xl bg-gold/10 px-4 py-3 text-sm">{message}</p>}
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <section className="rounded-2xl border border-zinc-200 bg-white p-6">
            <h2 className="font-bold text-zinc-900">Create instructor cohort</h2>
            <input className="mt-4 w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm" placeholder="Cohort name" value={name} onChange={(event) => setName(event.target.value)} />
            <textarea className="mt-3 min-h-24 w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm" placeholder="Module description" value={description} onChange={(event) => setDescription(event.target.value)} />
            <button onClick={() => submit({ action: "create", name, description, workspaceKey })} className="mt-3 rounded-xl bg-teal px-5 py-3 text-sm font-bold text-white">Create cohort</button>
            <p className="mt-2 text-xs text-zinc-400">Instructor cohorts require Pro.</p>
          </section>
          <section className="rounded-2xl border border-zinc-200 bg-white p-6">
            <h2 className="font-bold text-zinc-900">Join learner cohort</h2>
            <input className="mt-4 w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm uppercase" placeholder="Enter cohort code" value={code} onChange={(event) => setCode(event.target.value)} />
            <button onClick={() => submit({ action: "join", code })} className="mt-3 rounded-xl bg-zinc-900 px-5 py-3 text-sm font-bold text-white">Join cohort</button>
          </section>
        </div>
        <section className="mt-5">
          <h2 className="mb-3 text-lg font-bold text-zinc-900">Your cohorts</h2>
          <div className="grid gap-3 md:grid-cols-3">
            {cohorts.map((cohort) => (
              <article key={cohort.id} className="rounded-xl border border-zinc-200 bg-white p-5">
                <div className="flex justify-between"><span className="rounded-full bg-teal/10 px-2 py-1 text-[11px] font-bold uppercase text-teal">{cohort.role}</span><span className="font-mono text-xs font-bold text-gold-700">{cohort.code}</span></div>
                <h3 className="mt-4 font-bold text-zinc-900">{cohort.name}</h3>
                <p className="mt-2 text-xs leading-5 text-zinc-500">{cohort.description}</p>
                <Link href={`/career/cohorts/${cohort.id}`} className="mt-4 inline-flex text-xs font-bold text-teal">Open progress</Link>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  )
}
