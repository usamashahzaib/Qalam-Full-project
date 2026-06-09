import type { Metadata } from "next"
import { ProtectedAppProviders } from "@/components/providers/ProtectedAppProviders"
import { AppMobileNav } from "@/components/AppMobileNav"
import { AppShell } from "@/components/AppShell"

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedAppProviders>
      <a href="#main-content" className="skip-link">Skip to content</a>
      <AppShell>
        <div id="main-content">
          {children}
        </div>
      </AppShell>
      <AppMobileNav />
    </ProtectedAppProviders>
  )
}
