import "server-only"

import { timingSafeEqual } from "node:crypto"
import { NextRequest } from "next/server"
import { redirect } from "next/navigation"
import { cache } from "react"
import { supabaseSelect, supabasePatch } from "@/lib/server/supabase-rest"
import { createServiceClient } from "@/lib/server/supabase-rest"
import { applyUserOverrides } from "@/lib/server/overrides"
import { auth } from "@/auth"
import { PLAN_PRIORITY } from "@/lib/server/plan-priority"
import { env } from "@/lib/server/env"
import { log } from "@/lib/server/logging"
import { ensureSupabaseUser, ensureWorkspaceForUser } from "@/lib/server/identity"
import { isSessionCurrent } from "@/lib/server/session-revocation"
import { isPlanExpired } from "@/lib/plan-expiry"

export { ensureSupabaseUser, ensureWorkspaceForUser } from "@/lib/server/identity"

const getAuthenticatedSessionImpl = async () => {
  const session = await auth()
  return await isSessionCurrent(session) ? session : null
}

export const getAuthenticatedSession = cache(getAuthenticatedSessionImpl)

export async function requireAuth(): Promise<string> {
  const session = await getAuthenticatedSession()
  const id = session?.user?.id
  if (!id) throw new Error("auth_required")
  return id
}

export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false
  const envList = env.appAdminEmails
  if (!envList) {
    log.warn("workspace.admin_emails_not_configured")
    return false
  }
  const adminEmails = envList.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean)
  return adminEmails.includes(email.trim().toLowerCase())
}

export function getAuthRole(email?: string | null): "admin" | "user" {
  return isAdminEmail(email) ? "admin" : "user"
}

export function toNames(name: string | null, email?: string | null) {
  const cleanName = name?.trim() || email?.split("@")[0] || "User"
  const firstName = cleanName.split(" ")[0] || "User"
  return { firstName, fullName: cleanName }
}

export type WorkspacePlanInfo = {
  plan: string
  status: string
  expiresAt: string | null
  planExpired?: boolean
}

export type WorkspaceSessionContext = {
  userId: string
  email: string
  fullName: string
  firstName: string
  imageUrl: string | null
  role: "admin" | "user"
  supabaseUserId: string
}

export const requireAdminRequest = async (_request: NextRequest) => {
  void _request
  const session = await getAuthenticatedSession()
  const userId = session?.user?.id || ""
  const email = session?.user?.email?.trim().toLowerCase()
  if (!isAdminEmail(email)) throw new Error("not_found")
  return { email: email || "", userId }
}

// Header-gated ops routes (app/api/admin/*, payments/test-webhook): requires both the
// x-admin-key secret (so curl/scripts can hit them) AND an admin-email session, unlike
// requireAdminRequest above which is session-only for the browser-driven referrals admin UI.
export const requireAdminOps = async (request: NextRequest): Promise<{ email: string; userId: string }> => {
  const adminKey = request.headers.get("x-admin-key") || ""
  const secretKey = process.env.ADMIN_SECRET_KEY || ""
  const keyBuf = Buffer.from(adminKey)
  const secretBuf = Buffer.from(secretKey)
  if (!secretKey || keyBuf.length !== secretBuf.length || !timingSafeEqual(keyBuf, secretBuf)) throw new Error("Forbidden")
  const session = await getAuthenticatedSession()
  if (!session?.user?.id) throw new Error("Unauthorized")
  if (!isAdminEmail(session.user.email)) throw new Error("Forbidden")
  return { email: session.user.email || "", userId: session.user.id }
}

export const requireAdminPage = async () => {
  const session = await getAuthenticatedSession()
  const userId = session?.user?.id
  if (!userId) redirect("/login?callbackUrl=/admin")
  const email = session?.user?.email?.trim().toLowerCase()

  if (!env.appAdminEmails) {
    throw new Error("APP_ADMIN_EMAILS is required for admin routes")
  }

  if (!isAdminEmail(email)) {
    redirect("/dashboard")
  }
  return { email: email || "", userId }
}

const getWorkspaceSessionContextImpl = async (): Promise<WorkspaceSessionContext> => {
  const session = await getAuthenticatedSession().catch(() => null)
  const userId = session?.user?.id
  const email = session?.user?.email?.trim().toLowerCase()
  if (!userId || !email) throw new Error("auth_required")

  const names = toNames(session?.user?.name || "", email)
  const supabaseUserId = await ensureSupabaseUser({
    userId,
    email,
    fullName: names.fullName,
    imageUrl: session?.user?.image || null,
  })

  return {
    userId,
    email,
    fullName: names.fullName,
    firstName: names.firstName,
    imageUrl: session?.user?.image || null,
    role: getAuthRole(email),
    supabaseUserId,
  }
}

export const getWorkspaceSessionContext = cache(getWorkspaceSessionContextImpl)

export const toPublicAuthUser = (ctx: WorkspaceSessionContext) => ({
  email: ctx.email,
  fullName: ctx.fullName,
  firstName: ctx.firstName,
  role: ctx.role,
  imageUrl: ctx.imageUrl,
  linkedinMemberId: null as string | null,
  linkedinTokenExpiresAt: null as number | null,
})

export const ensureWorkspaceForEmail = async ({
  email,
  firstName,
}: {
  email: string
  firstName: string
}) => {
  const userId = await requireAuth().catch(() => "")
  if (!userId) throw new Error("auth_required")
  return ensureWorkspaceForUser({ userId, email, firstName })
}

export async function getCurrentWorkspace() {
  const userId = await requireAuth()
  const supabase = createServiceClient()

  const { data: membership } = await supabase
    .from("workspace_members")
    .select("workspace_id, role")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle()

  if (membership) return { workspaceId: membership.workspace_id, role: membership.role }

  const { data: workspaceId } = await supabase.rpc("create_personal_workspace", {
    p_user_id: userId,
    p_name: "Personal",
  })

  return { workspaceId: workspaceId || undefined, role: workspaceId ? "owner" : undefined }
}

export const resolveWorkspaceId = async (
  request: NextRequest,
  explicitWorkspaceId?: string,
  context?: WorkspaceSessionContext,
): Promise<string> => {
  const ctx = context ?? await getWorkspaceSessionContext()
  const url = new URL(request.url)
  let requestedWorkspaceId = explicitWorkspaceId || url.searchParams.get("workspaceKey")

  if (!explicitWorkspaceId && !requestedWorkspaceId && request.method !== "GET") {
    try {
      const body = await request.clone().json()
      requestedWorkspaceId = body.workspaceKey
    } catch {
      // ignore
    }
  }

  if (
    requestedWorkspaceId &&
    requestedWorkspaceId !== "null" &&
    requestedWorkspaceId !== "undefined"
  ) {
    const memberships = await supabaseSelect<{ workspace_id: string }>(
      "workspace_members",
      `user_id=eq.${encodeURIComponent(ctx.supabaseUserId)}&workspace_id=eq.${encodeURIComponent(requestedWorkspaceId)}&select=workspace_id&limit=1`
    )
    if (memberships?.length) return requestedWorkspaceId
    throw new Error("unauthorized_workspace")
  }

  return ensureWorkspaceForUser({ userId: ctx.supabaseUserId, email: ctx.email, firstName: ctx.firstName })
}

const higherPlan = (a: string, b: string) => {
  const normA = a.toLowerCase()
  const normB = b.toLowerCase()
  return (PLAN_PRIORITY[normB] ?? 0) > (PLAN_PRIORITY[normA] ?? 0) ? b : a
}

const toTitleCasePlan = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()

type UserPlanInfo = { plan: string; expiresAt: string | null }

const fetchUsersPlanByMemberId = async (memberId: string): Promise<UserPlanInfo | null> => {
  try {
    const users = await supabaseSelect<{ plan: string | null; external_user_id: string | null; plan_expires_at: string | null }>(
      "users",
      `id=eq.${encodeURIComponent(memberId)}&select=plan,external_user_id,plan_expires_at&limit=1`
    )
    const user = users?.[0]
    if (!user) return null

    // users.plan is updated on payment - use it if it's above free and not expired
    const userPlan = user.plan?.toLowerCase()
    if (userPlan && userPlan !== "free") {
      const expired = isPlanExpired(user.plan_expires_at)
      if (!expired) return { plan: toTitleCasePlan(userPlan), expiresAt: user.plan_expires_at }
      return null
    }

    // Fall back to plan_usage - try both internal and external user IDs
    const idsToTry = [memberId, user.external_user_id].filter(Boolean) as string[]
    for (const uid of idsToTry) {
      const usage = await supabaseSelect<{ plan: string }>(
        "plan_usage",
        `user_id=eq.${encodeURIComponent(uid)}&select=plan&limit=1`
      ).catch(() => null)
      const usagePlan = usage?.[0]?.plan?.toLowerCase()
      if (usagePlan && usagePlan !== "free") return { plan: toTitleCasePlan(usagePlan), expiresAt: null }
    }
    return null
  } catch {
    return null
  }
}

const fetchBaseWorkspacePlan = async (workspaceId: string): Promise<WorkspacePlanInfo> => {
  try {
    const workspaces = await supabaseSelect<{ organization_id: string }>(
      "workspaces",
      `id=eq.${encodeURIComponent(workspaceId)}&select=organization_id&limit=1`
    )
    const orgId = workspaces?.[0]?.organization_id

    if (!orgId) {
      // Personal workspace - read plan from workspace member's user record
      const members = await supabaseSelect<{ user_id: string }>(
        "workspace_members",
        `workspace_id=eq.${encodeURIComponent(workspaceId)}&select=user_id&limit=1`
      ).catch(() => null)
      const memberId = members?.[0]?.user_id
      const userPlan = memberId ? await fetchUsersPlanByMemberId(memberId) : null
      return { plan: userPlan?.plan ?? "Free", status: "active", expiresAt: userPlan?.expiresAt ?? null }
    }

    const orgs = await supabaseSelect<{ plan: string; subscription_status: string; plan_expires_at: string | null }>(
      "organizations",
      `id=eq.${encodeURIComponent(orgId)}&select=plan,subscription_status,plan_expires_at&limit=1`
    )
    const org = orgs?.[0]
    if (!org) return { plan: "Free", status: "active", expiresAt: null }
    const expired = Boolean(org.plan_expires_at && isPlanExpired(org.plan_expires_at) && org.plan !== "Free")
    if (expired) {
      await supabasePatch("organizations", `id=eq.${encodeURIComponent(orgId)}`, {
        plan: "Free",
        subscription_status: "canceled",
        updated_at: new Date().toISOString(),
      }).catch(() => undefined)
      return {
        plan: "Free",
        status: "canceled",
        expiresAt: org.plan_expires_at ?? null,
        planExpired: true,
      }
    }

    // Take the higher of org plan vs user's direct plan record (handles sync lag)
    const orgPlan = org.plan || "Free"
    const members = await supabaseSelect<{ user_id: string }>(
      "workspace_members",
      `workspace_id=eq.${encodeURIComponent(workspaceId)}&select=user_id&limit=1`
    ).catch(() => null)
    const memberId = members?.[0]?.user_id
    const userPlan = memberId ? await fetchUsersPlanByMemberId(memberId) : null
    const effectivePlan = userPlan ? higherPlan(orgPlan, userPlan.plan) : orgPlan
    const usesDirectUserPlan = Boolean(userPlan && effectivePlan.toLowerCase() === userPlan.plan.toLowerCase() && (PLAN_PRIORITY[userPlan.plan.toLowerCase()] ?? 0) > (PLAN_PRIORITY[orgPlan.toLowerCase()] ?? 0))

    return {
      plan: effectivePlan,
      status: org.subscription_status || "active",
      expiresAt: usesDirectUserPlan ? userPlan?.expiresAt ?? null : org.plan_expires_at ?? null,
      planExpired: false,
    }
  } catch {
    return { plan: "Free", status: "active", expiresAt: null }
  }
}

export const fetchWorkspacePlan = async (workspaceId: string, email?: string | null) =>
  applyUserOverrides(await fetchBaseWorkspacePlan(workspaceId), email)

// Resolves the authoritative effective plan.  Delegates final authority to
// getCanonicalPlan() (plan_usage / users.plan / overrides) so there is
// exactly one code path for plan resolution across the entire app.
export async function resolveEffectivePlan(
  workspaceId: string,
  email: string | null,
  internalUserId?: string | null,
): Promise<ReturnType<typeof applyUserOverrides> extends Promise<infer T> ? T : never> {
  const wsInfo = await fetchWorkspacePlan(workspaceId, email)
  if (wsInfo.overrideActive) return wsInfo

  if (internalUserId) {
    try {
      const { getCanonicalPlan } = await import("@/lib/server/plan-limits-v2")
      const canonical = await getCanonicalPlan(internalUserId)
      if ((PLAN_PRIORITY[canonical.toLowerCase()] ?? 0) > (PLAN_PRIORITY[wsInfo.plan.toLowerCase()] ?? 0)) {
        const directPlan = await fetchUsersPlanByMemberId(internalUserId)
        // Derive featureFlags from the canonical plan's entitlements so they are
        // never empty when the override wasn't found via the email/workspace path.
        const { getPlanLimits } = await import("@/lib/entitlements")
        const limits = getPlanLimits(canonical)
        const derivedFlags: Record<string, boolean> = {
          scheduling: limits.scheduling,
          analytics: limits.analyticsDepth === "full",
          carouselBuilder: (limits.carouselGenerationsPerMonth as number) > 0,
          competitorResearch: (limits.researchRunsPerMonth as number) > 0,
          approvalWorkflow: limits.approvals,
          exportPdf: limits.canExport,
          voiceProfiles: limits.voiceTraining,
        }
        return {
          ...wsInfo,
          plan: canonical,
          expiresAt: directPlan?.plan.toLowerCase() === canonical.toLowerCase() ? directPlan.expiresAt : wsInfo.expiresAt,
          featureFlags: { ...derivedFlags, ...(wsInfo.featureFlags ?? {}) },
        }
      }
    } catch {
      // Fall through to workspace plan.
    }
  }

  return wsInfo
}
