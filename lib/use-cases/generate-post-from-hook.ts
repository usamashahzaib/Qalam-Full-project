import "server-only"

import { callAi } from "@/lib/server/ai-router-v2"
import { checkPlanLimit, incrementUsage } from "@/lib/server/plan-limits-v2"
import { createServiceClient } from "@/lib/server/supabase-rest"
import { buildPostFromHookPrompt, buildHumanizePrompt } from "@/lib/prompts/role-aware-system"
import { ok, err } from "@/lib/errors"
import type { Result } from "@/lib/errors"
import type { PostFormat, VoiceProfile } from "@/lib/prompts/role-aware-system"

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
  internalUserId: string
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
  const { topic, hook, role: rawRole, format: rawFormat, goal, userId, internalUserId, plan } = input

  let limit: Awaited<ReturnType<typeof checkPlanLimit>>
  try {
    limit = await checkPlanLimit(userId, "drafts")
  } catch {
    return err({ code: "INTERNAL_ERROR", message: "Usage check failed", userMessage: "Could not verify your usage limit. Please try again." })
  }
  if (!limit.allowed) {
    return err({ code: "PLAN_LIMIT_EXCEEDED", message: "Draft limit reached", userMessage: "Draft limit reached. Upgrade your plan." })
  }

  const role = ROLE_MAP[rawRole] || "founder"
  const format: PostFormat = FORMAT_MAP[rawFormat] || "medium"

  let voiceProfile: VoiceProfile | undefined
  const isProOrAbove = plan.toLowerCase() === "pro" || plan.toLowerCase().startsWith("agency")
  if (isProOrAbove && internalUserId) {
    try {
      const { data } = await createServiceClient()
        .from("voice_profiles")
        .select("brand_tone, characteristics")
        .eq("user_id", internalUserId)
        .limit(1)
        .maybeSingle()
      if (data) {
        const chars = data.characteristics as {
          tone?: string; sentenceLength?: string
          commonPhrases?: string[]; transitions?: string[]
        } | null
        voiceProfile = {
          tone: chars?.tone || String(data.brand_tone || ""),
          sentenceLength: chars?.sentenceLength,
          vocabulary: chars?.commonPhrases || [],
          patterns: chars?.transitions || [],
        }
      }
    } catch { /* ignore - voice profile is optional */ }
  }

  const { system: genSystem, user: genUser } = buildPostFromHookPrompt(
    hook, topic, role, format, goal || undefined, voiceProfile
  )

  let rawPost: string
  try {
    rawPost = await callAi(genSystem, genUser, {
      temperature: 0.85, maxTokens: 1000,
      userId, plan, cache: false,
    })
  } catch {
    return err({ code: "INTERNAL_ERROR", message: "Post generation failed", userMessage: "Post generation failed. Please try again in a moment." })
  }

  let humanized: string
  try {
    const { system: humSystem, user: humUser } = buildHumanizePrompt(rawPost, role)
    humanized = await callAi(humSystem, humUser, {
      temperature: 0.4, maxTokens: 1000,
      userId, plan, cache: false,
    })
  } catch {
    humanized = rawPost
  }

  const content = humanized.trim()
  const usage = await incrementUsage(userId, "drafts")

  return ok({
    content,
    wordCount: content.split(/\s+/).filter(Boolean).length,
    remaining: usage.remaining,
  })
}
