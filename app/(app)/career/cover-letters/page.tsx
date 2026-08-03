"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"

type CoverLetterListItem = {
  id: string
  title: string
  targetRole: string
  targetCompany: string
  updatedAt: string
}

const field = "w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none focus:border-teal focus:ring-2 focus:ring-teal/10"

const defaultForm = { title: "", targetRole: "", targetCompany: "", hiringManager: "", jobDescription: "", sourceResume: "" }

export default function CoverLettersPage() {
  const searchParams = useSearchParams()
  const workspaceKey = searchParams.get("client") || undefined
  const suffix = workspaceKey ? `?workspaceKey=${encodeURIComponent(workspaceKey)}` : ""
  const appSuffix = workspaceKey ? `?client=${encodeURIComponent(workspaceKey)}` : ""
  const [letters, setLetters] = useState<CoverLetterListItem[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [form, setForm] = useState(defaultForm)

  useEffect(() => {
    fetch(`/api/career/cover-letters${suffix}`)
      .then((res) => res.json())
      .then((data) => setLetters(data.coverLetters || []))
      .catch(() => setError("Cover letters could not be loaded."))
  }, [suffix])

  const generate = async () => {
    setLoading(true)
    setError("")
    const response = await fetch(`/api/career/cover-letters/generate${suffix}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, workspaceKey }),
    })
    const data = await response.json().catch(() => ({}))
    if (response.ok) {
      window.location.href = `/career/cover-letters/${data.id}${workspaceKey ? `?client=${encodeURIComponent(workspaceKey)}` : ""}`
      return
    }
    if (response.status === 402) {
      setError("No cover letter credit available. Buy the cover letter add-on, then come back here.")
    } else {
      setError(data.error || "Cover letter generation failed.")
    }
    setLoading(false)
  }

  return (
    <main className="min-h-full bg-zinc-50/70 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-col gap-4 rounded-3xl bg-[#073f3b] px-7 py-8 text-white sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-gold">Cover Letters</p>
            <h1 className="mt-2 text-3xl font-bold">Matched to the exact job description.</h1>
            <p className="mt-2 max-w-2xl text-sm text-white/70">Paste the JD, Qalam writes a targeted letter from your real experience. One credit is used per letter.</p>
          </div>
          <button onClick={() => setShowCreate((value) => !value)} className="rounded-xl bg-gold px-5 py-3 text-sm font-bold text-white">{showCreate ? "Close" : "Generate cover letter"}</button>
        </header>

        {error && (
          <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error} {error.includes("credit") && <Link href={`/career/add-ons${appSuffix}`} className="font-semibold underline">Buy a cover letter credit</Link>}
          </p>
        )}

        {showCreate && (
          <section className="mt-5 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-zinc-900">Generate from the job description</h2>
            <p className="mt-1 text-sm text-zinc-500">Uses your Career Vault plus anything you paste below. Qalam will not invent experience.</p>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <input className={field} placeholder="Letter name" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
              <input className={field} placeholder="Target role" value={form.targetRole} onChange={(event) => setForm({ ...form, targetRole: event.target.value })} />
              <input className={field} placeholder="Target company, optional" value={form.targetCompany} onChange={(event) => setForm({ ...form, targetCompany: event.target.value })} />
              <input className={field} placeholder="Hiring manager name, optional" value={form.hiringManager} onChange={(event) => setForm({ ...form, hiringManager: event.target.value })} />
              <textarea className={`${field} min-h-56 resize-y md:col-span-2`} placeholder="Paste the exact job description" value={form.jobDescription} onChange={(event) => setForm({ ...form, jobDescription: event.target.value })} />
              <textarea className={`${field} min-h-40 resize-y md:col-span-2`} placeholder="Paste your resume or background, optional if your Career Vault is filled in" value={form.sourceResume} onChange={(event) => setForm({ ...form, sourceResume: event.target.value })} />
            </div>
            <button disabled={loading} onClick={generate} className="mt-5 rounded-xl bg-teal px-5 py-3 text-sm font-bold text-white disabled:opacity-50">{loading ? "Writing your cover letter..." : "Generate cover letter"}</button>
          </section>
        )}

        <section className="mt-5">
          <div className="mb-3 flex items-center justify-between"><h2 className="text-lg font-bold text-zinc-900">Your cover letters</h2><span className="text-xs text-zinc-500">{letters.length} saved</span></div>
          {letters.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-300 bg-white px-6 py-14 text-center"><p className="font-semibold text-zinc-800">No cover letters yet.</p><p className="mt-1 text-sm text-zinc-500">Buy a credit on Career Add-ons, then generate one here.</p></div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {letters.map((letter) => (
                <Link key={letter.id} href={`/career/cover-letters/${letter.id}${workspaceKey ? `?client=${encodeURIComponent(workspaceKey)}` : ""}`} className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-teal/30 hover:shadow-md">
                  <h3 className="font-bold text-zinc-900">{letter.title}</h3>
                  <p className="mt-1 text-sm text-zinc-500">{letter.targetRole}{letter.targetCompany ? ` at ${letter.targetCompany}` : ""}</p>
                  <p className="mt-4 text-xs text-zinc-400">Updated {new Date(letter.updatedAt).toLocaleDateString()}</p>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
