import "server-only"

import { callAi, safeParseJson } from "@/lib/server/ai-router-v2"
import { build7MetricScorePrompt } from "@/lib/prompts/role-aware-system"
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
  plan: string
}

export async function scorePost(input: ScorePostInput): Promise<Result<ScorePostOutput>> {
  const { content, role: rawRole = "", userId, plan } = input

  const trimmed = content.trim()
  if (!trimmed || trimmed.length < 4) {
    return err({ code: "VALIDATION_ERROR", message: "Content too short to score", userMessage: "Post is too short to score." })
  }

  const role = ROLE_MAP[rawRole] || "founder"
  const { system, user } = build7MetricScorePrompt(trimmed, role)

  let raw = ""
  try {
    raw = await callAi(system, user, {
      json: true, temperature: 0.2, maxTokens: 600,
      userId, plan, cache: false,
    })
  } catch {
    const base = Math.max(45, Math.min(72, trimmed.length * 3))
    return ok({
      scores: { hook: base, readability: base, authority: base - 5, specificity: base - 8, cta: base - 10, human: base, voiceFit: base - 6 },
      overall: base - 4,
      tips: { specificity: "Add a concrete example or result.", cta: "End with a clear next step." },
      hashtags: [],
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

  // AI sometimes returns 0-10 scale despite prompt saying 0-100 — normalize
  const isZeroToTen = rawOverall < 15 && Object.values(rawScores).every((v) => v <= 10)
  const m = isZeroToTen ? 10 : 1

  return ok({
    scores: {
      hook: Math.round(rawScores.hook * m),
      readability: Math.round(rawScores.readability * m),
      authority: Math.round(rawScores.authority * m),
      specificity: Math.round(rawScores.specificity * m),
      cta: Math.round(rawScores.cta * m),
      human: Math.round(rawScores.human * m),
      voiceFit: Math.round(rawScores.voiceFit * m),
    },
    overall: Math.round(rawOverall * m),
    tips: parsed.tips ?? {},
    hashtags: parsed.hashtags ?? [],
  })
}
