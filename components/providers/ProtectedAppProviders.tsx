"use client"

import { WorkspaceProvider } from "@/components/providers/WorkspaceProvider"
import { RequireAuth } from "@/components/providers/RequireAuth"

export function ProtectedAppProviders({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <WorkspaceProvider>{children}</WorkspaceProvider>
    </RequireAuth>
  )
}
