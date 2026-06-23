import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/server/auth"
import { scorePost } from "@/lib/use-cases/score-post"
import { incrementUsage, requirePlan } from "@/lib/server/plan-limits-v2"
import { errorToStatus } from "@/lib/errors"
import { enqueueRequest } from "@/lib/server/queue"
import type { PlanTier } from "@/types/domain"

export async function POST(request: NextRequest) {
  return withAuth(async (req, user) => {
    const planCheck = await requirePlan(req, "Free")
    if (!planCheck.ok) return planCheck.response

    // Atomic check+increment using internal UUID — prevents TOCTOU bypass and wrong-ID ghost rows.
    const usage = await incrementUsage(user.id, "analyses")
    if (!usage.allowed) {
      return NextResponse.json(
        { error: "You have reached your scoring limit for this billing period." },
        { status: 429 }
      )
    }

    let body: Record<string, unknown>
    try { body = await req.json() } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
    }

    const queueResult = await enqueueRequest(user.id, planCheck.plan as PlanTier, "score", {})
    if (queueResult.rateLimited) {
      return NextResponse.json(
        { error: "Rate limit exceeded", message: "You've used all your generations this hour. Upgrade for more." },
        { status: 429 }
      )
    }

    const result = await scorePost({
      content: String(body.content || body.postContent || ""),
      role: String(body.role || ""),
      userId: user.id,
      internalUserId: user.id,
      workspaceId: user.workspaceId,
      plan: planCheck.plan,
    })

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error.userMessage ?? result.error.message },
        { status: errorToStatus(result.error.code) }
      )
    }

    const { scores, overall, tips, hashtags } = result.data
    return NextResponse.json({ ...scores, overall, tips, hashtags })
  })(request)
}
