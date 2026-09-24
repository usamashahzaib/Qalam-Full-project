"use client"

import { useEffect } from "react"
import { isPwaHost } from "@/lib/app-host"

// Decides from the browser's own hostname, so the root layout can render this
// without reading request headers (which would make every marketing page
// dynamic). On the marketing host it removes any service worker left behind.
export function PwaRegistration() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return

    if (!isPwaHost(window.location.hostname)) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((registration) => void registration.unregister())
      }).catch(() => undefined)
      return
    }

    const onLoad = () => {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          registration.update().catch(() => undefined)
        })
        .catch((err) => {
          console.error("Service worker registration failed:", err)
        })
    }
    if (document.readyState === "complete") onLoad()
    else window.addEventListener("load", onLoad, { once: true })
    return () => window.removeEventListener("load", onLoad)
  }, [])

  return null
}
