import { NextRequest } from "next/server"
import { env } from "@/lib/server/env"
import { createSignedToken, readSignedToken } from "@/lib/server/token"

type AppSessionPayload = {
  email: string
  fullName: string
  firstName: string
  role: "admin" | "user"
  imageUrl: string | null
  linkedinMemberId: string | null
  linkedinAccessToken: string | null
  linkedinTokenExpiresAt: number | null
  createdAt: number
}

type PublicAuthUser = Omit<
  AppSessionPayload,
  "createdAt" | "linkedinAccessToken" | "linkedinMemberId"
>

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

import { supabaseSelect } from "@/lib/server/supabase-rest"

export const createAppSession = async ({
  email,
  name,
  imageUrl = null,
  linkedinMemberId = null,
  linkedinAccessToken = null,
  linkedinTokenExpiresAt = null,
}: {
  email: string
  name: string
  imageUrl?: string | null
  linkedinMemberId?: string | null
  linkedinAccessToken?: string | null
  linkedinTokenExpiresAt?: number | null
}) => {
  const normalizedEmail = email.trim().toLowerCase()
  const names = toNames(name, normalizedEmail)
  
  // Elite security: Database-backed admin role check
  let role: "admin" | "user" = "user"
  try {
    const adminRows = await supabaseSelect<{ email: string }>("admins", `email=eq.${encodeURIComponent(normalizedEmail)}&limit=1`)
    if (adminRows && adminRows.length > 0) role = "admin"
  } catch {
    // Fallback to legacy env if DB query fails during migration
    if (ADMIN_EMAILS.includes(normalizedEmail)) role = "admin"
  }

  const payload: AppSessionPayload = {
    email: normalizedEmail || "local-default@qalam.local",
    fullName: names.fullName,
    firstName: names.firstName,
    role,
    imageUrl,
    linkedinMemberId,
    linkedinAccessToken,
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
  linkedinTokenExpiresAt: session.linkedinTokenExpiresAt,
})

export const requireAppSession = (request: NextRequest) => {
  const session = getAppSession(request)
  if (!session?.email) throw new Error("auth_required")
  return session
}

export const resolveWorkspaceKey = (request: NextRequest) => {
  const session = requireAppSession(request)
  return session.email
}
