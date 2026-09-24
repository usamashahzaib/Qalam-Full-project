import type { Metadata } from "next"
import { SessionProvider } from "next-auth/react"
import { auth } from "@/auth"
import { ProtectedAppProviders } from "@/components/providers/ProtectedAppProviders"
import { AppMobileNav } from "@/components/AppMobileNav"
import { AppShell } from "@/components/AppShell"
import { AppHostHead } from "@/components/AppHostHead"

// Session-gated, always-fresh data (billing, dashboard stats, workspace state).
// Forced here so the root layout can stay static-eligible for marketing pages.
export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: {
    template: "%s | Qalam",
    default: "Qalam App",
  },
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // The root layout's provider starts without a session so marketing pages can
  // be static. App pages hand the server session to this nested provider, so
  // RequireAuth and every useSession() consumer here render signed-in on the
  // first paint instead of flashing a loading state.
  const session = await auth()

  return (
    <SessionProvider session={session}>
      <AppHostHead />
      <ProtectedAppProviders>
        <a href="#main-content" className="skip-link">Skip to content</a>
        <AppShell>
          <div id="main-content">
            {children}
          </div>
        </AppShell>
        <AppMobileNav />
      </ProtectedAppProviders>
    </SessionProvider>
  )
}
