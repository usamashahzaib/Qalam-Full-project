// lib/server/auth.ts
// Wraps NextAuth session into internal user context for API routes.
// withAuth logs all errors and 401s centrally — individual routes only need
// to add log.info for their success paths.

export type AuthSession = {
  /** Internal Supabase UUID - use for all DB foreign-key operations */
  id: string
  /** OAuth provider sub / credentials lookup key - use for plan_usage queries */
  externalId: string
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

const PLAN_PRI: Record<string, number> = { free: 0, solo: 1, pro: 2, agency: 3 }
const higherPlan = (a: string, b: string) =>
  (PLAN_PRI[b.toLowerCase()] ?? 0) > (PLAN_PRI[a.toLowerCase()] ?? 0) ? b : a

async function resolveEffectivePlan(
  supabase: ReturnType<typeof createServiceClient>,
  internalId: string,
): Promise<string> {
  const [userPlanResult, overrideResult] = await Promise.all([
    Promise.resolve(supabase.from("users").select("plan").eq("id", internalId).maybeSingle()).catch(() => ({ data: null })),
    Promise.resolve(
      supabase
        .from("user_overrides")
        .select("plan_override, expires_at")
        .eq("user_id", internalId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()
    ).catch(() => ({ data: null })) as Promise<{ data: { plan_override?: string | null; expires_at?: string | null } | null }>,
  ])

  let plan = (userPlanResult as { data: { plan?: string } | null }).data?.plan || "free"

  const overrideRow = overrideResult.data
  if (
    overrideRow?.plan_override &&
    (!overrideRow.expires_at || new Date(overrideRow.expires_at) > new Date())
  ) {
    plan = higherPlan(plan, overrideRow.plan_override)
  }

  return plan
}

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
    full_name: session.user.name || "",
    image_url: session.user.image || "",
    auth_provider: "oauth",
    email_verified: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  await supabase.from("users").insert(newUser)

  await supabase.from("plan_usage").insert({
    user_id: internalId,
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
      .select("id, email, full_name, image_url")
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

    const [plan, membership] = await Promise.all([
      resolveEffectivePlan(supabase, tokenId),
      supabase
        .from("workspace_members")
        .select("workspace_id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ])

    return {
      userId: user.id,
      externalUserId: tokenId,
      error: null,
      session: {
        id: user.id,
        externalId: tokenId,
        email: user.email || session.user.email,
        name: user.full_name || session.user.name,
        plan,
        workspaceId: membership.data?.workspace_id ?? null,
        avatarUrl: user.image_url || session.user.image,
        provider: "credentials",
      },
    }
  }

  // ── OAuth user (LinkedIn / Google): tokenId is the provider's user ID ────────
  const externalId = tokenId

  const { data: user } = await supabase
    .from("users")
    .select("id, external_user_id, email, full_name, image_url")
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

    const [plan, membership] = await Promise.all([
      resolveEffectivePlan(supabase, internalId),
      supabase
        .from("workspace_members")
        .select("workspace_id")
        .eq("user_id", internalId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ])

    workspaceId = membership.data?.workspace_id ?? null

    return {
      userId: internalId,
      externalUserId: externalId,
      error: null,
      session: {
        id: internalId,
        externalId,
        email: user.email || session.user.email,
        name: user.full_name || session.user.name,
        plan,
        workspaceId,
        avatarUrl: user.image_url || session.user.image,
        provider,
      },
    }
  }

  return {
    userId: internalId,
    externalUserId: externalId,
    error: null,
    session: {
      id: internalId,
      externalId,
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
