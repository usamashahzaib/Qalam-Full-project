import "server-only"

import { callAi, safeParseJson } from "@/lib/server/ai-router-v2"
import { incrementUsage, decrementUsage } from "@/lib/server/plan-limits-v2"
import { ok, err } from "@/lib/errors"
import type { Result } from "@/lib/errors"
import { buildHook5StylesPrompt } from "@/lib/prompts/role-aware-system"
import { log } from "@/lib/server/logging"
import type { VoiceProfile } from "@/lib/prompts/role-aware-system"

export interface GenerateHooksInput {
  topic: string
  role: string
  format?: string
  goal?: string
  userId: string
  plan: string
  voiceProfile?: VoiceProfile
}

export interface Hook {
  style: string
  text: string
}

export async function generateHooks(input: GenerateHooksInput): Promise<Result<{ hooks: Hook[]; remaining: number }>> {
  const { topic, role, userId, plan } = input

  let usage: Awaited<ReturnType<typeof incrementUsage>>
  try {
    usage = await incrementUsage(userId, "hooks")
  } catch {
    return err({ code: "INTERNAL_ERROR", message: "Usage check failed", userMessage: "Could not verify your usage limit. Please try again in a moment." })
  }

  if (!usage.allowed) {
    return err({ code: "PLAN_LIMIT_EXCEEDED", message: "Hook limit reached", userMessage: "Hook limit reached. Upgrade your plan." })
  }

  const { goal } = input
  const { system, user: userMsg } = buildHook5StylesPrompt(topic, role, goal, input.voiceProfile)
  let raw: string
  try {
    raw = await callAi("hook-generation", system, userMsg, {
      json: true, temperature: 0.9, maxTokens: 500,
      userId, plan, cache: false,
    })
  } catch (genError) {
    await decrementUsage(userId, "hooks")
    log.error("generate-hooks.generation_failed", { userId, error: (genError as Error).message })
    return err({ code: "INTERNAL_ERROR", message: "ai_unavailable", userMessage: "Hook generation is temporarily unavailable. Please try again in a moment." })
  }

  const parsed = safeParseJson<unknown>(raw)
  const hooks: Hook[] = Array.isArray(parsed)
    ? parsed
    : Array.isArray((parsed as { hooks?: unknown })?.hooks)
      ? (parsed as { hooks: Hook[] }).hooks
      : []

  if (!hooks.length) {
    await decrementUsage(userId, "hooks")
    log.warn("generate-hooks.empty_result", { userId })
    return err({ code: "INTERNAL_ERROR", message: "ai_unavailable", userMessage: "Hook generation is temporarily unavailable. Please try again in a moment." })
  }

  return ok({ hooks: hooks.slice(0, 5), remaining: usage.remaining })
}
