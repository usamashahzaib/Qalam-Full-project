"use client"

import { useEffect, useRef } from "react"

export function useKeyboardShortcuts(shortcuts: Record<string, () => void>) {
  const shortcutsRef = useRef(shortcuts)

  useEffect(() => {
    shortcutsRef.current = shortcuts
  }, [shortcuts])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const isEditable = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable
      if (isEditable) return
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
