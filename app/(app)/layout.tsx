import type { Metadata } from "next"
import { ProtectedAppProviders } from "@/components/providers/ProtectedAppProviders"
import { AppMobileNav } from "@/components/AppMobileNav"

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
      <div className="min-h-screen bg-zinc-50 pb-20 md:pb-0">
        {children}
        <AppMobileNav />
      </div>
    </ProtectedAppProviders>
  )
}
