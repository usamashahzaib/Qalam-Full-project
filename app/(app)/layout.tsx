import type { Metadata } from "next"
import { headers } from "next/headers"
import { ProtectedAppProviders } from "@/components/providers/ProtectedAppProviders"
import { AppMobileNav } from "@/components/AppMobileNav"
import { AppShell } from "@/components/AppShell"
import { PwaRegistration } from "@/components/PwaRegistration"

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
  const headersList = await headers()
  const host = (headersList.get("x-forwarded-host") || headersList.get("host") || "").split(":")[0].toLowerCase()
  const pwaEnabled = host === "app.byqalam.com" || host === "localhost" || host === "127.0.0.1"

  return (
    <ProtectedAppProviders>
      {/* <link>/<meta> render fine outside <head> - React hoists them there. */}
      {pwaEnabled ? <link rel="manifest" href="/manifest.webmanifest" /> : null}
      {pwaEnabled ? <meta name="apple-mobile-web-app-capable" content="yes" /> : null}
      {pwaEnabled ? <meta name="apple-mobile-web-app-title" content="Qalam" /> : null}
      {pwaEnabled ? <meta name="apple-mobile-web-app-status-bar-style" content="default" /> : null}
      <a href="#main-content" className="skip-link">Skip to content</a>
      <AppShell>
        <div id="main-content">
          {children}
        </div>
      </AppShell>
      <AppMobileNav />
      <PwaRegistration enabled={pwaEnabled} />
    </ProtectedAppProviders>
  )
}
