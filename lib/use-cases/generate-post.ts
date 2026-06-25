import "server-only"

import { callAi } from "@/lib/server/ai-router-v2"
import { incrementUsage, checkPlanLimit } from "@/lib/server/plan-limits-v2"
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

  // Check limit before generation — consume only after a successful save to avoid
  // burning a credit on AI failures or DB write errors.
  const limitCheck = await checkPlanLimit(userId, "drafts")
  if (!limitCheck.allowed) {
    return err({ code: "PLAN_LIMIT_EXCEEDED", message: "Draft limit reached", userMessage: "Draft limit reached. Upgrade your plan." })
  }

  const voiceProfile = await getWorkspaceVoiceProfile(workspaceId).catch(() => undefined)

  // Pass 1: Generate raw post
  const { system: genSystem, user: genUser } = buildGeneratePrompt(role, topic, format, goal, voiceProfile || undefined)
  const rawPost = await callAi("post-generation", genSystem, genUser, {
    temperature: 0.85, maxTokens: 900,
    userId, plan, cache: false,
  })

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

  // Pass 3: Score + rewrite (paid plans only)
  let score: Record<string, unknown> | null = null
  if (qualityCheck && plan !== "free") {
    try {
      const { system: scoreSystem, user: scoreUser } = buildScorePrompt(content, role)
      const scoreRaw = await callAi("post-improvement", scoreSystem, scoreUser, { json: true, temperature: 0.2, maxTokens: 400, userId, plan, cache: false })
      score = parseJson<Record<string, unknown>>(scoreRaw)
    } catch { score = null }

    if (score && (score.total_score as number) < 80 && score.fix_instruction) {
      try {
        const { system: rw, user: ru } = buildRewritePrompt(content, score.fix_instruction as string, score.biggest_weakness as string, role, voiceProfile || undefined)
        content = (await callAi("post-improvement", rw, ru, { temperature: 0.7, maxTokens: 900, userId, plan, cache: false })).trim()
      } catch { /* keep current content */ }
    }
  }

  if (content.length > LINKEDIN_MAX_POST_CHARS) {
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
    })
    savedPostId = savedPost.id
  } catch (saveError) {
    log.error("generate-post.save_failed", { reqId, userId, error: (saveError as Error).message })
    return err({ code: "INTERNAL_ERROR", message: "Failed to save post" })
  }

  // Consume quota only after a successful save — prevents usage burn on AI/DB failures.
  const usageResult = await incrementUsage(userId, "drafts")
  if (!usageResult.allowed) {
    log.warn("generate-post.usage_exceeded_post_save", { reqId, userId })
    return err({ code: "PLAN_LIMIT_EXCEEDED", message: "Draft limit reached", userMessage: "Draft limit reached. Upgrade your plan." })
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
