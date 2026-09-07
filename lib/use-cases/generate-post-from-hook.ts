import "server-only"

import { callAi } from "@/lib/server/ai-router-v2"
import { incrementUsage, decrementUsage } from "@/lib/server/plan-limits-v2"
import { incrementWorkspaceUsage, decrementWorkspaceUsage } from "@/lib/server/workspace-usage"
import { getWorkspaceVoiceProfile } from "@/lib/server/voice-profile"
import { buildPostFromHookPrompt, buildPostWithReplacedHookPrompt, buildRevisePrompt } from "@/lib/prompts/role-aware-system"
import { checkText } from "@/lib/prompts/output-checks"
import { sanitizeGeneratedText } from "@/lib/content-guard"
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

  const isAgency = plan.toLowerCase() === "agency"
  let usage: Awaited<ReturnType<typeof incrementUsage>>
  try {
    usage = await incrementUsage(userId, "drafts")
  } catch {
    return err({ code: "INTERNAL_ERROR", message: "Usage check failed", userMessage: "Could not verify your usage limit. Please try again." })
  }
  if (!usage.allowed) {
    return err({ code: "PLAN_LIMIT_EXCEEDED", message: "Draft limit reached", userMessage: "Draft limit reached. Upgrade your plan." })
  }
  if (isAgency && workspaceId) {
    const workspaceUsage = await incrementWorkspaceUsage(workspaceId, "drafts")
    if (!workspaceUsage.allowed) {
      await decrementUsage(userId, "drafts")
      return err({ code: "PLAN_LIMIT_EXCEEDED", message: "Workspace draft limit reached", userMessage: "This client workspace has used its 60 drafts this month." })
    }
    usage = { ...usage, remaining: workspaceUsage.remaining }
  }

  const refundUsage = async () => {
    await decrementUsage(userId, "drafts")
    if (isAgency && workspaceId) await decrementWorkspaceUsage(workspaceId, "drafts")
  }

  const role = rawRole
  const format: PostFormat = FORMAT_MAP[rawFormat] || "medium"

  const isProOrAbove = plan.toLowerCase() === "pro" || plan.toLowerCase().startsWith("agency")
  const voiceProfile = isProOrAbove ? await getWorkspaceVoiceProfile(workspaceId, `${topic} ${hook} ${originalContent ?? ""}`).catch(() => undefined) : undefined

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
    await refundUsage()
    return err({ code: "INTERNAL_ERROR", message: "Post generation failed", userMessage: "Post generation failed. Please try again in a moment." })
  }

  // Revise only when the deterministic checks find something wrong, and tell
  // the revision what to fix. The old unconditional humanize pass ran on every
  // draft without the voice profile, which is how a hook the user picked came
  // back attached to a body that no longer sounded like them.
  let content = sanitizeGeneratedText(rawPost.trim())
  const checkOptions = { minChars: 80, maxChars: 3000 }
  const defects = checkText(content, checkOptions)
  if (defects.length) {
    try {
      const { system: revSystem, user: revUser } = buildRevisePrompt(content, role, defects, voiceProfile, { topic, goal: goal || undefined })
      const revised = sanitizeGeneratedText((await callAi("post-improvement", revSystem, revUser, {
        temperature: 0.4, maxTokens: 1000,
        userId, plan, cache: false,
      })).trim())
      if (revised && checkText(revised, checkOptions).length < defects.length) content = revised
    } catch {
      // Keep the sanitized original.
    }
  }

  const artifact = toPostArtifact(content) || toPostArtifact(rawPost)
  if (!artifact) {
    await refundUsage()
    return err({ code: "INTERNAL_ERROR", message: "Invalid post artifact", userMessage: "Post generation failed. Please try again in a moment." })
  }

  return ok({
    content: artifact.content,
    wordCount: artifact.wordCount,
    remaining: usage.remaining,
  })
}
