import { NextRequest, NextResponse } from "next/server"
import { getPlanLimits } from "@/lib/entitlements"
import { getCommentUsage, releaseCommentUsage, reserveCommentUsage } from "@/lib/server/comment-usage"
import { getPlanStatus } from "@/lib/server/plan-limits-v2"
import { getWorkspaceVoiceProfile } from "@/lib/server/voice-profile"
import { readExtensionToken, resolveExtensionWorkspace } from "@/lib/server/extension-auth"
import { generateComments } from "@/lib/use-cases/generate-comments"
import { COMMENT_STYLES, COMMENT_SOURCE_BUDGET, type CommentStyle } from "@/lib/prompts/builders/comment"
import { log } from "@/lib/server/logging"

// Same prompt, same validation, same repair pass as the in-app generator. The
// extension used to carry its own one-line prompt with no voice profile.
const styles = COMMENT_STYLES
type Style = CommentStyle
const VARIANTS = 3

const identityFor = (request: NextRequest) => readExtensionToken(request.headers.get("authorization"))

export async function GET(request: NextRequest) {
  const identity = await identityFor(request)
  if (!identity) return NextResponse.json({ error: "extension_auth_required" }, { status: 401 })
  const status = await getPlanStatus(identity.userId)
  const limit = getPlanLimits(status.plan).commentGenerationsPerMonth
  if (limit === "unlimited") return NextResponse.json({ plan: status.plan, current: 0, limit, remaining: limit }, { headers: { "Cache-Control": "no-store" } })
  const usage = await getCommentUsage(identity.userId, limit)
  return NextResponse.json({ plan: status.plan, ...usage, remaining: Math.max(0, usage.limit - usage.current) }, { headers: { "Cache-Control": "no-store" } })
}

export async function POST(request: NextRequest) {
  const identity = await identityFor(request)
  if (!identity) return NextResponse.json({ error: "extension_auth_required" }, { status: 401 })
  const status = await getPlanStatus(identity.userId)
  if (!status.isActive) return NextResponse.json({ error: "plan_expired", message: "Renew your Qalam plan to continue." }, { status: 403 })
  const limit = getPlanLimits(status.plan).commentGenerationsPerMonth
  const body = await request.json().catch(() => null) as { postText?: unknown; style?: unknown } | null
  const postText = String(body?.postText || "").trim()
  const style = String(body?.style || "insightful").toLowerCase() as Style
  if (postText.length < 10 || postText.length > COMMENT_SOURCE_BUDGET) return NextResponse.json({ error: `postText must be 10 to ${COMMENT_SOURCE_BUDGET} characters` }, { status: 400 })
  if (!styles.includes(style)) return NextResponse.json({ error: "Invalid comment style" }, { status: 400 })
  const workspaceId = await resolveExtensionWorkspace(identity.userId)
  if (!workspaceId) {
    return NextResponse.json({ error: "workspace_access_revoked" }, { status: 403 })
  }
  const voice = await getWorkspaceVoiceProfile(workspaceId, postText.slice(0, 500)).catch(() => undefined)

  const reservation = limit === "unlimited" ? null : await reserveCommentUsage(identity.userId, limit)
  if (reservation && !reservation.allowed) {
    if (reservation.unavailable) {
      return NextResponse.json(
        { error: "comment_quota_unavailable", message: "Comment quota is temporarily unavailable. Please try again in a moment." },
        { status: 503 }
      )
    }
    return NextResponse.json({ error: "monthly_limit_reached", limit: reservation.limit, current: reservation.current }, { status: 403 })
  }

  let completed = false
  try {
    const result = await generateComments({
      postText,
      style,
      voiceProfile: voice,
      variants: VARIANTS,
      userId: identity.userId,
      plan: status.plan,
    })
    const comments = result.comments
    if (!comments.length) return NextResponse.json({ error: "ai_unavailable" }, { status: 503 })
    if (result.remainingDefects.length) {
      log.warn("extension.comments.defects_remaining", { userId: identity.userId, style, codes: result.remainingDefects.map((d) => d.code) })
    }
    completed = true
    if (limit === "unlimited") {
      return NextResponse.json({ comments, plan: status.plan, usage: { current: 0, limit, remaining: limit } }, { headers: { "Cache-Control": "no-store" } })
    }
    return NextResponse.json({ comments, plan: status.plan, usage: { ...reservation!, remaining: Math.max(0, reservation!.limit - reservation!.current) } }, { headers: { "Cache-Control": "no-store" } })
  } catch {
    return NextResponse.json({ error: "ai_unavailable" }, { status: 503 })
  } finally {
    if (reservation && !completed) await releaseCommentUsage(identity.userId)
  }
}
