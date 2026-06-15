import { ok, err } from "@/lib/errors"
import type { Result } from "@/lib/errors"
import { callAi, safeParseJson } from "@/lib/server/ai-router-v2"

export interface GenerateRepliesInput {
  postContent: string
  userId: string
}

export interface GenerateRepliesOutput {
  replies: string[]
}

export async function generateReplies(input: GenerateRepliesInput): Promise<Result<GenerateRepliesOutput>> {
  const { postContent, userId } = input
  if (!postContent?.trim() || !userId) return err({ code: "VALIDATION_ERROR", message: "postContent and userId are required" })

  const system = "You write concise, authentic LinkedIn replies. Return only JSON."
  const user = `Generate exactly 3 distinct replies to this LinkedIn post. Keep each reply 1-3 sentences.

Post:
${postContent.slice(0, 1200)}

Return JSON: {"replies":["...","...","..."]}`

  try {
    const raw = await callAi(system, user, { json: true, temperature: 0.85, maxTokens: 500, userId, cache: false })
    const parsed = safeParseJson<{ replies?: unknown[] }>(raw)
    const replies = (parsed?.replies || []).map(String).map((v) => v.trim()).filter(Boolean).slice(0, 3)

    return replies.length ? ok({ replies }) : err({ code: "AI_UNAVAILABLE", message: "Reply generation returned no replies" })
  } catch (cause) {
    return err({ code: "AI_UNAVAILABLE", message: "Failed to generate replies", cause })
  }
}
