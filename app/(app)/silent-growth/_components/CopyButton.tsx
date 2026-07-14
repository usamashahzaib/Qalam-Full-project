"use client"

import { useState } from "react"

export function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      const ta = document.createElement("textarea")
      ta.value = text
      ta.style.position = "fixed"
      ta.style.opacity = "0"
      document.body.appendChild(ta)
      ta.select()
      document.execCommand("copy")
      document.body.removeChild(ta)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={() => void handleCopy()}
      className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
        copied ? "bg-green-50 text-green-700" : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200"
      }`}
    >
      {copied ? "Copied!" : label}
    </button>
  )
}
