import "server-only"

import { callAi } from "@/lib/server/ai-router-v2"
import { checkPlanLimit, incrementUsage } from "@/lib/server/plan-limits-v2"
import { createServiceClient } from "@/lib/server/supabase-rest"
import { buildPostFromHookPrompt, buildHumanizePrompt } from "@/lib/prompts/role-aware-system"
import { ok, err } from "@/lib/errors"
import type { Result } from "@/lib/errors"
import type { PostFormat } from "@/lib/prompts/role-aware-system"

export const ROLE_MAP: Record<string, string> = {
  HR: "hr",
  Marketing: "marketer",
  Founder: "founder",
  Consultant: "consultant",
  Sales: "sales",
  Tech: "developer",
  Other: "ceo",
}

export const FORMAT_MAP: Record<string, PostFormat> = {
  Short: "short",
  Medium: "medium",
  Long: "long",
}

export interface GeneratePostFromHookInput {
  topic: string
  hook: string
  role: string
  format: string
  goal?: string
  userId: string
  workspaceId: string | null
  plan: string
}

export interface GeneratePostFromHookOutput {
  content: string
  wordCount: number
  remaining: number
}

export async function generatePostFromHook(
  input: GeneratePostFromHookInput
): Promise<Result<GeneratePostFromHookOutput>> {
  const { topic, hook, role: rawRole, format: rawFormat, goal, userId, workspaceId, plan } = input

  const limit = await checkPlanLimit(userId, "drafts")
  if (!limit.allowed) {
    return err({ code: "PLAN_LIMIT_EXCEEDED", message: "Draft limit reached", userMessage: "Draft limit reached. Upgrade your plan." })
  }

  const role = ROLE_MAP[rawRole] || "founder"
  const format: PostFormat = FORMAT_MAP[rawFormat] || "medium"

  let voiceProfile: Record<string, unknown> | undefined
  if (workspaceId) {
    const { data } = await createServiceClient()
      .from("voice_profiles")
      .select("*")
      .eq("workspace_id", workspaceId)
      .limit(1)
      .maybeSingle()
    if (data) voiceProfile = data as Record<string, unknown>
  }

  const { system: genSystem, user: genUser } = buildPostFromHookPrompt(
    hook, topic, role, format, goal || undefined, voiceProfile as never
  )
  const rawPost = await callAi(genSystem, genUser, {
    temperature: 0.85, maxTokens: 1000,
    userId, plan, cache: false,
  })

  const { system: humSystem, user: humUser } = buildHumanizePrompt(rawPost, role)
  const humanized = await callAi(humSystem, humUser, {
    temperature: 0.4, maxTokens: 1000,
    userId, plan, cache: false,
  })

  const content = humanized.trim()
  const usage = await incrementUsage(userId, "drafts")

  return ok({
    content,
    wordCount: content.split(/\s+/).filter(Boolean).length,
    remaining: usage.remaining,
  })
}
