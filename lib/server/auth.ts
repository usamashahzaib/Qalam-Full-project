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

export async function requireAuthApi(request: NextRequest) {
  void request
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
    // A credentials token without the current version is stale too. This also
    // revokes tokens issued before password-version tracking was introduced.
    const dbPwVersion = (user as unknown as { password_version?: number }).password_version
    const tokenPwVersion = (session.user as { passwordVersion?: number }).passwordVersion
    if (typeof dbPwVersion !== "number" || typeof tokenPwVersion !== "number" || dbPwVersion !== tokenPwVersion) {
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
        .order("created_at", { ascending: true })
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

  if (!user) {
    return {
      userId: null,
      externalUserId: null,
      error: NextResponse.json({ error: "Session expired. Please sign in again." }, { status: 401 }),
      session: null,
    }
  }

  const internalId = user.id

  const [planStatus, membership] = await Promise.all([
    getPlanStatus(internalId),
    supabase
      .from("workspace_members")
      .select("workspace_id")
      .eq("user_id", internalId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle(),
  ])

  const workspaceId = membership.data?.workspace_id ?? null

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
