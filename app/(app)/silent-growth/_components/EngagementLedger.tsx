"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"

const LEDGER_STORAGE_KEY = "silent_growth_ledger"

type LedgerEntry = {
  id: string
  name: string
  date: string
  reciprocateBy: string
}

function loadLedger(): LedgerEntry[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(LEDGER_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveLedger(entries: LedgerEntry[]) {
  try {
    localStorage.setItem(LEDGER_STORAGE_KEY, JSON.stringify(entries))
  } catch {
    // localStorage unavailable (private mode, quota) - entry is lost silently
  }
}

export function EngagementLedger() {
  const [entries, setEntries] = useState<LedgerEntry[]>([])
  const [name, setName] = useState("")
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [reciprocateBy, setReciprocateBy] = useState("")

  useEffect(() => {
    setEntries(loadLedger())
  }, [])

  const handleAdd = () => {
    const trimmedName = name.trim()
    if (!trimmedName || !date || !reciprocateBy) return
    const entry: LedgerEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: trimmedName,
      date,
      reciprocateBy,
    }
    const next = [entry, ...entries]
    setEntries(next)
    saveLedger(next)
    setName("")
    setReciprocateBy("")
  }

  const handleRemove = (id: string) => {
    const next = entries.filter((e) => e.id !== id)
    setEntries(next)
    saveLedger(next)
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

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleAdd}
          disabled={!name.trim() || !date || !reciprocateBy}
          className={`mt-4 w-full rounded-xl px-6 py-3 text-sm font-semibold transition-all ${
            name.trim() && date && reciprocateBy
              ? "bg-teal text-white shadow-sm hover:bg-teal-600"
              : "cursor-not-allowed bg-zinc-200 text-zinc-400"
          }`}
        >
          Add to Ledger
        </motion.button>
      </div>

      <div className="divide-y divide-zinc-50">
        {entries.length === 0 ? (
          <p className="px-6 py-8 text-center text-sm text-zinc-400">No entries yet. Stored only on this device.</p>
        ) : (
          entries.map((entry) => (
            <div key={entry.id} className="flex items-center justify-between gap-3 px-6 py-4">
              <p className="text-sm text-zinc-700">
                Engaged with <span className="font-semibold text-zinc-900">{entry.name}</span> on{" "}
                <span className="font-semibold text-zinc-900">{entry.date}</span> - reciprocate by{" "}
                <span className="font-semibold text-teal">{entry.reciprocateBy}</span>
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
