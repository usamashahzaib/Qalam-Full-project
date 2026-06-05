"use client"

import { AuthProvider } from "@/components/providers/AuthProvider"
import { WorkspaceProvider } from "@/components/providers/WorkspaceProvider"
import { RequireAuth } from "@/components/providers/RequireAuth"

export function ProtectedAppProviders({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <RequireAuth>
        <WorkspaceProvider>{children}</WorkspaceProvider>
      </RequireAuth>
    </AuthProvider>
  )
}
