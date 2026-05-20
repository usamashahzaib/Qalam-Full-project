import { NextRequest } from "next/server"
import { env } from "@/lib/server/env"
import { createSignedToken, readSignedToken } from "@/lib/server/token"
import { supabaseInsert, supabaseSelect } from "@/lib/server/supabase-rest"

type AppSessionPayload = {
  email: string
  fullName: string
  firstName: string
  role: "admin" | "user"
  imageUrl: string | null
  linkedinMemberId: string | null
  linkedinTokenExpiresAt: number | null
  createdAt: number
}

type PublicAuthUser = Omit<AppSessionPayload, "createdAt">

export const appSessionCookieName = "qalam_app_session"
const APP_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7
const ADMIN_EMAILS = (process.env.APP_ADMIN_EMAILS || "")
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

  try {
    const existingUser = await supabaseSelect<{ id: string; email: string }>(
      "users",
      `email=eq.${encodeURIComponent(normalizedEmail)}&limit=1`
    )
    if (!existingUser || existingUser.length === 0) {
      await supabaseInsert(
        "users",
        {
          email: normalizedEmail,
          full_name: names.fullName,
          image_url: imageUrl,
        },
        "resolution=ignore-duplicates"
      )
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

export const getAppSession = (request: NextRequest) => {
  const token = request.cookies.get(appSessionCookieName)?.value
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
})

export const requireAppSession = (request: NextRequest) => {
  const session = getAppSession(request)
  if (!session?.email) throw new Error("auth_required")
  return session
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
