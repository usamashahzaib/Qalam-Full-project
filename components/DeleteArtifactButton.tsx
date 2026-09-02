"use client"

import { useEffect, useId, useRef, useState } from "react"

type DeleteArtifactButtonProps = {
  itemType: string
  itemTitle: string
  onDelete: () => Promise<void>
  onDeleted?: () => void
  className?: string
  label?: string
}

export function DeleteArtifactButton({
  itemType,
  itemTitle,
  onDelete,
  onDeleted,
  className = "min-h-10 rounded-xl border border-red-200 bg-white px-3 text-xs font-bold text-red-600 transition hover:bg-red-50",
  label,
}: DeleteArtifactButtonProps) {
  const [open, setOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState("")
  const cancelRef = useRef<HTMLButtonElement>(null)
  const deletedRef = useRef(false)
  const titleId = useId()

  useEffect(() => {
    if (!open) return
    cancelRef.current?.focus()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !deleting) setOpen(false)
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [open, deleting])

  useEffect(() => {
    if (open || !deletedRef.current) return
    deletedRef.current = false
    onDeleted?.()
  }, [open, onDeleted])

  const confirmDelete = async () => {
    setDeleting(true)
    setError("")
    try {
      await onDelete()
      deletedRef.current = true
      setOpen(false)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : `Could not delete this ${itemType}.`)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <button
        type="button"
        className={className}
        onClick={(event) => {
          event.preventDefault()
          event.stopPropagation()
          setError("")
          setOpen(true)
        }}
        aria-label={label || `Delete ${itemType}`}
      >
        {label || "Delete"}
      </button>

      {open ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-950/55 px-4" role="presentation" onMouseDown={() => !deleting && setOpen(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="w-full max-w-md rounded-3xl border border-white/70 bg-white p-6 shadow-2xl"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-red-50 text-red-600" aria-hidden="true">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <h2 id={titleId} className="mt-5 text-xl font-bold text-zinc-950">Delete this {itemType}?</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-600">
              <span className="font-semibold text-zinc-900">{itemTitle}</span> will be removed from this workspace.
            </p>
            {error ? <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
            <div className="mt-6 flex justify-end gap-3">
              <button ref={cancelRef} type="button" disabled={deleting} onClick={() => setOpen(false)} className="min-h-11 rounded-xl border border-zinc-200 px-4 text-sm font-bold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50">
                Keep it
              </button>
              <button type="button" disabled={deleting} onClick={() => void confirmDelete()} className="min-h-11 min-w-28 rounded-xl bg-red-600 px-4 text-sm font-bold text-white transition hover:bg-red-700 disabled:cursor-wait disabled:opacity-60">
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
