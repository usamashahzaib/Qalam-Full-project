import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/server/clerk-client";
import { getCurrentWorkspace } from "@/lib/server/workspace";
import { generatePost, scoreContent, rewriteWithFeedback } from "@/lib/server/content-generator";
import { checkRateLimit, getClientIp } from "@/lib/server/rate-limit";
import { checkPlanLimit } from "@/lib/server/plan-limits";
import { createServiceClient } from "@/lib/server/supabase-rest";

type GenerateBody = {
  topic?: string
  role?: string
  tone?: string
  format?: "short" | "medium" | "long"
  goal?: string
  qualityCheck?: boolean
}

export async function GET() {
  try {
    const userId = await requireAuth()
    const { allowed, current, limit } = await checkPlanLimit(userId, "ai_drafts")
    return NextResponse.json({ usage: { allowed, current, limit } })
  } catch (error) {
    const message = (error as Error).message || "Failed to load usage"
    return NextResponse.json({ error: message }, { status: message === "Unauthorized" ? 401 : 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await requireAuth()
    const rate = await checkRateLimit(userId, "Free", getClientIp(req))
    if (!rate.allowed) {
      return NextResponse.json({ error: "Rate limit exceeded. Try again in a minute." }, { status: 429 })
    }

    const body = (await req.json()) as GenerateBody
    const topic = String(body.topic || "").trim()
    const role = body.role || "founder"
    const format = body.format || "medium"
    const qualityCheck = body.qualityCheck !== false

    if (topic.length < 3) {
      return NextResponse.json({ error: "Topic must be at least 3 characters" }, { status: 400 })
    }

    const plan = await checkPlanLimit(userId, "ai_drafts")
    if (!plan.allowed) {
      return NextResponse.json({ error: "Plan limit reached", current: plan.current, limit: plan.limit, upgrade_url: "/pricing" }, { status: 403 })
    }

    const supabase = createServiceClient()
    const { workspaceId } = await getCurrentWorkspace()
    const { data: voiceProfile } = await supabase
      .from("voice_profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle()

    const post = await generatePost({ topic, role, tone: body.tone, voiceProfile, goal: body.goal, format })
    let finalContent = post.full_text
    let finalScore: Awaited<<ReturnType<<typeof scoreContent>> | null = null

    if (qualityCheck) {
      const score = await scoreContent(finalContent, role)
      finalScore = score

      if (score.total_score < 75 && score.feedback) {
        const rewritten = await rewriteWithFeedback(finalContent, score.feedback, role)
        const newScore = await scoreContent(rewritten, role)
        if (newScore.total_score > score.total_score) {
          finalContent = rewritten
          finalScore = newScore
        }
      }
    }

    const metadata = {
      generation_params: { topic, role, format, goal: body.goal || null },
      quality_score: finalScore,
      hashtags: post.suggested_hashtags,
      engagement_prediction: post.engagement_prediction,
    }
    const { data: savedPostId, error: saveError } = await supabase.rpc("create_post_with_version", {
      p_user_id: userId,
      p_workspace_id: workspaceId,
      p_title: topic,
      p_content: finalContent,
      p_hook: post.hook,
      p_cta: post.cta,
      p_role_profile: role,
      p_topic: topic,
      p_engagement_score: finalScore?.total_score || null,
      p_metadata: metadata,
      p_status: "draft",
    })

    if (saveError) console.error("Failed to save post:", saveError)

    return NextResponse.json({
      success: true,
      usage: { allowed: plan.allowed, current: plan.current, limit: plan.limit },
      post: {
        id: savedPostId || undefined,
        content: finalContent,
        hook: post.hook,
        body: post.body,
        cta: post.cta,
        hashtags: post.suggested_hashtags,
        score: finalScore,
        role,
        saved: Boolean(savedPostId),
      },
    })
  } catch (error) {
    console.error("Generate error:", error)
    const message = (error as Error).message || "Failed to generate post"
    return NextResponse.json({ error: message }, { status: message === "Unauthorized" ? 401 : 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const userId = await requireAuth()
    const body = (await req.json()) as { id?: string; content?: string; confirmOnly?: boolean }
    if (!body.id) return NextResponse.json({ error: "Post id required" }, { status: 400 })

    const supabase = createServiceClient()
    if (body.confirmOnly) {
      const { data, error } = await supabase
        .from("posts")
        .select("*")
        .eq("id", body.id)
        .eq("user_id", userId)
        .single()
      if (error) throw new Error(error.message)
      return NextResponse.json({ success: true, post: data })
    }

    const { data, error } = await supabase
      .from("posts")
      .update({ content: String(body.content || ""), updated_at: new Date().toISOString() })
      .eq("id", body.id)
      .eq("user_id", userId)
      .select()
      .single()

    if (error) throw new Error(error.message)
    return NextResponse.json({ success: true, post: data })
  } catch (error) {
    const message = (error as Error).message || "Failed to update post"
    return NextResponse.json({ error: message }, { status: message === "Unauthorized" ? 401 : 500 })
  }
}
