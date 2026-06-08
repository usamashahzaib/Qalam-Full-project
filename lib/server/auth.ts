import { auth } from "@/auth"
import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "./supabase-rest"

export async function requireAuthApi(request: NextRequest) {
  const session = await auth()

  if (!session?.user?.id) {
    return {
      userId: null,
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      session: null,
    }
  }

  const supabase = createServiceClient()
  const { data: user } = await supabase
    .from("users")
    .select("id, plan, email, remaining_drafts, plan_expires_at")
    .eq("id", session.user.id)
    .single()

  if (!user) {
    const newUser = {
      id: session.user.id,
      email: session.user.email || "",
      name: session.user.name || "",
      avatar_url: session.user.image || "",
      plan: "free",
      role: "user",
      remaining_drafts: 10,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    await supabase.from("users").insert(newUser)

    return {
      userId: session.user.id,
      error: null,
      session: { ...session.user, plan: "free", remaining_drafts: 10 },
    }
  }

  const expired = user.plan_expires_at && new Date(user.plan_expires_at) < new Date()
  const effectivePlan = expired ? "free" : user.plan

  return {
    userId: session.user.id,
    error: null,
    session: { ...session.user, plan: effectivePlan, remaining_drafts: user.remaining_drafts },
  }
}

export function withAuth(
  handler: (req: NextRequest, user: any) => Promise<NextResponse>
) {
  return async (req: NextRequest) => {
    try {
      const { userId, error, session } = await requireAuthApi(req)
      if (error) return error
      if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      return await handler(req, session)
    } catch (err) {
      console.error("[API Error]", err)
      return NextResponse.json(
        { error: "Internal server error", message: (err as Error).message },
        { status: 500 }
      )
    }
  }
}
