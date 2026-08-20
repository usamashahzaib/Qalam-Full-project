import type { Metadata } from "next"

// Reads callbackUrl from the query string; forced dynamic so useSearchParams
// doesn't need a Suspense boundary and static generation isn't attempted.
export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Sign In",
  description: "Sign in to your Qalam workspace.",
  robots: { index: false },
}

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
