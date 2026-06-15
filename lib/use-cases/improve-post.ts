import "server-only"

import { callAi, safeParseJson } from "@/lib/server/ai-router-v2"
import { checkPlanLimit, incrementUsage } from "@/lib/server/plan-limits-v2"
import { buildPushTo90Prompt, build7MetricScorePrompt } from "@/lib/prompts/role-aware-system"
import { ok, err } from "@/lib/errors"
import type { Result } from "@/lib/errors"

const ROLE_MAP: Record<string, string> = {
  HR: "hr",
  Marketing: "marketer",
  Founder: "founder",
  Consultant: "consultant",
  Sales: "sales",
  Tech: "developer",
  Other: "ceo",
}

export interface ImprovePostInput {
  content: string
  role: string
  scores?: Record<string, number>
  userId: string
  plan: string
}

export interface ImprovePostOutput {
  content: string
  scores: Record<string, unknown>
  remaining: number
}

export async function improvePost(
  input: ImprovePostInput
): Promise<Result<ImprovePostOutput>> {
  const { content, role: rawRole, scores = {}, userId, plan } = input

  if (!content.trim()) {
    return err({ code: "VALIDATION_ERROR", message: "Content is required", userMessage: "Content too short to improve." })
  }

  const limit = await checkPlanLimit(userId, "drafts")
  if (!limit.allowed) {
    return err({ code: "PLAN_LIMIT_EXCEEDED", message: "Draft limit reached", userMessage: "Draft limit reached. Upgrade your plan." })
  }

  const role = ROLE_MAP[rawRole] || "founder"

  const { system: impSystem, user: impUser } = buildPushTo90Prompt(content, scores, role)
  const improved = await callAi(impSystem, impUser, {
    temperature: 0.7, maxTokens: 1000,
    userId, plan, cache: false,
  }).catch(() => `${content}\n\nConcrete next step: share one example, one result, and one action for the reader.`)

  const { system: scoreSystem, user: scoreUser } = build7MetricScorePrompt(improved.trim(), role)
  const scoreRaw = await callAi(scoreSystem, scoreUser, {
    json: true, temperature: 0.2, maxTokens: 600,
    userId, plan, cache: false,
  }).catch(() => "{}")

  const newScores = safeParseJson<Record<string, unknown>>(scoreRaw) || {}
  const usage = await incrementUsage(userId, "drafts")

  return ok({
    content: improved.trim(),
    scores: newScores,
    remaining: usage.remaining,
  })
}
