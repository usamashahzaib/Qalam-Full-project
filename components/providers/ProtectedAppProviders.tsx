"use client"

import { WorkspaceProvider } from "@/components/providers/WorkspaceProvider"
import { RequireAuth } from "@/components/providers/RequireAuth"
import { PlanCheckoutProvider } from "@/lib/hooks/usePlanCheckout"
import { CheckoutStatusOverlay } from "@/components/CheckoutStatusOverlay"
import { WelcomeModal } from "@/components/onboarding/WelcomeModal"

export function ProtectedAppProviders({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <WorkspaceProvider>
        {/* Inside WorkspaceProvider so checkout can read and refresh billing. */}
        <PlanCheckoutProvider>
          {children}
          <CheckoutStatusOverlay />
          <WelcomeModal />
        </PlanCheckoutProvider>
      </WorkspaceProvider>
    </RequireAuth>
  )
}
