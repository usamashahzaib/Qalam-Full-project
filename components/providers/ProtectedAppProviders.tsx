"use client"

import { WorkspaceProvider } from "@/components/providers/WorkspaceProvider"
import { RequireAuth } from "@/components/providers/RequireAuth"
import { PlanCheckoutProvider } from "@/lib/hooks/usePlanCheckout"
import { AppModeProvider } from "@/lib/hooks/useAppMode"
import { CheckoutStatusOverlay } from "@/components/CheckoutStatusOverlay"
import { WelcomeModal } from "@/components/onboarding/WelcomeModal"

export function ProtectedAppProviders({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <AppModeProvider>
        <WorkspaceProvider>
          {/* Inside WorkspaceProvider so checkout can read and refresh billing. */}
          <PlanCheckoutProvider>
            {children}
            <CheckoutStatusOverlay />
            <WelcomeModal />
          </PlanCheckoutProvider>
        </WorkspaceProvider>
      </AppModeProvider>
    </RequireAuth>
  )
}
