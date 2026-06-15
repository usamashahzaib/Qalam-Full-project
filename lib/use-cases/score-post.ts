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
  if (!trimmed || trimmed.length < 20) {
    return err({ code: "VALIDATION_ERROR", message: "Content too short to score", userMessage: "Post is too short to score." })
  }

  const role = ROLE_MAP[rawRole] || "founder"
  const { system, user } = build7MetricScorePrompt(trimmed, role)

  const raw = await callAi(system, user, {
    json: true, temperature: 0.2, maxTokens: 600,
    userId, plan, cache: false,
  })

  const parsed = safeParseJson<{
    hook: number; readability: number; authority: number; specificity: number
    cta: number; human: number; voiceFit: number; overall: number
    tips: Record<string, string>; hashtags: string[]
  }>(raw)

  if (!parsed) {
    return err({ code: "AI_UNAVAILABLE", message: "Scoring returned invalid JSON" })
  }

  return ok({
    scores: {
      hook: parsed.hook,
      readability: parsed.readability,
      authority: parsed.authority,
      specificity: parsed.specificity,
      cta: parsed.cta,
      human: parsed.human,
      voiceFit: parsed.voiceFit,
    },
    overall: parsed.overall,
    tips: parsed.tips ?? {},
    hashtags: parsed.hashtags ?? [],
  })
}
