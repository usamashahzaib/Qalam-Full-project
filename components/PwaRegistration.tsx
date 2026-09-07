"use client"

import { useEffect } from "react"

export function PwaRegistration({ enabled }: { enabled: boolean }) {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator && !enabled) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((registration) => void registration.unregister())
      }).catch(() => undefined)
      return
    }
    if (typeof window !== "undefined" && "serviceWorker" in navigator && enabled) {
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
    }
  }, [enabled])

  return null
}
