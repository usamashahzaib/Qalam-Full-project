import { NextRequest } from "next/server"
import { createSignedToken, readSignedToken } from "@/lib/server/token"
import { supabaseInsert, supabaseSelect, supabasePatch } from "@/lib/server/supabase-rest"
import { applyUserOverrides } from "@/lib/server/overrides"

type AppSessionPayload = {
  email: string
  fullName: string
  firstName: string
  role: "admin" | "user"
  imageUrl: string | null
  linkedinMemberId: string | null
  linkedinTokenExpiresAt: number | null
  sessionVersion: number
  createdAt: number
}

type PublicAuthUser = Omit<AppSessionPayload, "createdAt">

export const appSessionCookieName = "qalam_app_session"
const APP_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "")
  .split(",")
  .map((item) => item.trim().toLowerCase())
  .filter(Boolean)

const toNames = (name: string, email: string) => {
  const trimmed = name.trim() || email.split("@")[0] || "User"
  return {
    fullName: trimmed,
    firstName: trimmed.split(" ")[0] || "User",
  }
}

export const createAppSession = async ({
  email,
  name,
  imageUrl = null,
  linkedinMemberId = null,
  linkedinTokenExpiresAt = null,
}: {
  email: string
  name: string
  imageUrl?: string | null
  linkedinMemberId?: string | null
  linkedinTokenExpiresAt?: number | null
}) => {
  const normalizedEmail = email.trim().toLowerCase()
  const names = toNames(name, normalizedEmail)

  let role: "admin" | "user" = "user"
  if (ADMIN_EMAILS.includes(normalizedEmail)) role = "admin"

  let sessionVersion = 1
  try {
    const existingUser = await supabaseSelect<{ id: string; email: string; session_version: number }>(
      "users",
      `email=eq.${encodeURIComponent(normalizedEmail)}&select=id,email,session_version&limit=1`
    )
    if (!existingUser || existingUser.length === 0) {
      const created = await supabaseInsert<{ id: string; session_version: number }>(
        "users",
        {
          email: normalizedEmail,
          full_name: names.fullName,
          image_url: imageUrl,
        },
        "return=representation&resolution=ignore-duplicates"
      )
      sessionVersion = created?.[0]?.session_version ?? 1
    } else {
      sessionVersion = existingUser[0].session_version ?? 1
    }
  } catch (err) {
    console.error("failed_to_provision_user", err)
  }

  const payload: AppSessionPayload = {
    email: normalizedEmail || "local-default@qalam.local",
    fullName: names.fullName,
    firstName: names.firstName,
    role,
    imageUrl,
    linkedinMemberId,
    linkedinTokenExpiresAt,
    sessionVersion,
    createdAt: Date.now(),
  }

  return {
    token: createSignedToken(payload),
    payload,
    maxAge: APP_SESSION_MAX_AGE_SECONDS,
  }
}

export const readAppSession = (token: string) =>
  readSignedToken<AppSessionPayload>(token, "app_session_invalid")

export const getSessionToken = (request: NextRequest) => {
  const header = request.headers.get("Authorization")?.trim()
  const bearer = header?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim()
  return bearer || header || request.cookies.get(appSessionCookieName)?.value || null
}

export const getAppSession = (request: NextRequest) => {
  const token = getSessionToken(request)
  if (!token) return null
  try {
    return readAppSession(token)
  } catch {
    return null
  }
}

export const toPublicAuthUser = (session: AppSessionPayload): PublicAuthUser => ({
  email: session.email,
  fullName: session.fullName,
  firstName: session.firstName,
  role: session.role,
  imageUrl: session.imageUrl,
  linkedinMemberId: session.linkedinMemberId,
  linkedinTokenExpiresAt: session.linkedinTokenExpiresAt,
  sessionVersion: session.sessionVersion,
})

export const requireAppSession = (request: NextRequest) => {
  const session = getAppSession(request)
  if (!session?.email) throw new Error("auth_required")
  return session
}

export const requireAuth = async (request: NextRequest) => {
  const session = requireAppSession(request)
  try {
    await validateSessionVersion(session)
  } catch {
    throw new Error("auth_required")
  }
  const workspaceId = await resolveWorkspaceId(request)
  const users = await supabaseSelect<{ id: string }>(
    "users",
    `email=eq.${encodeURIComponent(session.email)}&select=id&limit=1`
  )
  const userId = users?.[0]?.id
  if (!userId) throw new Error("auth_required")
  const { plan } = await fetchWorkspacePlan(workspaceId, session.email)
  return { userId, email: session.email, plan }
}

export const validateSessionVersion = async (session: AppSessionPayload): Promise<void> => {
  try {
    const users = await supabaseSelect<{ session_version: number }>(
      "users",
      `email=eq.${encodeURIComponent(session.email)}&select=session_version&limit=1`
    )
    const dbVersion = users?.[0]?.session_version ?? 1
    const tokenVersion = session.sessionVersion ?? 1
    if (tokenVersion < dbVersion) throw new Error("session_invalidated")
  } catch (err) {
    if ((err as Error).message === "session_invalidated") throw err
    // DB unreachable - allow through rather than locking users out on infra issues
  }
}

export const incrementSessionVersion = async (email: string): Promise<void> => {
  const normalizedEmail = email.trim().toLowerCase()
  const users = await supabaseSelect<{ id: string; session_version: number }>(
    "users",
    `email=eq.${encodeURIComponent(normalizedEmail)}&select=id,session_version&limit=1`
  )
  const user = users?.[0]
  if (!user) return
  await supabasePatch(
    "users",
    `id=eq.${user.id}`,
    { session_version: (user.session_version ?? 1) + 1 }
  )
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

export const resolveWorkspaceId = async (request: NextRequest): Promise<string> => {
  const session = requireAppSession(request)
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

  let users: { id: string }[]
  try {
    users = await supabaseSelect<{ id: string }>(
      "users",
      `email=eq.${encodeURIComponent(session.email)}&limit=1`
    )
  } catch (error) {
    const message = (error as Error).message || "server_error"
    if (message === "schema_not_applied") throw error
    throw new Error(message)
  }
  const userId = users?.[0]?.id
  if (!userId) throw new Error("auth_required")

  if (
    requestedWorkspaceId &&
    requestedWorkspaceId !== "null" &&
    requestedWorkspaceId !== "undefined" &&
    !requestedWorkspaceId.startsWith("client:")
  ) {
    const memberships = await supabaseSelect<{ workspace_id: string }>(
      "memberships",
      `user_id=eq.${userId}&workspace_id=eq.${requestedWorkspaceId}&limit=1`
    )
    if (memberships?.length) return requestedWorkspaceId
    throw new Error("unauthorized_workspace")
  }

  return ensureWorkspaceForEmail({ email: session.email, firstName: session.firstName })
}

export const resolveWorkspaceKey = (request: NextRequest) => {
  const session = requireAppSession(request)
  return session.email
}

export type WorkspacePlanInfo = {
  plan: string
  status: string
  expiresAt: string | null
  planExpired?: boolean
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
