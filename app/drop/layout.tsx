import type { Metadata } from "next"
import { AppHostHead } from "@/components/AppHostHead"

// Served on the app host under the strict nonce CSP, so it must render per
// request: a cached render would carry a stale nonce and its scripts would be
// blocked. Token pages are per-visitor anyway.
export const dynamic = "force-dynamic"

export const metadata: Metadata = { title: "One question from your team", robots: { index: false, follow: false } }

export default function Layout({ children }: { children: React.ReactNode }) {
  return <><AppHostHead />{children}</>
}
