import { NextRequest } from "next/server"
import { notFound } from "next/navigation"
import { supabaseSelect, supabasePatch } from "@/lib/server/supabase-rest"
import { createServiceClient } from "@/lib/server/supabase-rest"
import { applyUserOverrides } from "@/lib/server/overrides"
import { auth } from "@/auth"

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
  const adminEmails = ["usama@byqalam.com", "admin@byqalam.com"]
  return adminEmails.includes(email.trim().toLowerCase()) || email.endsWith("@byqalam.com")
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

  const { data: newUser, error } = await supabase
    .from("users")
    .insert({
      email,
      external_user_id: userId,
      full_name: fullName,
      image_url: imageUrl,
      plan: "Free",
    })
    .select("id")
    .single()

  if (error || !newUser) {
    throw new Error("failed_to_ensure_user")
  }
  return newUser.id
}

async function getOrCreateWorkspaceForUser(userId: string) {
  const supabase = createServiceClient()
  const { data: membership } = await supabase
    .from("workspace_members")
    .select("workspace_id, role")
    .eq("user_id", userId)
    .single()

  if (membership) return membership.workspace_id

  const { data: workspaceId } = await supabase.rpc("create_personal_workspace", {
    p_user_id: userId,
    p_name: "Personal",
  })
  return workspaceId || null
}

export async function ensureWorkspaceForUser({
  userId,
}: {
  userId: string
  firstName?: string
}): Promise<string> {
  const workspaceId = await getOrCreateWorkspaceForUser(userId)
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
  if (!isAdminEmail(email)) notFound()
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
  return ensureWorkspaceForUser({ userId, firstName })
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
    requestedWorkspaceId !== "undefined" &&
    !requestedWorkspaceId.startsWith("client:")
  ) {
    const memberships = await supabaseSelect<{ workspace_id: string }>(
      "workspace_members",
      `user_id=eq.${encodeURIComponent(ctx.supabaseUserId)}&workspace_id=eq.${encodeURIComponent(requestedWorkspaceId)}&select=workspace_id&limit=1`
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
