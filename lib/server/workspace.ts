import { NextRequest } from "next/server"
import { notFound } from "next/navigation"
import { auth, currentUser } from "@clerk/nextjs/server"
import { supabaseInsert, supabaseSelect, supabasePatch } from "@/lib/server/supabase-rest"
import { applyUserOverrides } from "@/lib/server/overrides"

const ADMIN_EMAILS = (process.env.APP_ADMIN_EMAILS || process.env.ADMIN_EMAILS || "")
  .split(",")
  .map((item) => item.trim().toLowerCase())
  .filter(Boolean)

export type WorkspacePlanInfo = {
  plan: string
  status: string
  expiresAt: string | null
  planExpired?: boolean
}

export type ClerkAuthContext = {
  clerkUserId: string
  email: string
  fullName: string
  firstName: string
  imageUrl: string | null
  role: "admin" | "user"
  supabaseUserId: string
}

const toNames = (name: string, email: string) => {
  const trimmed = name.trim() || email.split("@")[0] || "User"
  return {
    fullName: trimmed,
    firstName: trimmed.split(" ")[0] || "User",
  }
}

export const getClerkRole = (email: string): "admin" | "user" =>
  ADMIN_EMAILS.includes(email.trim().toLowerCase()) ? "admin" : "user"

export const isAdminEmail = (email?: string | null) =>
  Boolean(email && ADMIN_EMAILS.includes(email.trim().toLowerCase()))

export const requireAdminRequest = async (_request: NextRequest) => {
  const { userId } = await auth()
  if (!userId) throw new Error("not_found")
  const user = await currentUser()
  const email = user?.primaryEmailAddress?.emailAddress?.trim().toLowerCase()
  if (!isAdminEmail(email)) throw new Error("not_found")
  return { email: email || "", userId }
}

export const requireAdminPage = async () => {
  const { userId } = await auth()
  if (!userId) notFound()
  const user = await currentUser()
  const email = user?.primaryEmailAddress?.emailAddress?.trim().toLowerCase()
  if (!isAdminEmail(email)) notFound()
  return { email: email || "", userId }
}

export const ensureSupabaseUser = async ({
  clerkUserId,
  email,
  fullName,
  imageUrl = null,
}: {
  clerkUserId: string
  email: string
  fullName: string
  imageUrl?: string | null
}) => {
  const normalizedEmail = email.trim().toLowerCase()
  const byClerk = await supabaseSelect<{ id: string }>(
    "users",
    `clerk_user_id=eq.${encodeURIComponent(clerkUserId)}&select=id&limit=1`
  ).catch(() => [])
  if (byClerk?.[0]?.id) return byClerk[0].id

  const byEmail = await supabaseSelect<{ id: string }>(
    "users",
    `email=eq.${encodeURIComponent(normalizedEmail)}&select=id&limit=1`
  ).catch(() => [])

  if (byEmail?.[0]?.id) {
    await supabasePatch("users", `id=eq.${byEmail[0].id}`, {
      clerk_user_id: clerkUserId,
      full_name: fullName,
      image_url: imageUrl,
      updated_at: new Date().toISOString(),
    }).catch(() => undefined)
    return byEmail[0].id
  }

  const created = await supabaseInsert<{ id: string }>(
    "users",
    {
      clerk_user_id: clerkUserId,
      email: normalizedEmail,
      full_name: fullName,
      image_url: imageUrl,
    },
    "return=representation"
  )
  const userId = created?.[0]?.id
  if (!userId) throw new Error("auth_required")
  return userId
}

export const getClerkAuthContext = async (): Promise<ClerkAuthContext> => {
  const { userId: clerkUserId } = await auth()
  if (!clerkUserId) throw new Error("auth_required")

  const user = await currentUser()
  const email = user?.primaryEmailAddress?.emailAddress?.trim().toLowerCase()
  if (!email) throw new Error("auth_required")

  const names = toNames(user?.fullName || user?.firstName || "", email)
  const supabaseUserId = await ensureSupabaseUser({
    clerkUserId,
    email,
    fullName: names.fullName,
    imageUrl: user?.imageUrl || null,
  })

  return {
    clerkUserId,
    email,
    fullName: names.fullName,
    firstName: names.firstName,
    imageUrl: user?.imageUrl || null,
    role: getClerkRole(email),
    supabaseUserId,
  }
}

export const toPublicAuthUser = (ctx: ClerkAuthContext) => ({
  email: ctx.email,
  fullName: ctx.fullName,
  firstName: ctx.firstName,
  role: ctx.role,
  imageUrl: ctx.imageUrl,
  linkedinMemberId: null as string | null,
  linkedinTokenExpiresAt: null as number | null,
})

export const ensureWorkspaceForUser = async ({
  userId,
  firstName,
}: {
  userId: string
  firstName: string
}) => {
  const memberships = await supabaseSelect<{ workspace_id: string }>(
    "memberships",
    `user_id=eq.${userId}&limit=1`
  )
  if (memberships?.[0]?.workspace_id) return memberships[0].workspace_id

  const orgs = await supabaseInsert<{ id: string }>(
    "organizations",
    { name: `${firstName}'s Org` },
    "return=representation"
  )
  const orgId = orgs?.[0]?.id

  const workspaces = await supabaseInsert<{ id: string }>(
    "workspaces",
    { organization_id: orgId, name: "Personal Workspace" },
    "return=representation"
  )
  const workspaceId = workspaces?.[0]?.id

  await supabaseInsert(
    "memberships",
    {
      user_id: userId,
      organization_id: orgId,
      workspace_id: workspaceId,
      role: "super_admin",
    },
    "return=minimal"
  )

  if (!workspaceId) throw new Error("failed_to_provision_workspace")
  return workspaceId
}

export const ensureWorkspaceForEmail = async ({
  email,
  firstName,
}: {
  email: string
  firstName: string
}) => {
  const normalizedEmail = email.trim().toLowerCase()
  const users = await supabaseSelect<{ id: string }>(
    "users",
    `email=eq.${encodeURIComponent(normalizedEmail)}&limit=1`
  )
  const userId = users?.[0]?.id
  if (!userId) throw new Error("auth_required")
  return ensureWorkspaceForUser({ userId, firstName })
}

export const resolveWorkspaceId = async (request: NextRequest): Promise<string> => {
  const ctx = await getClerkAuthContext()
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
    requestedWorkspaceId !== "undefined" &&
    !requestedWorkspaceId.startsWith("client:")
  ) {
    const memberships = await supabaseSelect<{ workspace_id: string }>(
      "memberships",
      `user_id=eq.${ctx.supabaseUserId}&workspace_id=eq.${requestedWorkspaceId}&limit=1`
    )
    if (memberships?.length) return requestedWorkspaceId
    throw new Error("unauthorized_workspace")
  }

  return ensureWorkspaceForUser({ userId: ctx.supabaseUserId, firstName: ctx.firstName })
}

const fetchBaseWorkspacePlan = async (workspaceId: string): Promise<WorkspacePlanInfo> => {
  try {
    const workspaces = await supabaseSelect<{ organization_id: string }>(
      "workspaces",
      `id=eq.${encodeURIComponent(workspaceId)}&select=organization_id&limit=1`
    )
    const orgId = workspaces?.[0]?.organization_id
    if (!orgId) return { plan: "Free", status: "active", expiresAt: null }
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
    return {
      plan: org.plan || "Free",
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
