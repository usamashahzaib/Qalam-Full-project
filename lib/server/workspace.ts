import { NextRequest } from "next/server"
import { notFound } from "next/navigation"
import { supabaseSelect, supabasePatch } from "@/lib/server/supabase-rest"
import { createServiceClient } from "@/lib/server/supabase-rest"
import { applyUserOverrides } from "@/lib/server/overrides"
import { auth } from "@/auth"
import { PLAN_PRIORITY } from "@/lib/server/plan-limits-v2"
import { env } from "@/lib/server/env"
import { log } from "@/lib/server/logging"

export async function getAuthenticatedSession() {
  return await auth()
}

export async function requireAuth(): Promise<string> {
  const session = await auth()
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

export async function ensureSupabaseUser({
  userId,
  email,
  fullName,
  imageUrl,
}: {
  userId: string
  email: string
  fullName: string
  imageUrl: string | null
}): Promise<string> {
  const supabase = createServiceClient()
  
  const { data: userByExt } = await supabase
    .from("users")
    .select("id")
    .eq("external_user_id", userId)
    .maybeSingle()

  if (userByExt) return userByExt.id

  const { data: userByEmail } = await supabase
    .from("users")
    .select("id, external_user_id")
    .eq("email", email)
    .maybeSingle()

  if (userByEmail) {
    if (!userByEmail.external_user_id) {
      await supabase
        .from("users")
        .update({ external_user_id: userId, full_name: fullName, image_url: imageUrl })
        .eq("id", userByEmail.id)
    }
    return userByEmail.id
  }

  // UPSERT on email to eliminate the check-then-insert race condition
  const { data: upserted, error } = await supabase
    .from("users")
    .upsert(
      {
        email,
        external_user_id: userId,
        full_name: fullName,
        image_url: imageUrl,
        plan: "Free",
      },
      { onConflict: "email", ignoreDuplicates: false }
    )
    .select("id")
    .single()

  if (error || !upserted) {
    throw new Error("failed_to_ensure_user")
  }
  return upserted.id
}

async function getOrCreateWorkspaceForUser(userId: string, ownerEmail?: string) {
  const supabase = createServiceClient()
  const { data: membership } = await supabase
    .from("workspace_members")
    .select("workspace_id, role")
    .eq("user_id", userId)
    .single()

  if (membership) return membership.workspace_id

  // Direct insert - includes owner_email to satisfy legacy NOT NULL constraint
  const wsPayload: Record<string, string> = { name: "Personal", owner_id: userId }
  if (ownerEmail) wsPayload.owner_email = ownerEmail

  const { data: ws, error: wsError } = await supabase
    .from("workspaces")
    .insert(wsPayload)
    .select("id")
    .single()

  if (wsError || !ws) {
    log.error("workspace.insert_failed", { error: wsError?.message, details: wsError?.details })
    return null
  }

  await supabase
    .from("workspace_members")
    .insert({ workspace_id: ws.id, user_id: userId, role: "owner" })

  return ws.id as string
}

export async function ensureWorkspaceForUser({
  userId,
  email,
}: {
  userId: string
  email?: string
  firstName?: string
}): Promise<string> {
  const workspaceId = await getOrCreateWorkspaceForUser(userId, email)
  if (!workspaceId) {
    throw new Error("failed_to_ensure_workspace")
  }
  return workspaceId
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
  const session = await getAuthenticatedSession()
  const userId = session?.user?.id || ""
  const email = session?.user?.email?.trim().toLowerCase()
  if (!isAdminEmail(email)) throw new Error("not_found")
  return { email: email || "", userId }
}

export const requireAdminPage = async () => {
  let userId = ""
  try {
    userId = await requireAuth()
  } catch {
    notFound()
  }
  const session = await getAuthenticatedSession()
  const email = session?.user?.email?.trim().toLowerCase()

  if (!env.appAdminEmails) {
    return { adminEmailsNotConfigured: true as const, email: email || "", userId }
  }

  if (!isAdminEmail(email)) {
    return { notAdmin: true as const, email: email || "", userId }
  }
  return { email: email || "", userId }
}

export const getWorkspaceSessionContext = async (): Promise<WorkspaceSessionContext> => {
  const session = await getAuthenticatedSession().catch(() => null)
  const userId = session?.user?.id || await requireAuth().catch(() => {
    throw new Error("auth_required")
  })
  const email = session?.user?.email?.trim().toLowerCase()
  if (!email) throw new Error("auth_required")

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
    .single()

  if (membership) return { workspaceId: membership.workspace_id, role: membership.role }

  const { data: workspaceId } = await supabase.rpc("create_personal_workspace", {
    p_user_id: userId,
    p_name: "Personal",
  })

  return { workspaceId: workspaceId || undefined, role: workspaceId ? "owner" : undefined }
}

export const resolveWorkspaceId = async (request: NextRequest): Promise<string> => {
  const ctx = await getWorkspaceSessionContext()
  const url = new URL(request.url)
  let requestedWorkspaceId = url.searchParams.get("workspaceKey")

  if (!requestedWorkspaceId && request.method !== "GET") {
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

const fetchUsersPlanByMemberId = async (memberId: string): Promise<string | null> => {
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
      const expired = user.plan_expires_at && new Date(user.plan_expires_at) < new Date()
      if (!expired) return toTitleCasePlan(userPlan)
    }

    // Fall back to plan_usage - try both internal and external user IDs
    const idsToTry = [memberId, user.external_user_id].filter(Boolean) as string[]
    for (const uid of idsToTry) {
      const usage = await supabaseSelect<{ plan: string }>(
        "plan_usage",
        `user_id=eq.${encodeURIComponent(uid)}&select=plan&limit=1`
      ).catch(() => null)
      const usagePlan = usage?.[0]?.plan?.toLowerCase()
      if (usagePlan && usagePlan !== "free") return toTitleCasePlan(usagePlan)
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
      return { plan: userPlan ?? "Free", status: "active", expiresAt: null }
    }

    const orgs = await supabaseSelect<{ plan: string; subscription_status: string; plan_expires_at: string | null }>(
      "organizations",
      `id=eq.${encodeURIComponent(orgId)}&select=plan,subscription_status,plan_expires_at&limit=1`
    )
    const org = orgs?.[0]
    if (!org) return { plan: "Free", status: "active", expiresAt: null }
    const expired = Boolean(org.plan_expires_at && new Date(org.plan_expires_at).getTime() < Date.now() && org.plan !== "Free")
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
    const effectivePlan = userPlan ? higherPlan(orgPlan, userPlan) : orgPlan

    return {
      plan: effectivePlan,
      status: org.subscription_status || "active",
      expiresAt: org.plan_expires_at ?? null,
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
        return { ...wsInfo, plan: canonical, featureFlags: { ...derivedFlags, ...(wsInfo.featureFlags ?? {}) } }
      }
    } catch {
      // Fall through to workspace plan.
    }
  }

  return wsInfo
}
