import { randomUUID } from "node:crypto"
import { auth } from "@/auth"
import { createServiceClient } from "@/lib/server/supabase-rest"

type UserRow = {
  id: string
  email: string
  plan?: string | null
  role?: string | null
}

const unauthorized = () => new Error("Unauthorized")

const adminEmails = () =>
  (process.env.APP_ADMIN_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)

export async function requireAuth() {
  try {
    const session = await auth()
    const userId = session?.user?.id
    if (!userId) throw unauthorized()
    return userId
  } catch (error) {
    if ((error as Error).message === "Unauthorized") throw error
    throw unauthorized()
  }
}

export async function requireAuthWithUser() {
  try {
    const session = await auth()
    const email = session?.user?.email?.trim().toLowerCase()
    if (!session || !email) throw unauthorized()

    const supabase = createServiceClient()
    const { data: existing, error: selectError } = await supabase
      .from("users")
      .select("id,email,plan,role")
      .eq("email", email)
      .maybeSingle<UserRow>()

    if (selectError) throw new Error("auth_lookup_failed")

    const user = existing || (await createUser(supabase, session.user, email))

    return {
      userId: user.id,
      email: user.email,
      plan: user.plan || "free",
      role: user.role || "user",
    }
  } catch (error) {
    if ((error as Error).message === "Unauthorized") throw error
    throw new Error("Authentication unavailable")
  }
}

export async function isAdmin() {
  try {
    const session = await auth()
    const email = session?.user?.email?.trim().toLowerCase()
    return Boolean(email && adminEmails().includes(email))
  } catch {
    return false
  }
}

async function createUser(
  supabase: ReturnType<typeof createServiceClient>,
  user: { name?: string | null; image?: string | null },
  email: string
) {
  const now = new Date().toISOString()
  const payload = {
    id: randomUUID(),
    email,
    name: user.name || "",
    avatar_url: user.image || "",
    plan: "free",
    role: "user",
    created_at: now,
    updated_at: now,
  }

  const { data, error } = await supabase
    .from("users")
    .insert(payload)
    .select("id,email,plan,role")
    .single<UserRow>()

  if (error || !data) throw new Error("auth_create_failed")
  return data
}
