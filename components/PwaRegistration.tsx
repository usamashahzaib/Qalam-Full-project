"use client"

import { useEffect } from "react"

export function PwaRegistration() {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/sw.js")
          .then((registration) => {
            registration.update().catch(() => undefined)
            // Register the Background Sync tag so the service worker's
            // sync event handler ('qalam-replay-queue') actually fires
            // when the user comes back online after an offline mutation.
            if ("sync" in registration) {
              (registration as ServiceWorkerRegistration & { sync: { register: (tag: string) => Promise<void> } })
                .sync.register("qalam-replay-queue")
                .catch(() => {
                  // Background Sync not supported or permission denied - silent fallback
                })
            }
          })
          .catch((err) => {
            console.error("Service worker registration failed:", err)
          })
      })
    }
  }, [])

  return null
}
