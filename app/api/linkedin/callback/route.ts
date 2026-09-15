import { cookies } from "next/headers"
import { NextRequest, NextResponse } from "next/server"
import { getWorkspaceSessionContext } from "@/lib/server/workspace"
import { requireRole } from "@/lib/server/roles"
import { storeLinkedInPublishingAccount, storeLinkedInToken } from "@/lib/server/linkedin-credentials"
import { verifyOAuthState } from "@/lib/server/oauth-state"
import { exchangeLinkedInCode, LINKEDIN_STATE_COOKIE } from "@/lib/server/linkedin-oauth"
import { completeHandoff } from "@/lib/server/agency/handoff"

type StatePayload = { kind?: string | null; workspaceId: string | null; handoffId?: string | null }

const redirectToSettings = (request: NextRequest, status: "success" | "error", message?: string) => {
  const url = new URL(`/settings?linkedin=${status}`, request.nextUrl.origin)
  if (message) url.searchParams.set("message", message)
  return NextResponse.redirect(url)
}

const redirectToHandoffResult = (request: NextRequest, status: "success" | "error", reason?: string) => {
  const url = new URL(`/connect/done`, request.nextUrl.origin)
  url.searchParams.set("status", status)
  if (reason) url.searchParams.set("reason", reason)
  return NextResponse.redirect(url)
}

const withClearedState = (response: NextResponse) => {
  response.cookies.delete(LINKEDIN_STATE_COOKIE)
  return response
}

export async function GET(request: NextRequest) {
  const cookieStore = await cookies()
  const expectedState = cookieStore.get(LINKEDIN_STATE_COOKIE)?.value || ""
  const state = request.nextUrl.searchParams.get("state") || ""
  const code = request.nextUrl.searchParams.get("code") || ""
  const statePayload = state ? verifyOAuthState<StatePayload>(state) : null
  const isHandoff = statePayload?.kind === "handoff"

  if (!code || !state || state !== expectedState) {
    const denied = request.nextUrl.searchParams.get("error") === "user_cancelled_authorize"
    return withClearedState(isHandoff
      ? redirectToHandoffResult(request, "error", denied ? "cancelled" : "state_mismatch")
      : redirectToSettings(request, "error"))
  }

  if (!statePayload?.workspaceId) {
    return withClearedState(redirectToSettings(request, "error", "invalid_state"))
  }

  // Client handoff: the person on LinkedIn's consent screen is the client, who
  // has no Qalam session. Authority comes from the signed state naming a
  // single-use handoff link, which completeHandoff claims atomically.
  if (isHandoff) {
    if (!statePayload.handoffId) return withClearedState(redirectToHandoffResult(request, "error", "invalid_state"))
    try {
      const connection = await exchangeLinkedInCode(code, request.nextUrl.origin)
      await completeHandoff(statePayload.handoffId, connection)
      return withClearedState(redirectToHandoffResult(request, "success"))
    } catch (error) {
      const message = (error as Error).message || "linkedin_connect_failed"
      console.error("[linkedin/callback] handoff failed:", message)
      return withClearedState(redirectToHandoffResult(request, "error", message === "handoff_unavailable" ? "link_used" : "connect_failed"))
    }
  }

  try {
    const ctx = await getWorkspaceSessionContext()
    const workspaceId = statePayload.workspaceId
    // Re-check membership at callback time too, not just when the OAuth flow
    // started - roles can change in the minute the user spends on LinkedIn's
    // consent screen.
    await requireRole(request, workspaceId, "editor")
    const connection = await exchangeLinkedInCode(code, request.nextUrl.origin)
    const stored = {
      accessToken: connection.accessToken,
      memberId: connection.memberId,
      tokenExpiresAt: connection.expiresAt,
      refreshToken: connection.refreshToken,
      refreshTokenExpiresAt: connection.refreshTokenExpiresAt,
    }
    await storeLinkedInToken({ userId: ctx.supabaseUserId, ...stored })
    await storeLinkedInPublishingAccount({ workspaceId, ...stored })
    return withClearedState(redirectToSettings(request, "success"))
  } catch (error) {
    const message = (error as Error).message || "linkedin_connect_failed"
    console.error("[linkedin/callback] failed:", message)
    return withClearedState(redirectToSettings(request, "error", message))
  }
}
