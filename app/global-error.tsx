"use client"

import { useEffect } from "react"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("[Global Error]", error)
  }, [error])

  return (
    <html>
      <body className="flex min-h-screen flex-col items-center justify-center px-6 py-20 text-center font-sans">
        <h2 className="mt-4 text-lg font-bold text-zinc-900">Something went wrong</h2>
        <p className="mt-2 max-w-sm text-sm text-zinc-500">
          An unexpected error occurred. Please try again.
        </p>
        <button
          onClick={reset}
          className="mt-6 rounded-xl bg-zinc-950 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-zinc-800"
        >
          Try again
        </button>
      </body>
    </html>
  )
}
