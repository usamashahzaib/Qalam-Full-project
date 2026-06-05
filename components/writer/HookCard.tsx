"use client"

import { useEffect, useState } from "react"

export function HookCard({
  hook,
  selected,
  onSelect,
}: {
  hook: string
  selected: boolean
  onSelect: () => void
}) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    setVisible(false)
    const id = window.setTimeout(() => setVisible(true), 0)
    return () => window.clearTimeout(id)
  }, [hook])

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`min-h-36 w-64 shrink-0 cursor-pointer rounded-2xl border p-4 text-left opacity-0 outline-none transition-all duration-200 focus-visible:ring-2 focus-visible:ring-teal/40 sm:w-auto ${visible ? "opacity-100" : "opacity-0"} ${
        selected
          ? "border-teal bg-teal/5 shadow-sm ring-1 ring-teal/20"
          : "border-zinc-200 bg-white hover:border-zinc-300 hover:shadow-sm"
      }`}
    >
      <p className="text-sm font-semibold leading-relaxed text-zinc-900">{hook}</p>
      <span className={`mt-4 inline-flex rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${selected ? "bg-teal text-white" : "border border-zinc-200 text-zinc-600"}`}>
        {selected ? "Selected" : "Use"}
      </span>
    </button>
  )
}
