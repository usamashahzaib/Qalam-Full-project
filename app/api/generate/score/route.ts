// Synchronous AI generation - cap route duration so a slow provider chain fails fast instead of
// hitting the platform kill. Requires Vercel fluid compute (default on) for values over 60s.
export const maxDuration = 60

import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/server/auth"
import { scorePost } from "@/lib/use-cases/score-post"
import { incrementUsage, decrementUsage } from "@/lib/server/plan-limits-v2"
import { requirePlan } from "@/lib/server/require-plan"
import { errorToStatus } from "@/lib/errors"
import { enqueueRequest } from "@/lib/server/queue"
import { generateCacheKey, getCachedResult, setCachedResult } from "@/lib/server/cache"
import type { PlanTier } from "@/types/domain"
import type { ScorePostOutput } from "@/lib/use-cases/score-post"
import { authorizeRole } from "@/lib/server/roles"
import { claimIncludedScore, releaseIncludedScore, SCORES_PER_DRAFT, verifyDraftToken } from "@/lib/server/draft-token"

export async function POST(request: NextRequest) {
  return withAuth(async (req, user) => {
    const planCheck = await requirePlan(req, "Free")
    if (!planCheck.ok) return planCheck.response
    const roleError = await authorizeRole(req, planCheck.workspaceId, "editor")
    if (roleError) return roleError

    let body: Record<string, unknown>
    try { body = await req.json() } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
    }

    const content = String(body.content || body.postContent || "")
    if (content.trim().length < 4 || content.length > 3000) {
      return NextResponse.json({ error: "Post must be between 4 and 3000 characters to score." }, { status: 400 })
    }
    const brief = typeof body.brief === "string" ? body.brief.trim().slice(0, 2000) : ""
    const attempt = Number.isFinite(Number(body.attempt)) ? Number(body.attempt) : 1

    // Workspace scope prevents one client's voice evaluation from reaching another.
    const cacheKey = generateCacheKey({
      task: "score",
      content,
      userId: user.id,
      workspaceId: planCheck.workspaceId,
      role: String(body.role || ""),
      attempt,
      brief,
      scorePolicy: "measured-score-v4",
    })
    const cached = await getCachedResult<ScorePostOutput>(cacheKey)
    if (cached) {
      const { scores, overall, tips, hashtags, unsupported = [] } = cached
      return NextResponse.json({ ...scores, overall, tips, hashtags, unsupported })
    }

    // A draft the writer generated carries its own scores (see lib/server/draft-token.ts).
    // Only text without one, or a draft past its allowance, spends an analysis.
    const draftId = verifyDraftToken(body.draftToken, planCheck.billingUserId, planCheck.workspaceId)
    const included = draftId ? await claimIncludedScore(draftId) : false
    if (!included) {
      // Atomic check+increment using internal UUID - prevents TOCTOU bypass and wrong-ID ghost rows.
      const usage = await incrementUsage(planCheck.billingUserId, "analyses")
      if (!usage.allowed) {
        return NextResponse.json(
          { error: draftId
            ? `This draft has used its ${SCORES_PER_DRAFT} included scores and your monthly scores are used up.`
            : "You have reached your scoring limit for this billing period." },
          { status: 429 }
        )
      }
    }
    const refundScore = async () => {
      if (included && draftId) await releaseIncludedScore(draftId)
      else await decrementUsage(planCheck.billingUserId, "analyses")
    }

    let queueResult: Awaited<ReturnType<typeof enqueueRequest>>
    try {
      queueResult = await enqueueRequest(user.id, planCheck.plan as PlanTier, "score", {})
    } catch (error) {
      await refundScore()
      throw error
    }
    if (queueResult.rateLimited) {
      await refundScore()
      return NextResponse.json(
        { error: "Rate limit exceeded", message: "You've used all your generations this hour. Upgrade for more." },
        { status: 429 }
      )
    }

    let result: Awaited<ReturnType<typeof scorePost>>
    try {
      result = await scorePost({
        content,
        role: String(body.role || ""),
        userId: planCheck.billingUserId,
        internalUserId: user.id,
        workspaceId: planCheck.workspaceId,
        plan: planCheck.plan,
        attempt,
        brief: brief || undefined,
      })
    } catch (error) {
      await refundScore()
      throw error
    }

    if (!result.ok) {
      await refundScore()
      return NextResponse.json(
        { error: result.error.userMessage ?? result.error.message },
        { status: errorToStatus(result.error.code) }
      )
    }

    await setCachedResult(cacheKey, result.data, 7200).catch(() => undefined)
    const { scores, overall, tips, hashtags, unsupported } = result.data
    return NextResponse.json({ ...scores, overall, tips, hashtags, unsupported })
  })(request)
}
