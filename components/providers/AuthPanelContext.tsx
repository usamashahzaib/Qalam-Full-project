"use client"

import { createContext, useContext, useState, type ReactNode } from "react"

type AuthView = "sign-in" | "sign-up"

type AuthPanelContextValue = {
  isOpen: boolean
  view: AuthView
  openPanel: (view?: AuthView) => void
  closePanel: () => void
}

const AuthPanelContext = createContext<AuthPanelContextValue | null>(null)

export function AuthPanelProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const [view, setView] = useState<AuthView>("sign-in")

  function openPanel(v: AuthView = "sign-in") {
    setView(v)
    setIsOpen(true)
  }

  function closePanel() {
    setIsOpen(false)
  }

  return (
    <AuthPanelContext.Provider value={{ isOpen, view, openPanel, closePanel }}>
      {children}
    </AuthPanelContext.Provider>
  )
}

export function useAuthPanel() {
  const ctx = useContext(AuthPanelContext)
  if (!ctx) throw new Error("useAuthPanel must be used within AuthPanelProvider")
  return ctx
}
