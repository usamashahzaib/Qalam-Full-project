"use client"

import { useEffect } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useSession } from "next-auth/react"
import { QalamMark } from "@/components/QalamLogo"

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { status } = useSession()
  const query = searchParams.toString()

  useEffect(() => {
    if (status === "unauthenticated") {
      // The query string is part of the destination, not decoration: /upgrade?plan=Pro
      // loses the chosen plan without it, and the visitor has to pick all over again
      // after logging in. Same for any other deep link into the app.
      const next = `${pathname || "/dashboard"}${query ? `?${query}` : ""}`
      router.replace(`/login?callbackUrl=${encodeURIComponent(next)}`)
    }
  }, [pathname, query, router, status])

  if (status === "loading") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-zinc-50">
        <QalamMark size={48} />
        <div className="flex gap-1.5" aria-label="Loading workspace">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="h-1.5 w-1.5 rounded-full bg-teal/60 animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>
    )
  }

  if (status !== "authenticated") return null
  return <>{children}</>
}
