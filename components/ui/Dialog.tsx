"use client"

import { useCallback, useEffect, useRef } from "react"

type DialogProps = {
  /** Called when the user dismisses via Escape, backdrop click, or the close affordance. */
  onClose: () => void
  children: React.ReactNode
  /** id of the element that labels the dialog (usually the heading) for aria-labelledby. */
  labelledBy?: string
  /** Accessible name when there is no visible heading to point aria-labelledby at. */
  label?: string
  /** Extra classes for the centered panel wrapper (the backdrop is fixed/full-screen). */
  className?: string
  /** Set false to keep the dialog open on backdrop click (Escape still closes). Default true. */
  dismissOnBackdrop?: boolean
}

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'

/**
 * Accessible modal shell: role="dialog" + aria-modal, Escape to close, backdrop-click
 * dismiss, a focus trap that keeps Tab inside, and focus restoration to whatever was
 * focused before it opened. Wrap modal content in this instead of a bare fixed overlay.
 */
export function Dialog({ onClose, children, labelledBy, label, className, dismissOnBackdrop = true }: DialogProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const previouslyFocused = useRef<HTMLElement | null>(null)

  useEffect(() => {
    previouslyFocused.current = document.activeElement as HTMLElement | null

    // Move focus into the dialog: first focusable element, or the panel itself.
    const panel = panelRef.current
    const first = panel?.querySelector<HTMLElement>(FOCUSABLE)
    ;(first ?? panel)?.focus()

    // Lock background scroll while open.
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"

    return () => {
      document.body.style.overflow = prevOverflow
      previouslyFocused.current?.focus?.()
    }
  }, [])

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation()
        onClose()
        return
      }
      if (e.key !== "Tab") return
      const panel = panelRef.current
      if (!panel) return
      const focusable = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null || el === document.activeElement
      )
      if (focusable.length === 0) {
        e.preventDefault()
        panel.focus()
        return
      }
      const firstEl = focusable[0]
      const lastEl = focusable[focusable.length - 1]
      const active = document.activeElement
      if (e.shiftKey && (active === firstEl || active === panel)) {
        e.preventDefault()
        lastEl.focus()
      } else if (!e.shiftKey && active === lastEl) {
        e.preventDefault()
        firstEl.focus()
      }
    },
    [onClose]
  )

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/45 px-4"
      onMouseDown={(e) => {
        if (dismissOnBackdrop && e.target === e.currentTarget) onClose()
      }}
      onKeyDown={onKeyDown}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-label={labelledBy ? undefined : label}
        tabIndex={-1}
        className={className ?? "w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-6 text-center shadow-xl outline-none"}
      >
        {children}
      </div>
    </div>
  )
}
