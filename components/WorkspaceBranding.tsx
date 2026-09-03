"use client"

import { useState } from "react"

const DEFAULT_TEAL = "#0d4a45"
const HEX_RE = /^#[0-9A-Fa-f]{6}$/

export function WorkspaceBranding({
  workspaceId,
  initialColor,
  onSaved,
  canManage = true,
}: {
  workspaceId: string
  initialColor: string | null
  onSaved?: (color: string | null) => void
  canManage?: boolean
}) {
  const [color, setColor] = useState(initialColor || DEFAULT_TEAL)
  const [isSaving, setIsSaving] = useState(false)
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null)

  const save = async (nextColor: string | null) => {
    setIsSaving(true)
    setMsg(null)
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/branding`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brandingColor: nextColor }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "save_failed")
      setMsg({ text: nextColor ? "Branding color saved." : "Reset to default teal.", ok: true })
      onSaved?.(nextColor)
    } catch {
      setMsg({ text: "Could not save branding color. Try again.", ok: false })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-4">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">Branding color</p>
      <p className="mb-3 text-xs text-zinc-500">
        Sets the accent color used on primary buttons, active nav items, and usage bars while this workspace is active.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="color"
          value={HEX_RE.test(color) ? color : DEFAULT_TEAL}
          onChange={(e) => setColor(e.target.value)}
          className="h-9 w-12 cursor-pointer rounded-lg border border-zinc-200 bg-white p-0.5"
          aria-label="Pick branding color"
          disabled={!canManage}
        />
        <input
          type="text"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          placeholder="#0D4A45"
          maxLength={7}
          className="w-28 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm font-mono outline-none focus:border-teal/50"
          disabled={!canManage}
        />
        <button
          onClick={() => HEX_RE.test(color) && save(color)}
          disabled={!canManage || isSaving || !HEX_RE.test(color)}
          className="rounded-lg bg-zinc-900 px-4 py-1.5 text-xs font-semibold text-white shadow-sm transition-all hover:bg-zinc-800 disabled:opacity-50"
        >
          {isSaving ? "Saving..." : "Save"}
        </button>
        {canManage && initialColor ? (
          <button
            onClick={() => { setColor(DEFAULT_TEAL); save(null) }}
            disabled={isSaving}
            className="text-xs font-medium text-zinc-500 hover:text-zinc-700 disabled:opacity-50"
          >
            Reset to default
          </button>
        ) : null}
      </div>
      {!canManage ? <p className="mt-2 text-xs text-zinc-500">Only the owner or workspace manager can change branding.</p> : null}
      {!HEX_RE.test(color) ? (
        <p className="mt-2 text-xs text-red-600">Enter a 6-digit hex color, e.g. #0D4A45.</p>
      ) : null}
      {msg ? (
        <p className={`mt-2 text-xs font-medium ${msg.ok ? "text-emerald-700" : "text-red-600"}`}>{msg.text}</p>
      ) : null}
    </div>
  )
}
