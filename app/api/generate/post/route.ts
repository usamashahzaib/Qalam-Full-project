// Synchronous AI generation - cap route duration so a slow provider chain fails fast instead of
// hitting the platform kill. Requires Vercel fluid compute (default on) for values over 60s.
export const maxDuration = 60

import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/server/auth"
import { log } from "@/lib/server/logging"
import { requirePlan } from "@/lib/server/require-plan"
import { generatePostFromHook } from "@/lib/use-cases/generate-post-from-hook"
import { errorToStatus } from "@/lib/errors"
import { enqueueRequest } from "@/lib/server/queue"
import { generateCacheKey, getCachedResult, setCachedResult } from "@/lib/server/cache"
import type { PlanTier } from "@/types/domain"
import type { GeneratePostFromHookOutput } from "@/lib/use-cases/generate-post-from-hook"

export async function POST(request: NextRequest) {
  return withAuth(async (req, user) => {
    // Free plan gets 5 drafts/month; Solo gets 30; Pro gets 60.
    // The inner generatePostFromHook enforces the per-quota limit via incrementUsage.
    const planCheck = await requirePlan(req, "Free")
    if (!planCheck.ok) return planCheck.response

    let body: Record<string, unknown>
    try { body = await req.json() } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
    }

    const topic = String(body.topic || "").trim()
    const hook = String(body.hook || "").trim()
    const originalContent = String(body.originalContent || "").trim()
    const hasOriginalDraft = originalContent.length >= 20

    if (!hasOriginalDraft && (!topic || topic.length < 3)) return NextResponse.json({ error: "Topic must be at least 3 characters" }, { status: 400 })
    if (!hook) return NextResponse.json({ error: "A hook is required" }, { status: 400 })

    // Only cache generic generations - personalised rewrites are unique per user
    const cacheKey = !hasOriginalDraft
      ? generateCacheKey({ task: "post", topic, hook, role: String(body.role || ""), format: String(body.format || ""), goal: String(body.goal || "") })
      : null
    if (cacheKey) {
      const cached = await getCachedResult<GeneratePostFromHookOutput>(cacheKey)
      if (cached) return NextResponse.json(cached)
    }

    const queueResult = await enqueueRequest(user.id, planCheck.plan as PlanTier, "post", { topic, hook })
    if (queueResult.rateLimited) {
      return NextResponse.json(
        { error: "Rate limit exceeded", message: "You've used all your generations this hour. Upgrade for more." },
        { status: 429 }
      )
    }

    const result = await generatePostFromHook({
      topic,
      hook,
      originalContent: originalContent || undefined,
      role: String(body.role || ""),
      format: String(body.format || ""),
      goal: String(body.goal || "").trim() || undefined,
      userId: user.id,
      internalUserId: user.id,
      workspaceId: user.workspaceId,
      plan: planCheck.plan,
    })

    if (!result.ok) {
      log.warn("generate.post-from-hook.limited", { userId: user.id })
      return NextResponse.json({ error: result.error.userMessage || result.error.message }, { status: errorToStatus(result.error.code) })
    }

    log.info("generate.post-from-hook.done", { userId: user.id, wordCount: result.data.wordCount })
    if (cacheKey) await setCachedResult(cacheKey, result.data, 1800)
    return NextResponse.json(result.data)
  })(request)
}
