// Synchronous AI generation - cap route duration so a slow provider chain fails fast instead of
// hitting the platform kill. Requires Vercel fluid compute (default on) for values over 60s.
export const maxDuration = 60

import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/server/auth"
import { scorePost } from "@/lib/use-cases/score-post"
import { incrementUsage } from "@/lib/server/plan-limits-v2"
import { requirePlan } from "@/lib/server/require-plan"
import { errorToStatus } from "@/lib/errors"
import { enqueueRequest } from "@/lib/server/queue"
import { generateCacheKey, getCachedResult, setCachedResult } from "@/lib/server/cache"
import type { PlanTier } from "@/types/domain"
import type { ScorePostOutput } from "@/lib/use-cases/score-post"
import { authorizeRole } from "@/lib/server/roles"

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
    const attempt = Number.isFinite(Number(body.attempt)) ? Number(body.attempt) : 1

    // Cache key scoped to user + role + attempt so a free-plan cap change never bleeds into a
    // previously cached score for the same content at a different regenerate count.
    const cacheKey = generateCacheKey({
      task: "score",
      content,
      userId: user.id,
      role: String(body.role || ""),
      attempt,
      scorePolicy: "ready-floor-82-v1",
    })
    const cached = await getCachedResult<ScorePostOutput>(cacheKey)
    if (cached) {
      const { scores, overall, tips, hashtags } = cached
      return NextResponse.json({ ...scores, overall, tips, hashtags })
    }

    // Atomic check+increment using internal UUID - prevents TOCTOU bypass and wrong-ID ghost rows.
    const usage = await incrementUsage(planCheck.billingUserId, "analyses")
    if (!usage.allowed) {
      return NextResponse.json(
        { error: "You have reached your scoring limit for this billing period." },
        { status: 429 }
      )
    }

    const queueResult = await enqueueRequest(user.id, planCheck.plan as PlanTier, "score", {})
    if (queueResult.rateLimited) {
      return NextResponse.json(
        { error: "Rate limit exceeded", message: "You've used all your generations this hour. Upgrade for more." },
        { status: 429 }
      )
    }

    const result = await scorePost({
      content,
      role: String(body.role || ""),
      userId: planCheck.billingUserId,
      internalUserId: user.id,
      workspaceId: planCheck.workspaceId,
      plan: planCheck.plan,
      attempt,
    })

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error.userMessage ?? result.error.message },
        { status: errorToStatus(result.error.code) }
      )
    }

    await setCachedResult(cacheKey, result.data, 7200)
    const { scores, overall, tips, hashtags } = result.data
    return NextResponse.json({ ...scores, overall, tips, hashtags })
  })(request)
}
