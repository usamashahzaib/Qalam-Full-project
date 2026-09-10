"use client"

import Link from "next/link"
import { useAppMode } from "@/lib/hooks/useAppMode"
import { withClientParam } from "@/lib/workspace-navigation"

export function DashboardHero({
  greeting,
  activeClientId,
}: {
  greeting: string
  activeClientId: string | null
}) {
  const { mode } = useAppMode()

  return (
    <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-gold-700">
          Your Qalam
        </p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-zinc-950">
          {greeting}
        </h1>
        <p className="mt-2 text-sm text-zinc-500">
          {mode === "career"
            ? "Your saved work builds up. Each step makes the next one easier."
            : "One useful move at a time. Your work becomes easier to reuse every day."}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {mode === "career" ? (
            <Link
              href={withClientParam("/career/resumes", activeClientId)}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl px-5 text-sm font-semibold text-white transition-colors"
              style={{ backgroundColor: "var(--ws-brand, #0d4a45)" }}
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
              Improve resume for a target job
            </Link>
          ) : (
            <Link
              href={withClientParam("/writer?compose=new", activeClientId)}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl px-5 text-sm font-semibold text-white transition-colors"
              style={{ backgroundColor: "var(--ws-brand, #0d4a45)" }}
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Write a post in your voice
            </Link>
          )}
      </div>
    </header>
  )
}
