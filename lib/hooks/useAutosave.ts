"use client"

import { useEffect, useRef } from "react"

export function useAutosave(
  key: string,
  value: string,
  onSave: (value: string) => void | Promise<void>,
  delay = 3000
) {
  const onSaveRef = useRef(onSave)

  useEffect(() => {
    onSaveRef.current = onSave
  }, [onSave])

  useEffect(() => {
    if (!value) return
    let mounted = true

    const timer = setTimeout(async () => {
      if (!mounted) return
      await onSaveRef.current(value)
      if (!mounted) return
      try {
        localStorage.setItem(`qalam_autosave_${key}`, JSON.stringify({
          content: value,
          savedAt: new Date().toISOString()
        }))
      } catch {
        // ignore
      }
    }, delay)

    return () => {
      mounted = false
      clearTimeout(timer)
    }
  }, [value, key, delay])
}
