// lib/server/auth.ts
// CORRECTED - matches your actual schema with external_user_id and plan_usage

import { auth } from "@/auth"
import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "./supabase-rest"

export async function requireAuthApi(request: NextRequest) {
  const session = await auth()

  if (!session?.user?.id) {
    return {
      userId: null,
      externalUserId: null,
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      session: null
    }
  }

  const supabase = createServiceClient()
  const externalId = session.user.id // Next-Auth ID (LinkedIn ID)

  // Look up internal user by external_user_id
  const { data: user } = await supabase
    .from("users")
    .select("id, external_user_id, email, name, avatar_url")
    .eq("external_user_id", externalId)
    .single()

  if (!user) {
    // Auto-create user with internal UUID
    const internalId = crypto.randomUUID()
    const newUser = {
      id: internalId,
      external_user_id: externalId,
      email: session.user.email || "",
      name: session.user.name || "",
      avatar_url: session.user.image || "",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    await supabase.from("users").insert(newUser)

    // Create plan_usage record
    await supabase.from("plan_usage").insert({
      user_id: externalId,
      plan: "free",
      ai_drafts_used: 0,
      carousels_used: 0,
      hooks_used: 0,
      analyses_used: 0,
    })

    // Create default workspace for user
    const workspaceId = crypto.randomUUID()
    await supabase.from("workspaces").insert({
      id: workspaceId,
      name: "My Workspace",
      slug: `workspace-${externalId.slice(0, 8)}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

    // Create membership
    await supabase.from("memberships").insert({
      workspace_id: workspaceId,
      user_id: internalId,
      role: "owner",
      invited_at: new Date().toISOString(),
      joined_at: new Date().toISOString(),
    })

    return {
      userId: internalId,
      externalUserId: externalId,
      error: null,
      session: {
        id: externalId,
        internalId: internalId,
        email: session.user.email,
        name: session.user.name,
        plan: "free",
        workspaceId: workspaceId,
      }
    }
  }

  // Get plan usage
  const { data: planUsage } = await supabase
    .from("plan_usage")
    .select("plan, ai_drafts_used, carousels_used, hooks_used, analyses_used, cycle_end")
    .eq("user_id", externalId)
    .single()

  // Get user's workspace
  const { data: membership } = await supabase
    .from("memberships")
    .select("workspace_id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .single()

  const plan = planUsage?.plan || "free"
  const workspaceId = membership?.workspace_id || null

  return {
    userId: user.id,
    externalUserId: externalId,
    error: null,
    session: {
      id: externalId,
      internalId: user.id,
      email: user.email || session.user.email,
      name: user.name || session.user.name,
      plan: plan,
      workspaceId: workspaceId,
      avatarUrl: user.avatar_url || session.user.image,
    }
  }
}

export function withAuth(handler: (req: NextRequest, user: any) => Promise<NextResponse>) {
  return async (req: NextRequest) => {
    try {
      const { userId, externalUserId, error, session } = await requireAuthApi(req)
      if (error) return error
      if (!userId || !externalUserId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
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