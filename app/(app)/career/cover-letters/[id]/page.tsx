"use client"

import { useEffect, useState } from "react"
import { useParams, useSearchParams } from "next/navigation"

type CoverLetterDocument = {
  id: string
  title: string
  targetRole: string
  targetCompany: string
  jobDescription: string
  content: string
  status: "ready" | "archived"
}

export default function CoverLetterEditorPage() {
  const params = useParams<{ id: string }>()
  const searchParams = useSearchParams()
  const workspaceKey = searchParams.get("client") || undefined
  const suffix = workspaceKey ? `?workspaceKey=${encodeURIComponent(workspaceKey)}` : ""
  const [document, setDocument] = useState<CoverLetterDocument | null>(null)
  const [message, setMessage] = useState("")
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fetch(`/api/career/cover-letters/${params.id}${suffix}`)
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((data) => setDocument(data.coverLetter))
      .catch(() => setMessage("Cover letter could not be loaded."))
  }, [params.id, suffix])

  const save = async () => {
    if (!document) return
    setSaving(true)
    setMessage("")
    const response = await fetch(`/api/career/cover-letters/${params.id}${suffix}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: document.title, content: document.content, workspaceKey }),
    })
    const data = await response.json().catch(() => ({}))
    if (response.ok) {
      setDocument(data.coverLetter)
      setMessage("Cover letter saved.")
    } else setMessage(data.error || "Cover letter could not be saved.")
    setSaving(false)
  }

  const copy = async () => {
    if (!document) return
    await navigator.clipboard.writeText(document.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!document) return <main className="p-8 text-sm text-zinc-500">{message || "Loading cover letter..."}</main>

  return (
    <main className="min-h-full bg-zinc-100 px-4 py-5 lg:px-6">
      <style jsx global>{`
        @media print {
          body * { visibility: hidden !important; }
          #letter-print, #letter-print * { visibility: visible !important; }
          #letter-print { position: absolute; inset: 0; width: 100%; }
          @page { size: A4; margin: 2cm; }
        }
      `}</style>
      <div className="mx-auto max-w-3xl">
        <header className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-white px-5 py-4 print:hidden">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-teal">Cover letter</p>
            <input className="mt-1 min-w-72 border-0 p-0 text-xl font-bold text-zinc-900 outline-none" value={document.title} onChange={(event) => setDocument({ ...document, title: event.target.value })} />
            <p className="mt-1 text-sm text-zinc-500">{document.targetRole}{document.targetCompany ? ` at ${document.targetCompany}` : ""}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={copy} className="rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-bold text-zinc-700">{copied ? "Copied" : "Copy text"}</button>
            <button onClick={() => window.print()} className="rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-bold text-zinc-700">Export PDF</button>
            <button onClick={save} disabled={saving} className="rounded-xl bg-teal px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">{saving ? "Saving..." : "Save"}</button>
          </div>
        </header>
        {message && <p className="mb-4 rounded-xl border border-gold/20 bg-gold/10 px-4 py-3 text-sm text-zinc-700 print:hidden">{message}</p>}

        <div id="letter-print" className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
          <textarea
            className="min-h-[600px] w-full resize-y border-0 p-0 font-serif text-[15px] leading-7 text-zinc-800 outline-none print:min-h-0"
            value={document.content}
            onChange={(event) => setDocument({ ...document, content: event.target.value })}
          />
        </div>
      </div>
    </main>
  )
}
