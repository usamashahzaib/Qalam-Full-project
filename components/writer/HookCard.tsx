"use client"

import { useEffect, useState } from "react"

type HookStyle = "SHARP" | "AUTHORITY" | "STORY" | "CURIOSITY" | "DIRECT"

const STYLE_COLORS: Record<HookStyle, { badge: string; ring: string; bg: string }> = {
  SHARP:     { badge: "bg-red-100 text-red-700 border-red-200",     ring: "border-red-400 ring-red-200",     bg: "bg-red-50/50" },
  AUTHORITY: { badge: "bg-blue-100 text-blue-700 border-blue-200",  ring: "border-blue-400 ring-blue-200",   bg: "bg-blue-50/50" },
  STORY:     { badge: "bg-emerald-100 text-emerald-700 border-emerald-200", ring: "border-emerald-400 ring-emerald-200", bg: "bg-emerald-50/50" },
  CURIOSITY: { badge: "bg-purple-100 text-purple-700 border-purple-200",    ring: "border-purple-400 ring-purple-200",  bg: "bg-purple-50/50" },
  DIRECT:    { badge: "bg-zinc-100 text-zinc-600 border-zinc-200",  ring: "border-zinc-400 ring-zinc-200",   bg: "bg-zinc-50/50" },
}

export function HookCard({
  hook,
  style,
  selected,
  onSelect,
}: {
  hook: string
  style?: string
  selected: boolean
  onSelect: () => void
}) {
  const [visible, setVisible] = useState(false)
  const hookStyle = (style as HookStyle) || "DIRECT"
  const colors = STYLE_COLORS[hookStyle] || STYLE_COLORS.DIRECT

  useEffect(() => {
    setVisible(false)
    const id = window.setTimeout(() => setVisible(true), 0)
    return () => window.clearTimeout(id)
  }, [hook])

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`
        flex min-h-[140px] w-64 shrink-0 cursor-pointer flex-col gap-3 rounded-2xl border-2 p-4 text-left
        outline-none transition-all duration-200 focus-visible:ring-2 focus-visible:ring-teal/40
        sm:w-auto
        ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"}
        ${selected
          ? `${colors.ring} ${colors.bg} ring-1 shadow-md`
          : "border-zinc-200 bg-white hover:border-zinc-300 hover:shadow-sm"
        }
      `}
    >
      <div className="flex items-start justify-between gap-2">
        <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${colors.badge}`}>
          {hookStyle}
        </span>
        {selected && (
          <svg className="h-4 w-4 shrink-0 text-teal" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>

      <p className="line-clamp-3 flex-1 text-sm font-semibold leading-snug text-zinc-900">{hook}</p>

      <span className={`inline-flex h-7 items-center justify-center rounded-lg px-3 text-xs font-bold transition-colors ${
        selected ? "bg-teal text-white" : "border border-zinc-200 text-zinc-600 hover:border-zinc-300"
      }`}>
        {selected ? "Selected" : "Use"}
      </span>
    </button>
  )
}
