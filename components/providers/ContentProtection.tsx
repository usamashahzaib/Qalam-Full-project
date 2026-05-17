"use client"

import { useEffect } from "react"
import { buildCopyrightSuffix } from "@/lib/watermark"

function getOrCreateSessionId(): string {
  try {
    let id = localStorage.getItem("qalam_fp")
    if (!id) {
      id = Math.random().toString(36).slice(2) + Date.now().toString(36)
      localStorage.setItem("qalam_fp", id)
    }
    return id
  } catch {
    return Date.now().toString(36)
  }
}

export function ContentProtection() {
  useEffect(() => {
    const sessionId = getOrCreateSessionId()

    // Console deterrent — identical to the pattern used by Facebook, Pinterest, and Google
    try {
      console.log(
        "%c⛔ Stop.",
        "color:#cc0000;font-size:48px;font-weight:bold;line-height:1;"
      )
      console.log(
        "%cThis is a browser developer tool intended for software engineers.\n" +
          "If someone told you to open this and paste or type anything here, they are trying to scam you.\n\n" +
          "© 2025 Qalam (byqalam.com). All content on this site is proprietary and legally protected.\n" +
          "Unauthorized copying, scraping, or reproduction violates our Terms of Service\n" +
          "and applicable copyright law. Sessions are watermarked and traceable.\n" +
          "Report abuse: legal@byqalam.com",
        "color:#555;font-size:13px;line-height:1.8;"
      )
    } catch {}

    // Copy event — append copyright block + invisible fingerprint to clipboard
    const onCopy = (e: ClipboardEvent) => {
      const sel = window.getSelection()?.toString() ?? ""
      if (!sel.trim()) return
      try {
        e.clipboardData?.setData("text/plain", sel + buildCopyrightSuffix(sessionId))
        e.preventDefault()
      } catch {}
    }

    // Context menu — block on images and explicitly protected elements
    const onContextMenu = (e: MouseEvent) => {
      const t = e.target as HTMLElement
      if (t.tagName === "IMG" || t.closest("[data-protect]")) {
        e.preventDefault()
      }
    }

    // Keyboard — block page-save (Ctrl/Cmd+S)
    // Note: Ctrl+U (view source) opens a new tab and cannot be reliably blocked
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault()
      }
    }

    // DevTools open detection via window size delta
    // Works when DevTools is docked to the side; false positives possible with some browser extensions
    let devtoolsWarned = false
    const checkDevTools = () => {
      const sideDocked = window.outerWidth - window.innerWidth > 160
      const bottomDocked = window.outerHeight - window.innerHeight > 160
      if ((sideDocked || bottomDocked) && !devtoolsWarned) {
        devtoolsWarned = true
        console.warn(
          "%c🔍 DevTools detected.\nAll interactions on byqalam.com are logged and sessions are fingerprinted.\nSession prefix: " +
            sessionId.slice(0, 8) +
            "…",
          "color:#e65c00;font-size:14px;font-weight:bold;line-height:1.7;"
        )
      }
    }
    // Note: the periodic setInterval for checking dev tools was removed to prevent false positives and performance issues.

    document.addEventListener("copy", onCopy)
    document.addEventListener("contextmenu", onContextMenu)
    document.addEventListener("keydown", onKeyDown)

    return () => {
      document.removeEventListener("copy", onCopy)
      document.removeEventListener("contextmenu", onContextMenu)
      document.removeEventListener("keydown", onKeyDown)
    }
  }, [])

  return null
}
