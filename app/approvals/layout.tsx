import { AppHostHead } from "@/components/AppHostHead"

// The external review page (/approvals/[id]/review) is opened from an emailed
// link and served on the app host under the strict nonce CSP, so it must
// render per request rather than from a cached render with a stale nonce.
export const dynamic = "force-dynamic"

export default function ApprovalsLayout({ children }: { children: React.ReactNode }) {
  return <><AppHostHead />{children}</>
}
