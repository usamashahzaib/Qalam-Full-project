"use client"

import { useRouter } from "next/navigation"

export function RefreshButton({
  label,
  className,
}: {
  label: string
  className?: string
}) {
  const router = useRouter()
  return (
    <button
      onClick={() => router.refresh()}
      className={
        className ??
        "rounded-xl border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
      }
    >
      {label}
    </button>
  )
}
