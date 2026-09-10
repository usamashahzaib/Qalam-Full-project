"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { useAppMode } from "@/lib/hooks/useAppMode"
import { APP_MODES, type AppMode } from "@/lib/app-mode"
import { ProfileIcon, ComposeIcon, CheckIcon } from "@/components/ui/qalam-icons"

const STORAGE_KEY = "onboarding_completed"

const MODE_ICONS: Record<AppMode, (props: { className?: string }) => React.ReactElement> = {
  career: ProfileIcon,
  linkedin: ComposeIcon,
  everything: CheckIcon,
}

const MODE_DESTINATIONS: Record<AppMode, string> = {
  career: "/career",
  linkedin: "/writer?compose=new",
  everything: "/dashboard",
}

export function WelcomeModal() {
  const { status } = useSession()
  const router = useRouter()
  const { needsOnboarding, setMode, pending } = useAppMode()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (status !== "authenticated" || pending) return
    const timer = window.setTimeout(() => {
      try {
        if (localStorage.getItem(STORAGE_KEY) === "true" && !needsOnboarding) return
      } catch {
        return
      }
      setOpen(true)
    }, 0)
    return () => window.clearTimeout(timer)
  }, [status, pending, needsOnboarding])

  const pick = (mode: AppMode) => {
    setMode(mode)
    try {
      localStorage.setItem(STORAGE_KEY, "true")
    } catch {
      // ignore blocked localStorage
    }
    setOpen(false)
    router.push(MODE_DESTINATIONS[mode])
  }

  const dismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "true")
    } catch {
      // ignore
    }
    setOpen(false)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/45 px-4">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl">
        <h2 className="text-lg font-bold text-zinc-900">Welcome to Qalam</h2>
        <p className="mt-1.5 text-sm text-zinc-500">What are you here for? You can switch anytime.</p>

        <div className="mt-5 space-y-2">
          {APP_MODES.map(({ key, label, description }) => {
            const Icon = MODE_ICONS[key]
            return (
              <button
                key={key}
                onClick={() => pick(key)}
                className="flex w-full cursor-pointer items-center gap-3 rounded-xl border border-zinc-200 px-4 py-3 text-left transition-colors hover:border-teal/40 hover:bg-teal/5"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal/10 text-teal">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-zinc-900">{label}</span>
                  <span className="block text-xs text-zinc-500">{description}</span>
                </span>
              </button>
            )
          })}
        </div>

        <button
          onClick={dismiss}
          className="mt-4 w-full cursor-pointer text-center text-sm font-semibold text-zinc-400 transition-colors hover:text-zinc-600"
        >
          Skip
        </button>
      </div>
    </div>
  )
}
