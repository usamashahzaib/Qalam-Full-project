import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireAuth } from "@/lib/server/auth-helpers"
import { generatePost, qualityControlDraft, generateHooks, scoreContent } from "@/lib/server/content-generator"
import { checkRateLimit, getClientIp } from "@/lib/server/rate-limit"
import { checkPlanLimit, getPlanStatus, decrementDraft } from "@/lib/server/plan-limits"
import { createServiceClient } from "@/lib/server/supabase-rest"

const bodySchema = z.object({
  topic: z.string().min(3).max(200),
  role: z.enum(["ai_engineer", "ceo", "hr", "sales", "designer", "consultant", "founder", "developer"]),
  tone: z.string().optional(),
  format: z.enum(["short", "medium", "long"]).default("medium"),
  goal: z.string().max(500).optional(),
  qualityCheck: z.boolean().default(true),
})

const patchSchema = z.object({
  id: z.string().min(1),
  content: z.string().optional(),
  confirmOnly: z.boolean().optional(),
})

const jsonError = (error: string, status = 500) => NextResponse.json({ error }, { status })

export async function GET() {
  try {
    const userId = await requireAuth()
    const status = await getPlanStatus(userId)
    return NextResponse.json({
      allowed: status.remaining > 0,
      current: status.used,
      limit: status.limit,
      remaining: status.remaining,
      plan: status.plan,
    })
  } catch (error) {
    return jsonError((error as Error).message || "usage_failed", (error as Error).message === "Unauthorized" ? 401 : 500)
  }
}

export async function POST(request: NextRequest) {
  try {
    const parsed = bodySchema.safeParse(await request.json())
    if (!parsed.success) return jsonError("invalid_request", 400)

    const userId = await requireAuth()
    const planStatus = await getPlanStatus(userId)
    const rate = await checkRateLimit(userId, planStatus.plan, getClientIp(request))
    if (!rate.allowed) return jsonError("rate_limited", 429)

    const limit = await checkPlanLimit(userId, "drafts")
    if (!limit.allowed) return NextResponse.json({ error: "plan_limit_reached", ...limit }, { status: 403 })

    const supabase = createServiceClient()
    const { data: voiceProfile } = await supabase
      .from("voice_profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle()

    const post = await generatePost({ ...parsed.data, voiceProfile: voiceProfile || undefined })
    let content = post.full_text
    let score = await scoreContent(content, parsed.data.role)

    if (parsed.data.qualityCheck && planStatus.plan.toLowerCase() !== "free") {
      const qc = await qualityControlDraft(content, parsed.data.role, voiceProfile || undefined)
      content = qc.finalContent
      score = qc.finalScore
    }

    const decrement = await decrementDraft(userId)
    if (!decrement.success) return jsonError("plan_limit_reached", 403)

    const hooks = await generateHooks(parsed.data.topic, parsed.data.role, 4)
    const { data: savedPostId, error: saveError } = await supabase.rpc("create_post_with_version", {
      p_user_id: userId,
      p_workspace_id: null,
      p_title: parsed.data.topic,
      p_content: content,
      p_hook: post.hook,
      p_cta: post.cta,
      p_role_profile: parsed.data.role,
      p_topic: parsed.data.topic,
      p_engagement_score: score.total_score,
      p_metadata: {
        format: parsed.data.format,
        goal: parsed.data.goal || null,
        hashtags: post.suggested_hashtags,
        engagement_prediction: post.engagement_prediction,
      },
      p_status: "draft",
    })

    if (saveError) return jsonError("post_save_failed", 500)

    const usage = await getPlanStatus(userId)
    return NextResponse.json({
      post: {
        id: savedPostId || null,
        content,
        hook: post.hook,
        body: post.body,
        cta: post.cta,
        hashtags: post.suggested_hashtags,
        role: parsed.data.role,
      },
      score,
      usage,
      hooks,
    })
  } catch (error) {
    const message = (error as Error).message || "generate_failed"
    return jsonError(message, message === "Unauthorized" ? 401 : 500)
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const parsed = patchSchema.safeParse(await request.json())
    if (!parsed.success) return jsonError("invalid_request", 400)

    const userId = await requireAuth()
    const supabase = createServiceClient()
    const query = supabase.from("posts").select("*").eq("id", parsed.data.id).eq("user_id", userId).single()
    const { data: post, error: lookupError } = await query
    if (lookupError || !post) return jsonError("post_not_found", 404)
    if (parsed.data.confirmOnly) return NextResponse.json({ post })

    const { data, error } = await supabase
      .from("posts")
      .update({ content: parsed.data.content, updated_at: new Date().toISOString() })
      .eq("id", parsed.data.id)
      .eq("user_id", userId)
      .select()
      .single()

    if (error) return jsonError("post_update_failed", 500)
    return NextResponse.json({ post: data })
  } catch (error) {
    const message = (error as Error).message || "post_update_failed"
    return jsonError(message, message === "Unauthorized" ? 401 : 500)
  }
}
