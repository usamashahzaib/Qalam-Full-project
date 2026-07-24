import "server-only"

import { callAi, safeParseJson } from "@/lib/server/ai-router-v2"
import { build7MetricScorePrompt } from "@/lib/prompts/role-aware-system"
import { getWorkspaceVoiceProfile } from "@/lib/server/voice-profile"
import { gateScores } from "@/lib/content-score-gate"
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
}

export async function scorePost(input: ScorePostInput): Promise<Result<ScorePostOutput>> {
  const { content, role: rawRole = "", userId, workspaceId, plan } = input

  const trimmed = content.trim()
  if (!trimmed || trimmed.length < 4) {
    return err({ code: "VALIDATION_ERROR", message: "Content too short to score", userMessage: "Post is too short to score." })
  }

  const role = rawRole

  const isProOrAbove = plan.toLowerCase() === "pro" || plan.toLowerCase().startsWith("agency")
  const voiceProfile = isProOrAbove ? await getWorkspaceVoiceProfile(workspaceId).catch(() => undefined) : undefined

  const { system, user } = build7MetricScorePrompt(trimmed, role, voiceProfile)

  let raw = ""
  try {
    raw = await callAi("post-scoring", system, user, {
      json: true, temperature: 0.2, maxTokens: 600,
      userId, plan, cache: false,
    })
  } catch {
    const base = Math.max(45, Math.min(72, trimmed.length * 3))
    const gated = gateScores(trimmed, {
      hook: base, readability: base, authority: base - 5, specificity: base - 8, cta: base - 10, human: base, voiceFit: base - 6,
      overall: base - 4,
      tips: { specificity: "Add a concrete example or result.", cta: "End with a clear next step." },
      hashtags: [],
    })
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
  const rawOverall = parsed.overall ?? Math.round(Object.values(rawScores).reduce((a, b) => a + b, 0) / 7)

  // AI sometimes returns 0-10 scale despite prompt saying 0-100 - normalize
  const isZeroToTen = rawOverall < 15 && Object.values(rawScores).every((v) => v <= 10)
  const m = isZeroToTen ? 10 : 1
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
  })

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
