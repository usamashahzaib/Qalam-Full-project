import "server-only"

import { callAi, safeParseJson } from "@/lib/server/ai-router-v2"
import { build7MetricScorePrompt } from "@/lib/prompts/role-aware-system"
import { getWorkspaceVoiceProfile } from "@/lib/server/voice-profile"
import { gateScores, freeTierAttemptCap } from "@/lib/content-score-gate"
import { ok, err } from "@/lib/errors"
import type { Result } from "@/lib/errors"

export interface ScoreBreakdown {
  hook: number
  readability: number
  authority: number
  specificity: number
  cta: number
  human: number
  voiceFit: number
}

export interface ScorePostOutput {
  scores: ScoreBreakdown
  overall: number
  tips: Record<string, string>
  hashtags: string[]
}

export interface ScorePostInput {
  content: string
  role?: string
  userId: string
  internalUserId?: string
  workspaceId?: string | null
  plan: string
  attempt?: number
}

export async function scorePost(input: ScorePostInput): Promise<Result<ScorePostOutput>> {
  const { content, role: rawRole = "", userId, workspaceId, plan, attempt = 1 } = input
  const freeCap = plan.toLowerCase() === "free" ? freeTierAttemptCap(attempt) : undefined

  const trimmed = content.trim()
  if (!trimmed || trimmed.length < 4) {
    return err({ code: "VALIDATION_ERROR", message: "Content too short to score", userMessage: "Post is too short to score." })
  }

  const role = rawRole

  const isProOrAbove = plan.toLowerCase() === "pro" || plan.toLowerCase().startsWith("agency")
  const voiceProfile = isProOrAbove ? await getWorkspaceVoiceProfile(workspaceId, trimmed).catch(() => undefined) : undefined

  const { system, user } = build7MetricScorePrompt(trimmed, role, voiceProfile)

  let raw = ""
  try {
    raw = await callAi("post-scoring", system, user, {
      json: true, temperature: 0.2, maxTokens: 600,
      userId, plan, cache: false,
    })
  } catch {
    return err({ code: "AI_UNAVAILABLE", message: "Scoring unavailable", userMessage: "Could not evaluate this post. Please try again." })
  }

  const parsed = safeParseJson<{
    hook: number; readability: number; authority: number; specificity: number
    cta: number; human: number; voiceFit: number; overall: number
    tips: Record<string, string>; hashtags: string[]
  }>(raw)

  if (!parsed) {
    return err({ code: "AI_UNAVAILABLE", message: "Scoring returned invalid JSON" })
  }

  const rawScores = {
    hook: parsed.hook,
    readability: parsed.readability,
    authority: parsed.authority,
    specificity: parsed.specificity,
    cta: parsed.cta,
    human: parsed.human,
    voiceFit: parsed.voiceFit,
  }
  if (!Object.values(rawScores).every((value) => typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 100)) {
    return err({ code: "AI_UNAVAILABLE", message: "Scoring returned invalid dimensions" })
  }
  const rawOverall = Math.round(Object.values(rawScores).reduce((a, b) => a + b, 0) / 7)

  // The prompt's contract is 0-100. Low evaluations are not a different scale.
  const m = 1
  const gated = gateScores(trimmed, {
    hook: rawScores.hook * m,
    readability: rawScores.readability * m,
    authority: rawScores.authority * m,
    specificity: rawScores.specificity * m,
    cta: rawScores.cta * m,
    human: rawScores.human * m,
    voiceFit: rawScores.voiceFit * m,
    overall: rawOverall * m,
    tips: parsed.tips ?? {},
    hashtags: parsed.hashtags ?? [],
  }, freeCap)

  return ok({
    scores: {
      hook: gated.hook,
      readability: gated.readability,
      authority: gated.authority,
      specificity: gated.specificity,
      cta: gated.cta,
      human: gated.human,
      voiceFit: gated.voiceFit,
    },
    overall: gated.overall,
    tips: gated.tips ?? {},
    hashtags: gated.hashtags ?? [],
  })
}
