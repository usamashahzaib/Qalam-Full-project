"use client"

import { createContext, useCallback, useContext, useEffect, useState } from "react"
import { type AppMode, DEFAULT_MODE, MODE_STORAGE_KEY, resolveStoredMode } from "@/lib/app-mode"

type AppModeContextValue = {
  mode: AppMode
  setMode: (mode: AppMode) => void
  /** True until the stored preference has been read from localStorage. */
  pending: boolean
  /** True when no mode has ever been chosen (first visit). */
  needsOnboarding: boolean
}

const AppModeContext = createContext<AppModeContextValue | null>(null)

export function AppModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<AppMode>(DEFAULT_MODE)
  const [pending, setPending] = useState(true)
  const [needsOnboarding, setNeedsOnboarding] = useState(false)

  useEffect(() => {
    try {
      const resolved = resolveStoredMode(localStorage.getItem(MODE_STORAGE_KEY))
      setModeState(resolved.mode)
      setNeedsOnboarding(resolved.needsOnboarding)
    } catch {
      // localStorage blocked - keep the default and do not nag
    }
    setPending(false)
  }, [])

  const setMode = useCallback((next: AppMode) => {
    setModeState(next)
    setNeedsOnboarding(false)
    try {
      localStorage.setItem(MODE_STORAGE_KEY, next)
    } catch {
      // ignore
    }
  }, [])

  return (
    <AppModeContext.Provider value={{ mode, setMode, pending, needsOnboarding }}>
      {children}
    </AppModeContext.Provider>
  )
}

export function useAppMode(): AppModeContextValue {
  const ctx = useContext(AppModeContext)
  if (!ctx) throw new Error("useAppMode must be used within AppModeProvider")
  return ctx
}
