import { AppHostHead } from "@/components/AppHostHead"

// Admin pages are session-gated and served on the app host under the strict
// nonce CSP, so every one of them must render per request.
export const dynamic = "force-dynamic"

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <><AppHostHead />{children}</>
}
