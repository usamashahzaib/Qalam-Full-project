"use client"

import { useEffect } from "react"
import { useAuth } from "@/components/providers/AuthProvider"

export default function LinkedInCallbackPage() {
  const { completeLinkedInAuth } = useAuth()

  useEffect(() => {
    const next =
      typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("next")
    completeLinkedInAuth()
      .then(() => {
        window.location.replace(next && next.startsWith("/") ? next : "/dashboard")
      })
      .catch(() => {
        window.location.replace("/auth?linkedin=failed")
      })
  }, [completeLinkedInAuth])

  return null
}
