import "server-only"

import { callAi } from "@/lib/server/ai-router-v2"
import { incrementUsage, decrementUsage } from "@/lib/server/plan-limits-v2"
import { incrementWorkspaceUsage, decrementWorkspaceUsage } from "@/lib/server/workspace-usage"
import { getWorkspaceVoiceProfile } from "@/lib/server/voice-profile"
import { log } from "@/lib/server/logging"
import { ok, err } from "@/lib/errors"
import type { Result } from "@/lib/errors"
import { hasAiSlop, sanitizeGeneratedText } from "@/lib/content-guard"
import {
  buildGeneratePrompt,
  buildHumanizePrompt,
  buildScorePrompt,
  buildRewritePrompt,
  buildHookVariantsPrompt,
} from "@/lib/prompts/role-aware-system"
import { SupabasePostRepository } from "@/lib/repositories/supabase/SupabasePostRepository"
import { MIN_READY_CONTENT_SCORE } from "@/lib/content-score-gate"

const LINKEDIN_MAX_POST_CHARS = 3000

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GeneratePostInput {
  topic: string
  role: string
  format: "short" | "medium" | "long"
  goal?: string
  qualityCheck?: boolean
  /** External OAuth sub / plan_usage key - for checkPlanLimit and AI routing */
  userId: string
  /** Internal Supabase UUID - for DB foreign-key operations */
  authorId: string
  workspaceId: string
  plan: string
  reqId?: string
}

export interface GeneratePostOutput {
  post: { id: string; content: string; hook: string; body: string; cta: string; hashtags: string; role: string }
  score: Record<string, unknown> | null
  hooks: Array<{ style: string; hook: string }>
  usage: { remaining: number }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function splitPost(text: string) {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean)
  const hashtagLine = lines.findLast((l) => /^#\w/.test(l)) || ""
  const hook = lines[0] || ""
  const bodyLines = lines.filter((l) => l !== hook && l !== hashtagLine)
  const cta = bodyLines.at(-1) || ""
  const body = bodyLines.slice(0, -1).join("\n\n")
  return { hook, body, cta, hashtags: hashtagLine }
}

function parseJson<T>(raw: string): T | null {
  try {
    const cleaned = raw.replace(/```json\n?/gi, "").replace(/```\n?/g, "").trim()
    return JSON.parse(cleaned) as T
  } catch {
    return null
  }
}

// ─── Use case ─────────────────────────────────────────────────────────────────

export async function generatePost(input: GeneratePostInput): Promise<Result<GeneratePostOutput>> {
  const { topic, role, format, goal, qualityCheck = true, userId, authorId, workspaceId, plan, reqId } = input

  // Atomically increment usage BEFORE generation. This is the only correct order:
  // check-then-generate allows thundering-herd bypasses (N concurrent requests all pass
  // the check, all generate, only billing is capped). Increment first; refund on failure.
  let usageResult: Awaited<ReturnType<typeof incrementUsage>>
  try {
    usageResult = await incrementUsage(userId, "drafts")
  } catch {
    return err({ code: "INTERNAL_ERROR", message: "Usage check failed", userMessage: "Could not verify your usage limit. Please try again in a moment." })
  }
  if (!usageResult.allowed) {
    return err({ code: "PLAN_LIMIT_EXCEEDED", message: "Draft limit reached", userMessage: "Draft limit reached. Upgrade your plan." })
  }

  // Agency workspaces each get their own 60-draft allowance, separate from the
  // account-wide counter above. Check after the user-level increment so the
  // account limit is still the outer guard; refund it if this workspace is capped.
  const isAgency = plan.toLowerCase() === "agency"
  if (isAgency) {
    const wsUsage = await incrementWorkspaceUsage(workspaceId, "drafts")
    if (!wsUsage.allowed) {
      await decrementUsage(userId, "drafts")
      return err({ code: "PLAN_LIMIT_EXCEEDED", message: "Workspace draft limit reached", userMessage: "This client workspace has used its 60 drafts this month. Switch clients or wait for the monthly reset." })
    }
  }

  const refundDraftUsage = async () => {
    await decrementUsage(userId, "drafts")
    if (isAgency) await decrementWorkspaceUsage(workspaceId, "drafts")
  }

  const voiceProfile = await getWorkspaceVoiceProfile(workspaceId).catch(() => undefined)

  // Pass 1: Generate raw post
  const { system: genSystem, user: genUser } = buildGeneratePrompt(role, topic, format, goal, voiceProfile || undefined)
  let rawPost: string
  try {
    rawPost = await callAi("post-generation", genSystem, genUser, {
      temperature: 0.85, maxTokens: 900,
      userId, plan, cache: false,
    })
  } catch (genError) {
    await refundDraftUsage()
    log.error("generate-post.generation_failed", { reqId, userId, error: (genError as Error).message })
    return err({ code: "INTERNAL_ERROR", message: "AI generation failed" })
  }

  // Pass 2: Humanize
  const { system: humSystem, user: humUser } = buildHumanizePrompt(rawPost, role)
  let content: string
  try {
    content = (await callAi("post-improvement", humSystem, humUser, { temperature: 0.4, maxTokens: 900, userId, plan, cache: false })).trim()
  } catch {
    content = rawPost.trim()
  }

  // Sanitize and flag AI slop before scoring
  content = sanitizeGeneratedText(content)
  if (hasAiSlop(content)) {
    log.warn("generate-post.ai_slop_detected", { reqId, userId, preview: content.slice(0, 80) })
  }

  // Pass 3: Score and improve every generated draft to the publish-ready floor.
  let score: Record<string, unknown> | null = null
  const scoreContent = async () => {
    try {
      const { system: scoreSystem, user: scoreUser } = buildScorePrompt(content, role)
      const scoreRaw = await callAi("post-scoring", scoreSystem, scoreUser, { json: true, temperature: 0.2, maxTokens: 400, userId, plan, cache: false })
      return parseJson<Record<string, unknown>>(scoreRaw)
    } catch {
      return null
    }
  }
  if (qualityCheck) {
    score = await scoreContent()
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const total = Number(score?.total_score)
      if (!Number.isFinite(total) || total >= MIN_READY_CONTENT_SCORE || !score?.fix_instruction) break
      try {
        const { system: rw, user: ru } = buildRewritePrompt(content, score.fix_instruction as string, score.biggest_weakness as string, role, voiceProfile || undefined)
        const rewritten = await callAi("post-improvement", rw, ru, { temperature: 0.7, maxTokens: 900, userId, plan, cache: false })
        content = sanitizeGeneratedText(rewritten.trim())
        score = await scoreContent()
      } catch {
        break
      }
    }
  }

  if (content.length > LINKEDIN_MAX_POST_CHARS) {
    await refundDraftUsage()
    return err({ code: "VALIDATION_ERROR", message: "linkedin_content_too_long", userMessage: "Post exceeds LinkedIn's 3000 character limit." })
  }

  const { hook, body, cta, hashtags } = splitPost(content)

  const postRepo = new SupabasePostRepository()
  let savedPostId: string
  try {
    const savedPost = await postRepo.create({
      userId: authorId,
      workspaceId,
      authorId,
      title: topic,
      content,
      type: "linkedin-text",
      status: "draft",
      engagementScore: typeof score?.total_score === "number" ? score.total_score : null,
    })
    savedPostId = savedPost.id
  } catch (saveError) {
    await refundDraftUsage()
    log.error("generate-post.save_failed", { reqId, userId, error: (saveError as Error).message })
    return err({ code: "INTERNAL_ERROR", message: "Failed to save post" })
  }

  // Pass 4: Hook variants (cached, best-effort)
  let hooks: Array<{ style: string; hook: string }> = []
  try {
    const { system: hs, user: hu } = buildHookVariantsPrompt(topic, role)
    const hooksRaw = await callAi("hook-generation", hs, hu, { json: true, temperature: 0.9, maxTokens: 400, userId, plan, cache: true, cacheTtl: 3600 })
    hooks = (parseJson<Array<{ style: string; hook: string }>>(hooksRaw) || []).slice(0, 3)
  } catch { hooks = [] }

  return ok({
    post: { id: savedPostId, content, hook, body, cta, hashtags, role },
    score,
    hooks,
    usage: { remaining: usageResult.remaining },
  })
}
