import { notFound } from "next/navigation"
import { NextRequest } from "next/server"
import { auth, currentUser } from "@clerk/nextjs/server"

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

export const requireAdminRequest = async (request: NextRequest) => {
  const { userId } = await auth()
  if (!userId) throw new Error("not_found")
  const user = await currentUser()
  const email = user?.primaryEmailAddress?.emailAddress?.trim().toLowerCase()
  if (!isAdminEmail(email) || !hasValidAdminKey(request.headers.get("x-admin-key"))) {
    throw new Error("not_found")
  }
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
