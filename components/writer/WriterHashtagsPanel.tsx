"use client"

import { copyText } from "@/lib/hooks/useWriterLogic"

interface WriterHashtagsPanelProps {
  hashtags: string[] | undefined
  step3Visible: boolean
  showStatus: (text: string, type: "success" | "error" | "info") => void
}

export function WriterHashtagsPanel({ hashtags, step3Visible, showStatus }: WriterHashtagsPanelProps) {
  if (hashtags?.length) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-500">Hashtags</h2>
          <button
            onClick={async () => { await copyText(hashtags.join(" ")); showStatus("Hashtags copied", "success") }}
            className="cursor-pointer text-xs font-semibold text-teal transition-colors hover:text-teal-700"
          >
            Copy all
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {hashtags.map((tag) => (
            <button
              key={tag}
              onClick={async () => { await copyText(tag); showStatus(`${tag} copied`, "success") }}
              className="cursor-pointer rounded-full border border-teal/20 bg-teal/5 px-2.5 py-1 text-xs font-medium text-teal transition-colors hover:bg-teal/10"
            >
              {tag}
            </button>
          ))}
        </div>
      </div>
    )
  }
  if (step3Visible) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Hashtags</h2>
        <p className="mt-2 text-xs text-zinc-400">Hashtags appear after scoring.</p>
      </div>
    )
  }
  return null
}
