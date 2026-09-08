"use client"

import Link from "next/link"
import { useCallback, useState } from "react"

type ReviewPost = { id: string; title: string | null; content: string | null; scheduled_for: string | null; updated_at: string }

export function PublishReviewsClient() {
  const [adminKey, setAdminKey] = useState("")
  const [posts, setPosts] = useState<ReviewPost[]>([])
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [urns, setUrns] = useState<Record<string, string>>({})
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const response = await fetch("/api/admin/publish-reviews", { headers: { "x-admin-key": adminKey } })
    const data = await response.json().catch(() => ({}))
    setPosts(response.ok && Array.isArray(data.posts) ? data.posts : [])
    setMessage(response.ok ? "" : "Could not open the review queue.")
    setLoading(false)
  }, [adminKey])

  const resolve = async (postId: string, resolution: "published" | "not_published") => {
    const response = await fetch("/api/admin/publish-reviews", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-admin-key": adminKey },
      body: JSON.stringify({ postId, resolution, postUrn: urns[postId] || null, note: notes[postId] || "" }),
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      setMessage(data.error === "review_note_required" ? "Add a short verification note first." : "The review could not be saved.")
      return
    }
    setMessage("Publish outcome recorded.")
    await load()
  }

  return <main className="min-h-screen bg-zinc-50 px-4 py-8 text-zinc-900 lg:px-8">
    <div className="mx-auto max-w-5xl">
      <Link href="/admin" className="text-sm font-semibold text-teal">Back to Admin</Link>
      <h1 className="mt-4 text-2xl font-bold">LinkedIn publish reviews</h1>
      <p className="mt-2 max-w-2xl text-sm text-zinc-600">Verify each post on LinkedIn before resolving it. Never mark “not published” from a missing log alone.</p>
      <div className="mt-6 flex max-w-xl gap-2">
        <label htmlFor="publish-review-admin-key" className="sr-only">Admin key</label>
        <input id="publish-review-admin-key" type="password" value={adminKey} onChange={(event) => setAdminKey(event.target.value)} className="min-h-11 flex-1 rounded-lg border border-zinc-300 px-3" placeholder="Admin key" />
        <button onClick={() => void load()} disabled={!adminKey || loading} className="min-h-11 rounded-lg bg-teal px-4 font-semibold text-white disabled:opacity-50">{loading ? "Loading..." : "Load queue"}</button>
      </div>
      {message && <p role="status" className="mt-4 rounded-lg bg-white px-4 py-3 text-sm">{message}</p>}
      <div className="mt-6 space-y-4">
        {posts.map((post) => <article key={post.id} className="rounded-2xl border border-zinc-200 bg-white p-5">
          <h2 className="font-bold">{post.title || "Untitled post"}</h2>
          <p className="mt-1 text-xs text-zinc-500">Claimed {new Date(post.updated_at).toLocaleString()}</p>
          <pre className="mt-4 max-h-48 overflow-auto whitespace-pre-wrap rounded-lg bg-zinc-50 p-3 text-sm">{post.content || "No content"}</pre>
          <label className="mt-4 block text-sm font-semibold" htmlFor={`note-${post.id}`}>Verification note</label>
          <textarea id={`note-${post.id}`} value={notes[post.id] || ""} onChange={(event) => setNotes((current) => ({ ...current, [post.id]: event.target.value }))} className="mt-1 min-h-20 w-full rounded-lg border border-zinc-300 p-3" placeholder="Where and how you checked the LinkedIn account" />
          <label className="mt-3 block text-sm font-semibold" htmlFor={`urn-${post.id}`}>LinkedIn post URN, if published</label>
          <input id={`urn-${post.id}`} value={urns[post.id] || ""} onChange={(event) => setUrns((current) => ({ ...current, [post.id]: event.target.value }))} className="mt-1 min-h-11 w-full rounded-lg border border-zinc-300 px-3" />
          <div className="mt-4 flex flex-wrap gap-2">
            <button onClick={() => void resolve(post.id, "published")} className="min-h-11 rounded-lg bg-emerald-700 px-4 font-semibold text-white">Verified published</button>
            <button onClick={() => void resolve(post.id, "not_published")} className="min-h-11 rounded-lg bg-red-700 px-4 font-semibold text-white">Verified not published</button>
          </div>
        </article>)}
        {!loading && posts.length === 0 && <p className="rounded-2xl border border-zinc-200 bg-white p-8 text-center text-sm text-zinc-500">No unresolved publish outcomes.</p>}
      </div>
    </div>
  </main>
}
