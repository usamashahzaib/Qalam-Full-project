import { auth } from "@clerk/nextjs/server"
import { createClient } from "@supabase/supabase-js"
import { hasValidClerkPublishableKey } from "@/lib/clerk-env"

export async function getAuthenticatedUser() {
  if (!hasValidClerkPublishableKey()) return null
  try {
    const { userId } = await auth()
    return userId || null
  } catch {
    return null
  }
}

export async function getSupabaseForUser() {
  const userId = await getAuthenticatedUser()
  if (!userId) return null

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { "X-Clerk-User-Id": userId } } }
  )
  return { supabase, userId }
}

export async function requireAuth() {
  const userId = await getAuthenticatedUser()
  if (!userId) throw new Error("Unauthorized")
  return userId
}
