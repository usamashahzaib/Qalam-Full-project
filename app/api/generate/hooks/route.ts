// Synchronous AI generation - cap route duration so a slow provider chain fails fast instead of
// hitting the platform kill. Requires Vercel fluid compute (default on) for values over 60s.
export const maxDuration = 60

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { withAuth } from "@/lib/server/auth"
import { requirePlan } from "@/lib/server/require-plan"
import { generateHooks } from "@/lib/use-cases/generate-hooks"
import { errorToStatus } from "@/lib/errors"
import { enqueueRequest } from "@/lib/server/queue"
import { generateCacheKey, getCachedResult, setCachedResult } from "@/lib/server/cache"
import type { PlanTier } from "@/types/domain"
import type { Hook } from "@/lib/use-cases/generate-hooks"
import { getWorkspaceVoiceProfile } from "@/lib/server/voice-profile"
import { authorizeRole } from "@/lib/server/roles"

const BodySchema = z.object({
  topic: z.string().min(3, "Topic must be at least 3 characters"),
  role: z.string().optional().default(""),
  goal: z.string().optional().default(""),
})

export async function POST(request: NextRequest) {
  return withAuth(async (req, user) => {
    const planCheck = await requirePlan(req, "Free")
    if (!planCheck.ok) return planCheck.response
    const roleError = await authorizeRole(req, planCheck.workspaceId, "editor")
    if (roleError) return roleError

    let body: unknown
    try { body = await req.json() } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
    }

    const raw = body as Record<string, unknown>
    const parsed = BodySchema.safeParse({
      topic: raw.topic ?? raw.content,
      role: raw.role ?? raw.style,
      goal: raw.goal,
    })
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }

    const voiceProfile = await getWorkspaceVoiceProfile(user.workspaceId).catch(() => undefined)
    const cacheKey = generateCacheKey({
      task: "hooks",
      topic: parsed.data.topic,
      role: parsed.data.role,
      goal: parsed.data.goal,
      userId: user.id,
      professionalContext: JSON.stringify(voiceProfile?.professionalContext || null),
    })
    const cached = await getCachedResult<{ hooks: Hook[] }>(cacheKey)
    if (cached) return NextResponse.json(cached)

    const queueResult = await enqueueRequest(user.id, planCheck.plan as PlanTier, "hook", parsed.data)
    if (queueResult.rateLimited) {
      return NextResponse.json(
        { error: "Rate limit exceeded", message: "You've used all your generations this hour. Upgrade for more." },
        { status: 429 }
      )
    }

    const result = await generateHooks({
      topic: parsed.data.topic,
      role: parsed.data.role,
      goal: parsed.data.goal,
      userId: user.id,
      plan: planCheck.plan,
      voiceProfile,
    })

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error.userMessage ?? result.error.message },
        { status: errorToStatus(result.error.code) }
      )
    }

    await setCachedResult(cacheKey, { hooks: result.data.hooks }, 3600)
    return NextResponse.json(result.data)
  })(request)
}
