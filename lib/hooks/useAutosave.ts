"use client"

import { useEffect, useRef } from "react"

export function useAutosave(
  key: string,
  value: string,
  onSave: (value: string) => void | Promise<void>,
  delay = 3000
) {
  const onSaveRef = useRef(onSave)
  onSaveRef.current = onSave

  useEffect(() => {
    if (!value) return
    
    const timer = setTimeout(() => {
      onSaveRef.current(value)
      try {
        localStorage.setItem(`qalam_autosave_${key}`, JSON.stringify({
          content: value,
          savedAt: new Date().toISOString()
        }))
      } catch (e) {
        // ignore
      }
    }, delay)

    return () => clearTimeout(timer)
  }, [value, key, delay])
}