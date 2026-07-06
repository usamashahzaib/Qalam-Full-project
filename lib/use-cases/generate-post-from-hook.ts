import "server-only"

import { callAi } from "@/lib/server/ai-router-v2"
import { incrementUsage, decrementUsage } from "@/lib/server/plan-limits-v2"
import { getWorkspaceVoiceProfile } from "@/lib/server/voice-profile"
import { buildPostFromHookPrompt, buildPostWithReplacedHookPrompt, buildHumanizePrompt } from "@/lib/prompts/role-aware-system"
import { toPostArtifact } from "@/lib/use-cases/post-artifact"
import { ok, err } from "@/lib/errors"
import type { Result } from "@/lib/errors"
import type { PostFormat } from "@/lib/prompts/role-aware-system"

export const FORMAT_MAP: Record<string, PostFormat> = {
  Short: "short",
  Medium: "medium",
  Long: "long",
}

export interface GeneratePostFromHookInput {
  topic: string
  hook: string
  originalContent?: string
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
  const { topic, hook, originalContent, role: rawRole, format: rawFormat, goal, userId, workspaceId, plan } = input

  let usage: Awaited<ReturnType<typeof incrementUsage>>
  try {
    usage = await incrementUsage(userId, "drafts")
  } catch {
    return err({ code: "INTERNAL_ERROR", message: "Usage check failed", userMessage: "Could not verify your usage limit. Please try again." })
  }
  if (!usage.allowed) {
    return err({ code: "PLAN_LIMIT_EXCEEDED", message: "Draft limit reached", userMessage: "Draft limit reached. Upgrade your plan." })
  }

  const role = rawRole
  const format: PostFormat = FORMAT_MAP[rawFormat] || "medium"

  const isProOrAbove = plan.toLowerCase() === "pro" || plan.toLowerCase().startsWith("agency")
  const voiceProfile = isProOrAbove ? await getWorkspaceVoiceProfile(workspaceId).catch(() => undefined) : undefined

  const hasDraft = Boolean(originalContent && originalContent.length >= 20)
  const { system: genSystem, user: genUser } = hasDraft
    ? buildPostWithReplacedHookPrompt(hook, originalContent!, role, goal || undefined, voiceProfile)
    : buildPostFromHookPrompt(hook, topic, role, format, goal || undefined, voiceProfile)

  let rawPost: string
  try {
    rawPost = await callAi("post-generation", genSystem, genUser, {
      temperature: 0.85, maxTokens: 1000,
      userId, plan, cache: false,
    })
  } catch {
    await decrementUsage(userId, "drafts")
    return err({ code: "INTERNAL_ERROR", message: "Post generation failed", userMessage: "Post generation failed. Please try again in a moment." })
  }

  let humanized: string
  try {
    const { system: humSystem, user: humUser } = buildHumanizePrompt(rawPost, role)
    humanized = await callAi("post-improvement", humSystem, humUser, {
      temperature: 0.4, maxTokens: 1000,
      userId, plan, cache: false,
    })
  } catch {
    humanized = rawPost
  }

  const artifact = toPostArtifact(humanized) || toPostArtifact(rawPost)
  if (!artifact) {
    return err({ code: "INTERNAL_ERROR", message: "Invalid post artifact", userMessage: "Post generation failed. Please try again in a moment." })
  }

  return ok({
    content: artifact.content,
    wordCount: artifact.wordCount,
    remaining: usage.remaining,
  })
}
