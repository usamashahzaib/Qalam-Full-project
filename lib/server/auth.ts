// lib/server/auth.ts
// Wraps NextAuth session into internal user context for API routes.
// withAuth logs all errors and 401s centrally — individual routes only need
// to add log.info for their success paths.

export type AuthSession = {
  id: string
  internalId: string
  email: string | undefined | null
  name: string | undefined | null
  plan: string
  workspaceId: string | null
  avatarUrl: string | undefined | null
  provider: string
}

import { auth } from "@/auth"
import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "./supabase-rest"
import { log } from "./logging"

async function provisionOAuthUser(
  supabase: ReturnType<typeof createServiceClient>,
  externalId: string,
  session: { user: { email?: string | null; name?: string | null; image?: string | null } }
) {
  const internalId = crypto.randomUUID()
  const newUser = {
    id: internalId,
    external_user_id: externalId,
    email: session.user.email || "",
    name: session.user.name || "",
    avatar_url: session.user.image || "",
    auth_provider: "oauth",
    email_verified: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  await supabase.from("users").insert(newUser)

  await supabase.from("plan_usage").insert({
    user_id: externalId,
    plan: "free",
    ai_drafts_used: 0,
    carousels_used: 0,
    hooks_used: 0,
    analyses_used: 0,
  })

  const workspaceId = crypto.randomUUID()
  await supabase.from("workspaces").insert({
    id: workspaceId,
    name: "My Workspace",
    owner_id: internalId,
    owner_email: session.user.email || "",
    slug: `workspace-${externalId.slice(0, 8)}`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  })
  await supabase.from("workspace_members").insert({
    workspace_id: workspaceId,
    user_id: internalId,
    role: "owner",
  })

  return { internalId, workspaceId }
}

export async function requireAuthApi(request: NextRequest) {
  const session = await auth()

  if (!session?.user?.id) {
    return {
      userId: null,
      externalUserId: null,
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      session: null,
    }
  }

  const supabase = createServiceClient()
  const provider = (session.user as { provider?: string }).provider ?? "linkedin"
  const tokenId = session.user.id

  // ── Credentials user: tokenId IS the internal Supabase UUID ─────────────────
  if (provider === "credentials") {
    const { data: user } = await supabase
      .from("users")
      .select("id, email, name, avatar_url")
      .eq("id", tokenId)
      .maybeSingle()

    if (!user) {
      return {
        userId: null,
        externalUserId: null,
        error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
        session: null,
      }
    }

    const { data: planUsage } = await supabase
      .from("plan_usage")
      .select("plan, ai_drafts_used, carousels_used, hooks_used, analyses_used, cycle_end")
      .eq("user_id", tokenId)
      .maybeSingle()

    const { data: membership } = await supabase
      .from("workspace_members")
      .select("workspace_id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    return {
      userId: user.id,
      externalUserId: tokenId,
      error: null,
      session: {
        id: tokenId,
        internalId: user.id,
        email: user.email || session.user.email,
        name: user.name || session.user.name,
        plan: planUsage?.plan || "free",
        workspaceId: membership?.workspace_id ?? null,
        avatarUrl: user.avatar_url || session.user.image,
        provider: "credentials",
      },
    }
  }

  // ── OAuth user (LinkedIn / Google): tokenId is the provider's user ID ────────
  const externalId = tokenId

  const { data: user } = await supabase
    .from("users")
    .select("id, external_user_id, email, name, avatar_url")
    .eq("external_user_id", externalId)
    .maybeSingle()

  let internalId: string
  let workspaceId: string | null = null

  if (!user) {
    // First sign-in via OAuth - auto-provision
    const provisioned = await provisionOAuthUser(supabase, externalId, session)
    internalId = provisioned.internalId
    workspaceId = provisioned.workspaceId
  } else {
    internalId = user.id

    const { data: planUsage } = await supabase
      .from("plan_usage")
      .select("plan, ai_drafts_used, carousels_used, hooks_used, analyses_used, cycle_end")
      .eq("user_id", externalId)
      .maybeSingle()

    const { data: membership } = await supabase
      .from("workspace_members")
      .select("workspace_id")
      .eq("user_id", internalId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    workspaceId = membership?.workspace_id ?? null

    return {
      userId: internalId,
      externalUserId: externalId,
      error: null,
      session: {
        id: externalId,
        internalId,
        email: user.email || session.user.email,
        name: user.name || session.user.name,
        plan: planUsage?.plan || "free",
        workspaceId,
        avatarUrl: user.avatar_url || session.user.image,
        provider,
      },
    }
  }

  return {
    userId: internalId,
    externalUserId: externalId,
    error: null,
    session: {
      id: externalId,
      internalId,
      email: session.user.email,
      name: session.user.name,
      plan: "free",
      workspaceId,
      avatarUrl: session.user.image,
      provider,
    },
  }
}

export function withAuth(handler: (req: NextRequest, user: AuthSession) => Promise<NextResponse>) {
  return async (req: NextRequest) => {
    const route = req.nextUrl.pathname
    try {
      const { userId, externalUserId, error, session } = await requireAuthApi(req)
      if (error) {
        log.warn("auth.unauthorized", { route })
        return error
      }
      if (!userId || !externalUserId || !session) {
        log.warn("auth.unauthorized", { route })
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
      return await handler(req, session)
    } catch (err) {
      log.error("api.unhandled_error", { route, error: (err as Error).message, stack: (err as Error).stack?.slice(0, 500) })
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      )
    }
  }
}
