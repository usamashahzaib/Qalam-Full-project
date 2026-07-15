"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"

type LedgerEntry = {
  id: string
  name: string
  engaged_date: string
  reciprocate_by: string
}

export function EngagementLedger() {
  const [entries, setEntries] = useState<LedgerEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState("")
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [reciprocateBy, setReciprocateBy] = useState("")

  useEffect(() => {
    fetch("/api/silent-growth/ledger")
      .then((res) => res.json())
      .then((data) => setEntries(Array.isArray(data.entries) ? data.entries : []))
      .catch(() => setError("Could not load your ledger. Please refresh."))
      .finally(() => setLoading(false))
  }, [])

  const handleAdd = async () => {
    const trimmedName = name.trim()
    if (!trimmedName || !date || !reciprocateBy) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch("/api/silent-growth/ledger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmedName, date, reciprocateBy }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to save entry")
      setEntries((prev) => [data.entry, ...prev])
      setName("")
      setReciprocateBy("")
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const handleRemove = async (id: string) => {
    const prev = entries
    setEntries((current) => current.filter((e) => e.id !== id))
    try {
      const res = await fetch(`/api/silent-growth/ledger?id=${encodeURIComponent(id)}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to remove entry")
    } catch {
      setEntries(prev)
      setError("Failed to remove entry. Please try again.")
    }
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
      <div className="border-b border-zinc-100 p-6">
        <p className="mb-4 text-sm font-semibold text-zinc-800">Log an engagement to reciprocate later</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name"
            className="rounded-xl border border-zinc-200 px-3 py-2.5 text-sm text-zinc-800 placeholder-zinc-400 transition-all focus:border-teal/50 focus:outline-none focus:ring-2 focus:ring-teal/30"
          />
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-xl border border-zinc-200 px-3 py-2.5 text-sm text-zinc-800 transition-all focus:border-teal/50 focus:outline-none focus:ring-2 focus:ring-teal/30"
          />
          <input
            type="date"
            value={reciprocateBy}
            onChange={(e) => setReciprocateBy(e.target.value)}
            className="rounded-xl border border-zinc-200 px-3 py-2.5 text-sm text-zinc-800 transition-all focus:border-teal/50 focus:outline-none focus:ring-2 focus:ring-teal/30"
          />
        </div>
        <p className="mt-1 text-xs text-zinc-400">Left: date you engaged. Right: date to reciprocate by.</p>
        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleAdd}
          disabled={!name.trim() || !date || !reciprocateBy || saving}
          className={`mt-4 w-full rounded-xl px-6 py-3 text-sm font-semibold transition-all ${
            name.trim() && date && reciprocateBy && !saving
              ? "bg-teal text-white shadow-sm hover:bg-teal-600"
              : "cursor-not-allowed bg-zinc-200 text-zinc-400"
          }`}
        >
          {saving ? "Saving..." : "Add to Ledger"}
        </motion.button>
      </div>

      <div className="divide-y divide-zinc-50">
        {loading ? (
          <p className="px-6 py-8 text-center text-sm text-zinc-400">Loading...</p>
        ) : entries.length === 0 ? (
          <p className="px-6 py-8 text-center text-sm text-zinc-400">No entries yet.</p>
        ) : (
          entries.map((entry) => (
            <div key={entry.id} className="flex items-center justify-between gap-3 px-6 py-4">
              <p className="text-sm text-zinc-700">
                Engaged with <span className="font-semibold text-zinc-900">{entry.name}</span> on{" "}
                <span className="font-semibold text-zinc-900">{entry.engaged_date}</span> - reciprocate by{" "}
                <span className="font-semibold text-teal">{entry.reciprocate_by}</span>
              </p>
              <button
                onClick={() => handleRemove(entry.id)}
                className="shrink-0 rounded-lg px-2.5 py-1 text-xs font-medium text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-600"
              >
                Remove
              </button>
            </div>
          ))
        )}
      </div>
    </section>
  )
}
