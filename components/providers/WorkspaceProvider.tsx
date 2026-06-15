"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useSession } from "next-auth/react"
import { QalamMark } from "@/components/QalamLogo"
import { VALID_PLAN_NAMES } from "@/lib/entitlements"
import { BillingProvider, type WorkspaceBilling } from "@/lib/hooks/useBilling"
import { PostsProvider } from "@/lib/hooks/usePosts"
import { ProfileProvider } from "@/lib/hooks/useProfile"
import type { PlanTier } from "@/types/domain"

// Re-export types consumed by existing import sites
export type { WorkspaceBilling } from "@/lib/hooks/useBilling"
export type { WorkspaceProfile, WorkspacePost } from "@/types/domain"
export type { PostStatus } from "@/lib/hooks/usePosts"

type WorkspaceContextValue = {
  workspaceId: string
  activeClientId: string | null
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null)

const workspaceCacheKey = (clientId: string | null) => `qalam-workspace:${clientId || "personal"}`

function WorkspaceProviderInner({
  children,
  workspaceId,
  activeClientId,
  serverBilling,
}: {
  children: React.ReactNode
  workspaceId: string
  activeClientId: string | null
  serverBilling: Partial<WorkspaceBilling> | null
}) {
  return (
    <WorkspaceContext.Provider value={{ workspaceId, activeClientId }}>
      <BillingProvider serverBilling={serverBilling}>
        <PostsProvider workspaceId={workspaceId}>
          <ProfileProvider workspaceId={workspaceId}>
            {children}
          </ProfileProvider>
        </PostsProvider>
      </BillingProvider>
    </WorkspaceContext.Provider>
  )
}

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const clientParam = searchParams.get("client")
  const [workspaceId, setWorkspaceId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null
    return sessionStorage.getItem(workspaceCacheKey(clientParam))
  })
  const [serverBilling, setServerBilling] = useState<Partial<WorkspaceBilling> | null>(null)
  const [resolveError, setResolveError] = useState<string | null>(null)
  const [isResolving, setIsResolving] = useState(true)

  useEffect(() => {
    if (status === "loading") return
    if (status !== "authenticated" || !session?.user?.email) {
      const next = `${pathname || "/dashboard"}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`
      router.replace(`/login?callbackUrl=${encodeURIComponent(next)}`)
      setWorkspaceId(null)
      setResolveError("auth_required")
      setIsResolving(false)
      return
    }

    const cached = sessionStorage.getItem(workspaceCacheKey(clientParam))
    setWorkspaceId(cached)
    setIsResolving(true)
    setResolveError(null)
    const url = clientParam ? `/api/workspace?workspaceKey=${encodeURIComponent(clientParam)}` : "/api/workspace"

    fetch(url)
      .then(async (res) => {
        const data = await res.json().catch(() => ({}))
        if (!res.ok || !data.workspaceId) throw new Error(data.error || "Failed to resolve workspace")
        setWorkspaceId(data.workspaceId)
        const rawPlan = data.plan as string | undefined
        const normalizedPlan = rawPlan ? rawPlan.charAt(0).toUpperCase() + rawPlan.slice(1).toLowerCase() : null
        if (normalizedPlan && VALID_PLAN_NAMES.includes(normalizedPlan)) {
          setServerBilling({
            plan: normalizedPlan as WorkspaceBilling["plan"] & PlanTier,
            overrideActive: Boolean(data.overrideActive),
            complimentaryTrialBanner: Boolean(data.complimentaryTrialBanner),
            overridePlan: data.overridePlan || null,
            planExpired: Boolean(data.planExpired),
            limits: data.limits,
            featureFlags: data.featureFlags || {},
          })
        }
        try { sessionStorage.setItem(workspaceCacheKey(clientParam), data.workspaceId) } catch {}
        setResolveError(null)
      })
      .catch((error) => {
        setWorkspaceId(null)
        setResolveError((error as Error).message || "Failed to resolve workspace")
      })
      .finally(() => setIsResolving(false))
  }, [clientParam, pathname, router, searchParams, session?.user?.email, status])

  if (isResolving && !workspaceId) {
    return (
      <div className="min-h-screen bg-zinc-50">
        <div className="h-16 border-b border-zinc-100 bg-white" />
        <div className="mx-auto max-w-6xl px-6 py-10">
          <div className="h-32 animate-pulse rounded-2xl bg-zinc-100" />
          <div className="mt-6 grid gap-4 sm:grid-cols-4">
            {[0, 1, 2, 3].map((i) => <div key={i} className="h-24 animate-pulse rounded-xl bg-zinc-100" />)}
          </div>
        </div>
      </div>
    )
  }

  if (!workspaceId) {
    const isSchemaError = resolveError === "schema_not_applied"
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-6 py-16">
        <div className="w-full max-w-xl rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm">
          <div className="mb-4 flex items-center gap-3">
            <QalamMark size={36} />
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-zinc-500">Workspace boot failed</p>
              <h1 className="text-2xl font-semibold text-zinc-950">{isSchemaError ? "Database setup incomplete" : "Workspace unavailable"}</h1>
            </div>
          </div>
          <p className="text-sm leading-6 text-zinc-600">
            {isSchemaError
              ? "Supabase is connected, but the app tables are missing in production. Apply supabase/schema.sql to the live project, then reload this page."
              : "The app could not resolve your workspace. Reload once. If it still fails, check the Vercel function logs for /api/workspace."}
          </p>
          {resolveError ? <pre className="mt-4 overflow-x-auto rounded-2xl bg-zinc-950 px-4 py-3 text-xs text-zinc-100">{resolveError}</pre> : null}
        </div>
      </div>
    )
  }

  return (
    <WorkspaceProviderInner workspaceId={workspaceId} activeClientId={clientParam} serverBilling={serverBilling} key={workspaceId}>
      {children}
    </WorkspaceProviderInner>
  )
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext)
  if (!ctx) throw new Error("useWorkspace must be used within WorkspaceProvider")
  return ctx
}
