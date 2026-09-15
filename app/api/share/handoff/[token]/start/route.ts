import { NextRequest, NextResponse } from "next/server"
import { signOAuthState } from "@/lib/server/oauth-state"
import { linkedInAuthorizationUrl, linkedInStateCookie } from "@/lib/server/linkedin-oauth"
import { handoffStatus, loadHandoffByToken } from "@/lib/server/agency/handoff"
import { publicShareLimit } from "@/lib/server/agency/public-limit"

export async function GET(request: NextRequest, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params
  const back = (reason: string) => NextResponse.redirect(new URL(`/connect/done?status=error&reason=${reason}`, request.nextUrl.origin))

  const limited = await publicShareLimit(request, "handoff-start")
  if (limited) return back("rate_limited")

  const handoff = await loadHandoffByToken(token).catch(() => null)
  if (!handoff) return back("not_found")
  const status = handoffStatus(handoff.row)
  if (status !== "ready") return back(status === "used" ? "link_used" : "link_expired")

  const state = signOAuthState({ kind: "handoff", workspaceId: handoff.row.workspace_id, handoffId: handoff.row.id })
  const url = linkedInAuthorizationUrl(state, request.nextUrl.origin)
  if (!url) return back("not_configured")

  const response = NextResponse.redirect(url)
  const cookie = linkedInStateCookie(state)
  response.cookies.set(cookie.name, cookie.value, cookie.options)
  return response
}
