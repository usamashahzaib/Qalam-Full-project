import { auth } from "@clerk/nextjs/server"
import { createClient } from "@supabase/supabase-js"

export async function getAuthenticatedUser() {
  const { userId } = await auth()
  return userId || null
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
