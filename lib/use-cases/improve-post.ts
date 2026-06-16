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

  const rawScores = safeParseJson<Record<string, number>>(scoreRaw) || {}
  const scoreKeys = ["hook", "readability", "authority", "specificity", "cta", "human", "voiceFit"]
  const vals = scoreKeys.map((k) => rawScores[k] ?? 0)
  const rawOverall = rawScores.overall ?? (vals.reduce((a, b) => a + b, 0) / Math.max(1, vals.filter((v) => v > 0).length))
  const isZeroToTen = rawOverall < 15 && vals.every((v) => v <= 10)
  const m = isZeroToTen ? 10 : 1
  const newScores: Record<string, unknown> = {
    ...Object.fromEntries(scoreKeys.map((k) => [k, Math.round((rawScores[k] ?? 0) * m)])),
    overall: Math.round(rawOverall * m),
    tips: rawScores.tips ?? {},
    hashtags: rawScores.hashtags ?? [],
  }
  const usage = await incrementUsage(userId, "drafts")

  return ok({
    content: improved.trim(),
    scores: newScores,
    remaining: usage.remaining,
  })
}
