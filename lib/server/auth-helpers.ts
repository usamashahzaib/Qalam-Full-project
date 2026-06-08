import { auth } from "@/auth"
import { createServiceClient } from "@/lib/server/supabase-rest"

export type AuthUser = {
  userId: string
  email: string
  name: string
  image: string | null
  plan: string
  role: string
}

export async function requireAuth(): Promise<string> {
  const session = await auth()
  if (!session?.user?.id) {
    throw new Error("Unauthorized")
  }
  return session.user.id
}

export async function requireAuthWithUser(): Promise<AuthUser> {
  const session = await auth()
  if (!session?.user?.email) {
    throw new Error("Unauthorized")
  }

  const supabase = createServiceClient()
  const { data: existingUser } = await supabase
    .from("users")
    .select("id, email, name, avatar_url, plan, role")
    .eq("email", session.user.email)
    .single()

  if (existingUser) {
    return {
      userId: existingUser.id,
      email: existingUser.email,
      name: existingUser.name || session.user.name || "",
      image: existingUser.avatar_url || session.user.image || null,
      plan: existingUser.plan || "free",
      role: existingUser.role || "user",
    }
  }

  // Create new user on first sign-in
  const newUser = {
    id: crypto.randomUUID(),
    email: session.user.email,
    name: session.user.name || "",
    avatar_url: session.user.image || "",
    plan: "free",
    role: "user",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  const { error } = await supabase.from("users").insert(newUser)
  if (error) {
    console.error("[auth-helpers] Failed to create user:", error)
    throw new Error("Failed to create user account")
  }

  return {
    userId: newUser.id,
    email: newUser.email,
    name: newUser.name,
    image: newUser.avatar_url || null,
    plan: newUser.plan,
    role: newUser.role,
  }
}

export async function isAdmin(): Promise<boolean> {
  const session = await auth()
  if (!session?.user?.email) return false

  const adminEmails = process.env.APP_ADMIN_EMAILS?.split(",").map((e) => e.trim()) || []
  return adminEmails.includes(session.user.email)
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    return await requireAuthWithUser()
  } catch {
    return null
  }
}
