import "server-only"

import { callAi, safeParseJson } from "@/lib/server/ai-router-v2"
import { buildCommentPrompt, MAX_COMMENT_CHARS, type CommentStyle } from "@/lib/prompts/builders/comment"
import { checkVariants, type Defect } from "@/lib/prompts/output-checks"
import { sanitizeGeneratedText } from "@/lib/content-guard"
import type { VoiceProfile } from "@/lib/prompts/role-profiles"
import { log } from "@/lib/server/logging"

export interface GenerateCommentsInput {
  postText: string
  style: CommentStyle
  profileLabel?: string
  voiceProfile?: VoiceProfile | null
  variants: number
  userId: string
  plan: string
}

export interface GenerateCommentsResult {
  comments: Array<{ style: CommentStyle; text: string }>
  /** Defects that survived the repair pass. Logged, not shown to the user. */
  remainingDefects: Defect[]
  modelCalls: number
}

const MIN_COMMENT_CHARS = 8

// One repair at most. A second repair costs another round trip on a
// user-visible synchronous route and, in practice, trades one flawed variant
// for a different flawed variant.
const MAX_REPAIRS = 1

function parseComments(raw: string): string[] {
  const parsed = safeParseJson<{ comments?: Array<{ text?: unknown }> } | Array<{ text?: unknown }>>(raw)
  const list = Array.isArray(parsed) ? parsed : parsed?.comments
  if (!Array.isArray(list)) return []
  return list
    .map((item) => (typeof item?.text === "string" ? sanitizeGeneratedText(item.text) : ""))
    .filter((text) => text.length > 0)
}

/**
 * Generate comment variants, validate the final candidates, and repair once if
 * the deterministic checks find something objectively wrong.
 *
 * Both the app route and the extension route call this, so a fix to comment
 * quality lands in both surfaces at once. Billing stays in the routes: this
 * function performs no reservation and no refund.
 */
export async function generateComments(input: GenerateCommentsInput): Promise<GenerateCommentsResult> {
  const { postText, style, profileLabel, voiceProfile, variants, userId, plan } = input

  const checkOptions = {
    expectedCount: variants,
    minChars: MIN_COMMENT_CHARS,
    maxChars: MAX_COMMENT_CHARS,
  }

  let texts: string[] = []
  let defects: Defect[] = []
  let modelCalls = 0

  for (let attempt = 0; attempt <= MAX_REPAIRS; attempt += 1) {
    const { system, user } = buildCommentPrompt({
      postText,
      style,
      profileLabel,
      voiceProfile,
      variants,
      defects: attempt === 0 ? [] : defects,
      previousAttempt: attempt === 0 ? [] : texts,
    })

    let raw = ""
    try {
      raw = await callAi("chat-strategist", system, user, {
        json: true,
        temperature: 0.8,
        maxTokens: 600,
        userId,
        plan,
        cache: false,
      })
      modelCalls += 1
    } catch (error) {
      log.warn("comments.generate.provider_failed", { userId, attempt, error: (error as Error).message })
      // A provider failure on the repair pass leaves the first attempt intact.
      break
    }

    const candidates = parseComments(raw)
    const rawCheck = checkVariants(candidates, checkOptions)
    const kept = candidates.filter((_, index) => !rawCheck.duplicateIndexes.includes(index))
    // Validate what we would actually return, not the raw model output, then
    // add back the duplicate findings. Dropping a duplicate leaves the set
    // short, and the repair pass needs to know it was short because two
    // variants said the same thing, not just that a count was wrong.
    const keptDefects = [
      ...rawCheck.defects.filter((d) => d.code === "duplicate_variant"),
      ...checkVariants(kept, checkOptions).defects,
    ]

    // Keep the repair only when it is an improvement. Otherwise a second pass
    // can trade a good set for a worse one.
    const improved =
      kept.length > texts.length ||
      (kept.length === texts.length && keptDefects.length < defects.length)
    if (attempt === 0 || improved) {
      texts = kept
      defects = keptDefects
    }

    if (!defects.length) break
  }

  return {
    comments: texts.slice(0, variants).map((text) => ({ style, text })),
    remainingDefects: defects,
    modelCalls,
  }
}
