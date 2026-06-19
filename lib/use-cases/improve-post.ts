import "server-only"

import { callAi, safeParseJson } from "@/lib/server/ai-router-v2"
import { incrementUsage } from "@/lib/server/plan-limits-v2"
import { buildPushTo90Prompt, build7MetricScorePrompt } from "@/lib/prompts/role-aware-system"
import { getWorkspaceVoiceProfile } from "@/lib/server/voice-profile"
import { gateScores } from "@/lib/content-score-gate"
import { toPostArtifact } from "@/lib/use-cases/post-artifact"
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
  internalUserId?: string
  workspaceId?: string | null
  plan: string
}

export interface ImprovePostOutput {
  content: string
  scores: Record<string, unknown> | null
  remaining: number
}

type ScorePayload = Record<string, unknown>
const scoreKeys = ["hook", "readability", "authority", "specificity", "cta", "human", "voiceFit"] as const
type NormalizedScores = Record<typeof scoreKeys[number], number> & {
  overall: number
  tips: Record<string, string>
  hashtags: string[]
}

const toNumber = (value: unknown) => typeof value === "number" && Number.isFinite(value) ? value : 0
const normalizeScores = (raw: ScorePayload): NormalizedScores => {
  const vals = scoreKeys.map((k) => toNumber(raw[k]))
  const rawOverall = toNumber(raw.overall) || vals.reduce((a, b) => a + b, 0) / Math.max(1, vals.filter(Boolean).length)
  const m = rawOverall < 15 && vals.every((v) => v <= 10) ? 10 : 1
  const scores = Object.fromEntries(scoreKeys.map((k) => [k, Math.min(100, Math.round(toNumber(raw[k]) * m))])) as Record<typeof scoreKeys[number], number>

  return {
    ...scores,
    overall: Math.min(100, Math.round(rawOverall * m)),
    tips: raw.tips && typeof raw.tips === "object" && !Array.isArray(raw.tips) ? raw.tips as Record<string, string> : {},
    hashtags: Array.isArray(raw.hashtags) ? raw.hashtags : [],
  }
}

export async function improvePost(
  input: ImprovePostInput
): Promise<Result<ImprovePostOutput>> {
  const { content, role: rawRole, scores = {}, userId, workspaceId, plan } = input

  if (!content.trim()) {
    return err({ code: "VALIDATION_ERROR", message: "Content is required", userMessage: "Content too short to improve." })
  }

  let usage: Awaited<ReturnType<typeof incrementUsage>>
  try {
    usage = await incrementUsage(userId, "drafts")
  } catch {
    return err({ code: "INTERNAL_ERROR", message: "Usage check failed", userMessage: "Could not verify your usage limit. Please try again." })
  }
  if (!usage.allowed) {
    return err({ code: "PLAN_LIMIT_EXCEEDED", message: "Draft limit reached", userMessage: "Draft limit reached. Upgrade your plan." })
  }

  const role = ROLE_MAP[rawRole] || "founder"

  const isProOrAbove = plan.toLowerCase() === "pro" || plan.toLowerCase().startsWith("agency")
  const voiceProfile = isProOrAbove ? await getWorkspaceVoiceProfile(workspaceId).catch(() => undefined) : undefined

  let artifact = toPostArtifact(content)
  if (!artifact) {
    return err({ code: "VALIDATION_ERROR", message: "Invalid source post", userMessage: "Content too short to improve." })
  }

  let rawScores: ScorePayload = {}
  let scoringSucceeded = false
  for (let attempt = 1; attempt <= 2; attempt++) {
    const { system: impSystem, user: impUser } = buildPushTo90Prompt(artifact.content, attempt === 1 ? scores : normalizeScores(rawScores), role, voiceProfile)
    const candidate = await callAi("post-improvement", impSystem, impUser, {
      temperature: 0.7, maxTokens: 1000,
      userId, plan, cache: false,
    }).catch(() => "")

    // Relaxed validation: accept any non-empty, non-JSON text (don't require 80+ words)
    const trimmed = candidate.trim()
    const isValidCandidate = trimmed.length > 30 && !/^\s*[{\[]/.test(trimmed)
    if (!isValidCandidate) continue
    artifact = { content: trimmed, wordCount: trimmed.split(/\s+/).filter(Boolean).length }

    const { system: scoreSystem, user: scoreUser } = build7MetricScorePrompt(artifact.content, role, voiceProfile)
    const scoreRaw = await callAi("post-improvement", scoreSystem, scoreUser, {
      json: true, temperature: 0.2, maxTokens: 600,
      userId, plan, cache: false,
    }).catch(() => "{}")

    rawScores = safeParseJson<ScorePayload>(scoreRaw) || {}
    scoringSucceeded = Object.values(normalizeScores(rawScores)).some((v) => typeof v === "number" && v > 0)
    if (gateScores(artifact.content, normalizeScores(rawScores)).overall >= 90) break
  }

  return ok({
    content: artifact.content,
    scores: scoringSucceeded ? gateScores(artifact.content, normalizeScores(rawScores)) : null,
    remaining: usage.remaining,
  })
}
