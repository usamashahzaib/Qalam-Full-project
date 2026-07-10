import "server-only"

// lib/server/auth.ts
// Wraps NextAuth session into internal user context for API routes.
// withAuth logs all errors and 401s centrally - individual routes only need
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
import { getPlanStatus } from "./plan-limits-v2"
import { applyReferralCode } from "./referrals"

const REFERRAL_COOKIE = "qalam_referral_code"

async function provisionOAuthUser(
  supabase: ReturnType<typeof createServiceClient>,
  externalId: string,
  session: { user: { email?: string | null; name?: string | null; image?: string | null } }
): Promise<{ internalId: string; workspaceId: string | null }> {
  const { data, error } = await supabase.rpc("provision_oauth_user", {
    p_external_id: externalId,
    p_email: session.user.email || "",
    p_full_name: session.user.name || "",
    p_image_url: session.user.image || "",
  })

  if (error || !data) {
    log.error("auth.provision_rpc_failed", { externalId, error: error?.message })

    // Check if user already exists (returning user + RPC temporarily unavailable)
    const { data: existingUser } = await supabase
      .from("users")
      .select("id")
      .or(`external_user_id.eq.${externalId},email.eq.${session.user.email || ""}`)
      .limit(1)
      .maybeSingle()

    if (existingUser?.id) {
      // Returning user - just get their workspace
      const { data: membership } = await supabase
        .from("workspace_members")
        .select("workspace_id")
        .eq("user_id", existingUser.id)
        .limit(1)
        .maybeSingle()
      // Ensure external_user_id is linked
      await supabase.from("users").update({ external_user_id: externalId, updated_at: new Date().toISOString() }).eq("id", existingUser.id)
      return { internalId: existingUser.id, workspaceId: membership?.workspace_id ?? null }
    }

    // New user - sequential inserts with upsert semantics
    const internalId = crypto.randomUUID()
    const { data: upsertedUser } = await supabase
      .from("users")
      .upsert(
        {
          id: internalId,
          external_user_id: externalId,
          email: session.user.email || "",
          full_name: session.user.name || "",
          image_url: session.user.image || "",
          auth_provider: "oauth",
          email_verified: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "email", ignoreDuplicates: false }
      )
      .select("id")
      .single()

    const resolvedInternalId = upsertedUser?.id ?? internalId
    await supabase.from("plan_usage").upsert(
      { user_id: resolvedInternalId, plan: "free", ai_drafts_used: 0, carousels_used: 0, hooks_used: 0, analyses_used: 0 },
      { onConflict: "user_id", ignoreDuplicates: true }
    )

    // Check if workspace already exists for this user before creating
    const { data: existingMembership } = await supabase
      .from("workspace_members")
      .select("workspace_id")
      .eq("user_id", resolvedInternalId)
      .limit(1)
      .maybeSingle()

    if (existingMembership?.workspace_id) {
      return { internalId: resolvedInternalId, workspaceId: existingMembership.workspace_id }
    }

    const workspaceId = crypto.randomUUID()
    const slug = `ws-${resolvedInternalId.slice(0, 8)}-${Date.now().toString(36)}`
    await supabase.from("workspaces").insert({
      id: workspaceId,
      name: "My Workspace",
      owner_id: resolvedInternalId,
      owner_email: session.user.email || "",
      slug,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    await supabase.from("workspace_members").upsert(
      { workspace_id: workspaceId, user_id: resolvedInternalId, role: "owner" },
      { onConflict: "workspace_id,user_id", ignoreDuplicates: true }
    )
    return { internalId: resolvedInternalId, workspaceId }
  }

  const result = data as { user_id: string; workspace_id: string | null }
  return { internalId: result.user_id, workspaceId: result.workspace_id }
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
      .select("id, email, full_name, image_url, password_version")
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

    // Invalidate sessions when password has changed since this JWT was issued.
    // Only enforced when the column exists (both sides are a number).
    const dbPwVersion = (user as unknown as { password_version?: number }).password_version
    const tokenPwVersion = (session.user as { passwordVersion?: number }).passwordVersion
    if (typeof dbPwVersion === "number" && typeof tokenPwVersion === "number" && dbPwVersion !== tokenPwVersion) {
      log.warn("auth.password_version_mismatch", { userId: tokenId })
      return {
        userId: null,
        externalUserId: null,
        error: NextResponse.json({ error: "Session expired. Please sign in again." }, { status: 401 }),
        session: null,
      }
    }

    const [planStatus, membership] = await Promise.all([
      getPlanStatus(tokenId),
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
        plan: planStatus.plan,
        workspaceId: membership.data?.workspace_id ?? null,
        avatarUrl: user.image_url || session.user.image,
        provider: "credentials",
      } satisfies AuthSession,
    }
  }

  // ── OAuth user (LinkedIn): tokenId is the provider's user ID ─────────────────
  const externalId = tokenId

  const { data: user } = await supabase
    .from("users")
    .select("id, external_user_id, email, full_name, image_url")
    .eq("external_user_id", externalId)
    .maybeSingle()

  let internalId: string
  let workspaceId: string | null = null

  if (!user) {
    // First sign-in - provision atomically via RPC
    const provisioned = await provisionOAuthUser(supabase, externalId, session)
    internalId = provisioned.internalId
    workspaceId = provisioned.workspaceId

    // Apply a pending referral code from the ?ref= flow - best-effort, never blocks sign-in.
    const referralCode = request.cookies.get(REFERRAL_COOKIE)?.value
    if (referralCode) {
      applyReferralCode(referralCode, internalId).catch((err: unknown) =>
        log.error("auth.referral_apply_failed", { error: (err as Error).message })
      )
    }

    const planStatus = await getPlanStatus(internalId)
    return {
      userId: internalId,
      externalUserId: externalId,
      error: null,
      session: {
        id: internalId,
        externalId,
        email: session.user.email,
        name: session.user.name,
        plan: planStatus.plan,
        workspaceId,
        avatarUrl: session.user.image,
        provider,
      } satisfies AuthSession,
    }
  }

  internalId = user.id

  const [planStatus, membership] = await Promise.all([
    getPlanStatus(internalId),
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
      plan: planStatus.plan,
      workspaceId,
      avatarUrl: user.image_url || session.user.image,
      provider,
    } satisfies AuthSession,
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