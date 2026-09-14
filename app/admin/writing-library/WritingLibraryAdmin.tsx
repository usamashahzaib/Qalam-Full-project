"use client"

import Link from "next/link"
import { useEffect, useState, type FormEvent } from "react"

type Reference = { id: string; language: string; country: string; industry: string; split: string; reference_allowed: boolean; training_allowed: boolean; permission_expires_at: string | null }
const fields = [
  ["authorKey", "Author code", "Use the same private code for every example by this author."],
  ["source", "Source", "Original document or source reference."],
  ["permissionEvidence", "Permission record", "Where the permission is recorded and what it covers."],
  ["language", "Language", "For example: English, Urdu, Russian."],
  ["country", "Country, if supplied", "Leave blank if unknown. Do not guess."],
  ["industry", "Industry", "For example: software, recruitment, accounting."],
  ["audience", "Audience", "Who this post is written for."],
  ["purpose", "Purpose", "What the post should help the reader understand or do."],
  ["brief", "Writing brief", "The actual request that produced this post."],
  ["facts", "Supplied facts", "Only the facts available to the writer. Write none if there were no personal facts."],
  ["originalDraft", "Original draft", "The draft before the editor reviewed it."],
  ["finalText", "Editor-approved version", "The version you would be happy to publish."],
  ["editorNotes", "What changed and why", "Describe the edits that made the writing better."],
] as const

export function WritingLibraryAdmin() {
  const [references, setReferences] = useState<Reference[]>([])
  const [count, setCount] = useState(0)
  const [page, setPage] = useState(0)
  const [message, setMessage] = useState("")
  const [busy, setBusy] = useState(false)

  async function load(currentPage: number) {
    try {
      const response = await fetch(`/api/admin/writing-library?page=${currentPage}`, { cache: "no-store" })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error)
      setReferences(data.references)
      setCount(data.count)
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not load examples.") }
  }
  useEffect(() => {
    const controller = new AbortController()
    fetch(`/api/admin/writing-library?page=${page}`, { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const data = await response.json()
        if (!response.ok) throw new Error(data.error)
        if (!controller.signal.aborted) { setReferences(data.references); setCount(data.count) }
      })
      .catch((error) => { if (!controller.signal.aborted) setMessage(error instanceof Error ? error.message : "Could not load examples.") })
    return () => controller.abort()
  }, [page])

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const values = new FormData(form)
    setBusy(true)
    setMessage("")
    try {
      const payload = Object.fromEntries(fields.map(([key]) => [key, String(values.get(key) || "")]))
      const expires = String(values.get("expires") || "")
      const response = await fetch("/api/admin/writing-library", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, permissionExpiresAt: expires ? new Date(`${expires}T00:00:00Z`).toISOString() : null,
          referenceAllowed: values.has("referenceAllowed"), trainingAllowed: values.has("trainingAllowed"), reviewed: values.has("reviewed") }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error)
      form.reset()
      setMessage(`Saved to the ${data.reference.split === "test" ? "held-out test" : "training"} set. This does not start a training run.`)
      await load(page)
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not save the example.") }
    finally { setBusy(false) }
  }

  async function remove(id: string) {
    setBusy(true)
    try {
      const response = await fetch("/api/admin/writing-library", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error)
      setMessage("Removed from the library. Delete any earlier exports containing it before another training run.")
      await load(page)
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not remove the example.") }
    finally { setBusy(false) }
  }

  async function download(split: "train" | "test") {
    setBusy(true)
    try {
      const response = await fetch(`/api/admin/writing-library?export=${split}`, { cache: "no-store" })
      if (!response.ok) throw new Error((await response.json()).error)
      const url = URL.createObjectURL(await response.blob())
      const anchor = document.createElement("a")
      anchor.href = url
      anchor.download = `qalam-writing-${split}.jsonl`
      anchor.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
      setMessage("Exported only examples with current training permission. Keep the test file out of training.")
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not export examples.") }
    finally { setBusy(false) }
  }

  return <main className="mx-auto max-w-5xl px-6 py-12">
    <Link href="/admin" className="text-sm font-semibold text-teal underline">Back to admin</Link>
    <h1 className="mt-5 text-3xl font-bold text-teal">Writing library</h1>
    <p className="mt-3 max-w-3xl leading-7 text-zinc-600">Add writing you have permission to use, along with the editor&apos;s changes. Client workspaces are never imported here automatically. Authors are kept in one set so their work cannot appear in both training and testing.</p>
    <p role="status" aria-live="polite" className="my-6 text-sm font-semibold text-teal">{message}</p>
    <form onSubmit={save} className="grid gap-5 rounded-2xl border border-zinc-200 bg-white p-6 sm:grid-cols-2">
      {fields.map(([key, label, hint]) => <label key={key} className={['brief', 'facts', 'originalDraft', 'finalText', 'editorNotes', 'permissionEvidence'].includes(key) ? "sm:col-span-2" : ""}>
        <span className="text-sm font-semibold text-zinc-900">{label}</span>
        <span className="mt-1 block text-xs text-zinc-500">{hint}</span>
        <textarea name={key} required={key !== "country"} maxLength={key === "finalText" || key === "originalDraft" ? 5000 : 4000} rows={key === "finalText" || key === "originalDraft" ? 5 : 2} className="mt-2 w-full rounded-lg border border-zinc-300 p-3 text-sm" />
      </label>)}
      <label className="text-sm font-semibold">Permission expiry, if any<input type="date" name="expires" className="mt-2 block rounded-lg border border-zinc-300 p-3" /></label>
      <div className="space-y-3 text-sm sm:col-span-2">
        <label className="flex gap-3"><input type="checkbox" name="referenceAllowed" />Permission covers using this writing as a shared reference during generation.</label>
        <label className="flex gap-3"><input type="checkbox" name="trainingAllowed" />Permission separately covers model training and evaluation.</label>
        <label className="flex gap-3"><input type="checkbox" name="reviewed" required />I reviewed the writing, source, supplied facts, and permission. I checked for copied material and unsupported claims.</label>
      </div>
      <button disabled={busy} className="rounded-lg bg-teal px-5 py-3 font-semibold text-white disabled:opacity-50">{busy ? "Working..." : "Save reviewed example"}</button>
    </form>
    <section className="mt-10">
      <h2 className="text-xl font-bold">{count} saved examples</h2>
      <div className="my-4 flex flex-wrap gap-3">
        <button disabled={busy} onClick={() => download("train")} className="rounded-lg border px-4 py-3 text-sm">Export training examples</button>
        <button disabled={busy} onClick={() => download("test")} className="rounded-lg border px-4 py-3 text-sm">Export held-out tests</button>
      </div>
      <p className="mb-4 text-sm text-zinc-600">Saving examples does not train a model. Exports contain only current permissions. Reference selection also excludes the test set.</p>
      <ul className="divide-y divide-zinc-200">{references.map((row) => <li key={row.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
        <div><p className="font-semibold">{row.industry} · {row.language}{row.country ? ` · ${row.country}` : ""}</p>
          <p className="text-sm text-zinc-500">{row.split} · Reference: {row.reference_allowed ? "yes" : "no"} · Training: {row.training_allowed ? "yes" : "no"}</p></div>
        <button disabled={busy} onClick={() => remove(row.id)} className="rounded-lg border px-4 py-2 text-sm text-red-700">Remove example</button>
      </li>)}</ul>
      <div className="mt-4 flex gap-4"><button disabled={page === 0 || busy} onClick={() => setPage(page - 1)}>Previous</button><span>Page {page + 1}</span><button disabled={(page + 1) * 50 >= count || busy} onClick={() => setPage(page + 1)}>Next</button></div>
    </section>
  </main>
}
