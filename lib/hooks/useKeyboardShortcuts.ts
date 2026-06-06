"use client"

import { useEffect, useRef } from "react"

export function useKeyboardShortcuts(shortcuts: Record<string, () => void>) {
  const shortcutsRef = useRef(shortcuts)
  shortcutsRef.current = shortcuts

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const key = `${e.ctrlKey || e.metaKey ? "ctrl+" : ""}${e.key.toLowerCase()}`
      const action = shortcutsRef.current[key]
      if (action) {
        e.preventDefault()
        action()
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [])
}