import "server-only"

import { callAi, safeParseJson } from "@/lib/server/ai-router-v2"
import { incrementUsage } from "@/lib/server/plan-limits-v2"
import { decrementUsage } from "@/lib/server/plan-limits-v2"
import { incrementWorkspaceUsage, decrementWorkspaceUsage } from "@/lib/server/workspace-usage"
import { buildImprovePrompt, build7MetricScorePrompt } from "@/lib/prompts/role-aware-system"
import { checkGrounding, checkText } from "@/lib/prompts/output-checks"
import { authorFacts } from "@/lib/prompts/writing-policy"
import { applyVoiceMechanics } from "@/lib/voice-measure"
import { sanitizeGeneratedText } from "@/lib/content-guard"
import { getWorkspaceVoiceProfile } from "@/lib/server/voice-profile"
import { gateScores, verifiedUnsupportedClaims, capUnsupported } from "@/lib/content-score-gate"
import { toPostArtifact } from "@/lib/use-cases/post-artifact"
import { ok, err } from "@/lib/errors"
import type { Result } from "@/lib/errors"

export interface ImprovePostInput {
  content: string
  role: string
  scores?: Record<string, number>
  userId: string
  internalUserId?: string
  workspaceId?: string | null
  plan: string
  /** The topic and goal the draft was generated from. Absent for text the author wrote. */
  brief?: string
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
  unsupported: string[]
}

const toNumber = (value: unknown) => typeof value === "number" && Number.isFinite(value) ? value : 0
const normalizeScores = (raw: ScorePayload, content = "", brief?: string): NormalizedScores => {
  const unsupported = brief?.trim() ? verifiedUnsupportedClaims(content, raw.unsupported) : []
  raw = capUnsupported(raw as Record<string, number>, unsupported)
  const vals = scoreKeys.map((k) => toNumber(raw[k]))
  // Same formula as score-post: the mean of the seven, never the model's own "overall".
  const rawOverall = vals.reduce((a, b) => a + b, 0) / vals.length
  const m = rawOverall < 15 && vals.every((v) => v <= 10) ? 10 : 1
  const scores = Object.fromEntries(scoreKeys.map((k) => [k, Math.min(100, Math.round(toNumber(raw[k]) * m))])) as Record<typeof scoreKeys[number], number>

  return {
    ...scores,
    overall: Math.min(100, Math.round(rawOverall * m)),
    tips: raw.tips && typeof raw.tips === "object" && !Array.isArray(raw.tips) ? raw.tips as Record<string, string> : {},
    hashtags: Array.isArray(raw.hashtags) ? raw.hashtags : [],
    unsupported,
  }
}

export async function improvePost(
  input: ImprovePostInput
): Promise<Result<ImprovePostOutput>> {
  const { content, role: rawRole, scores = {}, userId, workspaceId, plan, brief } = input

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
  const isAgency = plan.toLowerCase() === "agency"
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

  const voiceProfile = await getWorkspaceVoiceProfile(workspaceId, content, plan).catch(() => undefined)

  // Push to 90+ improves what the user has. A short post they wrote is not invalid for being short.
  let artifact = toPostArtifact(content, { minWords: 20 })
  if (!artifact) {
    await refundUsage()
    return err({ code: "VALIDATION_ERROR", message: "Invalid source post", userMessage: "Content too short to improve." })
  }

  const checkOptions = { minChars: 40, maxChars: 3000 }
  const proof = authorFacts(voiceProfile)
  // A rewrite may keep what the draft already says, but never add a figure, a cited study or
  // an event of its own. Live runs added "Hiring costs 150% of an annual salary" and "burn about
  // 30% faster, according to a recent SaaS benchmark" to lift the score.
  const addsInventions = (candidate: string) =>
    checkGrounding(candidate, [brief, content, proof].filter(Boolean).join("\n"), { brief: brief || content }).length > 0
  // With a brief, anything the AI draft invented is a defect to fix, not a fact to keep.
  const inventedInDraft = (text: string) =>
    brief?.trim() ? checkGrounding(text, [brief, proof].filter(Boolean).join("\n"), { brief }) : []
  let rawScores: ScorePayload = {}
  let scoringSucceeded = false
  // Only a scored candidate that beats the draft the user already has is worth a credit.
  const startingOverall = typeof scores.overall === "number" ? scores.overall : 0
  let best: { content: string; wordCount: number; scores: NormalizedScores } | null = null
  // Two improvement attempts at most. A third round of "make it better" is
  // where a draft stops being the author's and starts being the model's.
  for (let attempt = 1; attempt <= 2; attempt++) {
    const previousDefects = [...checkText(artifact.content, checkOptions), ...inventedInDraft(artifact.content)]
    const { system: impSystem, user: impUser } = buildImprovePrompt(
      artifact.content,
      attempt === 1 ? scores : normalizeScores(rawScores, artifact.content, brief),
      role,
      voiceProfile,
      previousDefects,
      brief
    )
    const candidate = await callAi("post-improvement", impSystem, impUser, {
      temperature: 0.7, maxTokens: 1000,
      userId, plan, cache: false,
    }).catch(() => "")

    // Validate the candidate we would actually return. Anything that fails the
    // objective checks is discarded and the previous version is kept, so a bad
    // improvement can never replace a usable draft.
    const trimmed = applyVoiceMechanics(sanitizeGeneratedText(candidate.trim()), voiceProfile?.measured)
    const candidateDefects = checkText(trimmed, checkOptions)
    const isValidCandidate = !candidateDefects.length && !/^\s*[{\[]/.test(trimmed) && !addsInventions(trimmed)
    if (!isValidCandidate) continue
    artifact = { content: trimmed, wordCount: trimmed.split(/\s+/).filter(Boolean).length }

    const { system: scoreSystem, user: scoreUser } = build7MetricScorePrompt(artifact.content, role, voiceProfile, brief)
    const scoreRaw = await callAi("post-scoring", scoreSystem, scoreUser, {
      json: true, temperature: 0.2, maxTokens: 600,
      userId, plan, cache: false, humanWriting: false,
    }).catch(() => "{}")

    rawScores = safeParseJson<ScorePayload>(scoreRaw) || {}
    const normalized = normalizeScores(rawScores, artifact.content, brief)
    scoringSucceeded = Object.values(normalized).some((v) => typeof v === "number" && v > 0)
    if (!scoringSucceeded) continue
    const gated = gateScores(artifact.content, normalized)
    if (gated.overall > (best?.scores.overall ?? startingOverall)) best = { ...artifact, scores: gated }
    if (gated.overall >= 90) break
  }

  // A rewrite that scored no better, or could not be scored, is not an
  // improvement. Returning it would charge a credit for a worse draft.
  if (!best) {
    await refundUsage()
    return err({ code: "INTERNAL_ERROR", message: "Improvement failed", userMessage: "Could not improve this draft this time. Your credit was not used." })
  }

  return ok({
    content: best.content,
    scores: best.scores,
    remaining: usage.remaining,
  })
}
