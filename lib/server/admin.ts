import { notFound } from "next/navigation"
import { NextRequest } from "next/server"
import { appSessionCookieName, readAppSession, requireAppSession } from "@/lib/server/app-session"

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "")
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean)

export const isAdminEmail = (email?: string | null) =>
  Boolean(email && ADMIN_EMAILS.includes(email.trim().toLowerCase()))

const safeEqual = (left: string, right: string) => {
  if (!left || !right || left.length !== right.length) return false
  let diff = 0
  for (let i = 0; i < left.length; i++) diff |= left.charCodeAt(i) ^ right.charCodeAt(i)
  return diff === 0
}

export const hasValidAdminKey = (key?: string | null) =>
  Boolean(process.env.ADMIN_SECRET_KEY && key && safeEqual(key, process.env.ADMIN_SECRET_KEY))

export const requireAdminRequest = (request: NextRequest) => {
  const session = requireAppSession(request)
  if (!isAdminEmail(session.email) || !hasValidAdminKey(request.headers.get("x-admin-key"))) throw new Error("not_found")
  return session
}

export const requireAdminToken = (token?: string, adminKey?: string | null) => {
  let session = null
  try {
    session = token ? readAppSession(token) : null
  } catch {
    session = null
  }
  if (!isAdminEmail(session?.email) || !hasValidAdminKey(adminKey)) notFound()
  return session
}

export const requireAdminPageToken = (token?: string) => {
  let session = null
  try {
    session = token ? readAppSession(token) : null
  } catch {
    session = null
  }
  if (!isAdminEmail(session?.email)) notFound()
  return session
}

export { appSessionCookieName }
