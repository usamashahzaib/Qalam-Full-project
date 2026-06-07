"use client"

import { useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { QalamMark } from "@/components/QalamLogo"

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { status } = useSession()

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace(`/login?callbackUrl=${encodeURIComponent(pathname || "/dashboard")}`)
    }
  }, [pathname, router, status])

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
