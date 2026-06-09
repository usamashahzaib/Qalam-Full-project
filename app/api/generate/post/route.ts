import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/server/auth"
import { callAi } from "@/lib/server/ai-router-v2"
import { incrementUsage, checkPlanLimit } from "@/lib/server/plan-limits-v2"
import { buildPostFromHookPrompt, buildHumanizePrompt } from "@/lib/prompts/role-aware-system"
import { createServiceClient } from "@/lib/server/supabase-rest"
import type { PostFormat } from "@/lib/prompts/role-aware-system"

const ROLE_MAP: Record<string, string> = {
  HR: "hr",
  Marketing: "marketer",
  Founder: "founder",
  Consultant: "consultant",
  Sales: "sales",
  Tech: "developer",
  Other: "ceo",
}

const FORMAT_MAP: Record<string, PostFormat> = {
  Short: "short",
  Medium: "medium",
  Long: "long",
}

export async function POST(request: NextRequest) {
  return withAuth(async (req, user) => {
    let body: Record<string, unknown>
    try { body = await req.json() } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
    }

    const topic = String(body.topic || "").trim()
    const hook = String(body.hook || "").trim()
    const role = ROLE_MAP[String(body.role || "")] || "founder"
    const format: PostFormat = FORMAT_MAP[String(body.format || "")] || "medium"
    const goal = String(body.goal || "").trim()

    if (!topic || topic.length < 3) {
      return NextResponse.json({ error: "Topic must be at least 3 characters" }, { status: 400 })
    }
    if (!hook) {
      return NextResponse.json({ error: "A hook is required" }, { status: 400 })
    }

    const limit = await checkPlanLimit(user.id, "drafts")
    if (!limit.allowed) {
      return NextResponse.json(
        { error: "Draft limit reached. Upgrade your plan.", remaining: 0 },
        { status: 403 }
      )
    }

    // Fetch voice profile if available
    let voiceProfile: Record<string, unknown> | undefined
    if (user.workspaceId) {
      const supabase = createServiceClient()
      const { data } = await supabase
        .from("voice_profiles")
        .select("*")
        .eq("workspace_id", user.workspaceId)
        .limit(1)
        .maybeSingle()
      if (data) voiceProfile = data as Record<string, unknown>
    }

    // Pass 1: Generate from hook
    const { system: genSystem, user: genUser } = buildPostFromHookPrompt(
      hook, topic, role, format, goal || undefined, voiceProfile as never
    )
    const rawPost = await callAi(genSystem, genUser, {
      temperature: 0.85, maxTokens: 1000,
      userId: user.id, plan: user.plan, cache: false,
    })

    // Pass 2: Humanize
    const { system: humSystem, user: humUser } = buildHumanizePrompt(rawPost, role)
    const humanized = await callAi(humSystem, humUser, {
      temperature: 0.4, maxTokens: 1000,
      userId: user.id, plan: user.plan, cache: false,
    })

    const content = humanized.trim()
    const wordCount = content.split(/\s+/).filter(Boolean).length

    const usage = await incrementUsage(user.id, "drafts")

    return NextResponse.json({
      content,
      wordCount,
      remaining: usage.remaining,
    })
  })(request)
}
