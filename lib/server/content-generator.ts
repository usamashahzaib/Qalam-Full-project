import { getSystemPrompt } from "@/lib/prompts/role-aware-system"
import { callAi } from "@/lib/server/ai-router"

export type RoleProfile = {
  vocabulary: string[]
  pain_points: string[]
  hook_templates: string[]
  banned_words: string[]
  tone: string
}

export type VoiceProfile = {
  tone?: string
  sentenceLength?: string
  formatting?: string
  emojiUsage?: string
  hashtagUsage?: string
  vocabulary?: string[]
  patterns?: string[]
}

export type GeneratedPost = {
  full_text: string
  hook: string
  body: string
  cta: string
  suggested_hashtags: string[]
  engagement_prediction: string
}

export type ScoreResult = {
  total_score: number
  hook_score: number
  authenticity_score: number
  specificity_score: number
  engagement_score: number
  formatting_score: number
  feedback: string
  is_good_enough: boolean
}

export type HookOption = { hook: string; style: string }

export const roleOptions = ["ai_engineer", "ceo", "hr", "sales", "designer", "consultant", "founder", "developer"]

const fallbackPost = (topic: string): GeneratedPost => ({
  hook: `Most people are solving the wrong problem with ${topic}.`,
  body: `The real issue is usually more specific than the advice sounds.\n\nStart with the constraint.\nFind the behavior behind it.\nThen build the smallest next step that proves what works.`,
  cta: "What would you test first?",
  full_text: `Most people are solving the wrong problem with ${topic}.\n\nThe real issue is usually more specific than the advice sounds.\n\nStart with the constraint.\nFind the behavior behind it.\nThen build the smallest next step that proves what works.\n\nWhat would you test first?\n\n#LinkedIn #Growth #Strategy`,
  suggested_hashtags: ["LinkedIn", "Growth", "Strategy"],
  engagement_prediction: "Specific enough to invite replies and broad enough for role-based discussion.",
})

const fallbackScore = (feedback = "Add more specific examples and a sharper first line."): ScoreResult => ({
  total_score: 70,
  hook_score: 70,
  authenticity_score: 70,
  specificity_score: 70,
  engagement_score: 70,
  formatting_score: 70,
  feedback,
  is_good_enough: false,
})

const extractJson = (text: string) => {
  const block = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  const raw = block?.[1] || text
  const start = raw.indexOf("{")
  const end = raw.lastIndexOf("}")
  if (start < 0 || end < start) throw new Error("json_missing")
  return JSON.parse(raw.slice(start, end + 1)) as Record<string, unknown>
}

const splitPost = (text: string) => {
  const lines = text.split("\n").map((line) => line.trim()).filter(Boolean)
  const hashtagLine = lines.findLast((line) => line.includes("#")) || ""
  const suggested_hashtags = [...hashtagLine.matchAll(/#([\w-]+)/g)].map((match) => match[1]).slice(0, 5)
  const hook = lines[0] || ""
  const cta = [...lines].reverse().find((line) => line.endsWith("?")) || lines.at(-1) || ""
  const body = lines.filter((line) => line !== hook && line !== cta && line !== hashtagLine).join("\n\n")
  return { hook, body, cta, suggested_hashtags }
}

const normalizePost = (raw: string): GeneratedPost => {
  try {
    const parsed = extractJson(raw)
    const hook = String(parsed.hook || "").trim()
    const body = String(parsed.body || "").trim()
    const cta = String(parsed.cta || "").trim()
    const full_text = String(parsed.full_text || [hook, body, cta].filter(Boolean).join("\n\n")).trim()
    const suggested_hashtags = Array.isArray(parsed.suggested_hashtags)
      ? parsed.suggested_hashtags.map(String).map((tag) => tag.replace(/^#/, "")).filter(Boolean).slice(0, 5)
      : splitPost(full_text).suggested_hashtags
    return {
      hook,
      body,
      cta,
      full_text,
      suggested_hashtags,
      engagement_prediction: String(parsed.engagement_prediction || "Strong hook, mobile formatting, and clear CTA."),
    }
  } catch {
    const parts = splitPost(raw)
    return {
      ...parts,
      full_text: raw.trim(),
      engagement_prediction: "Strong hook, mobile formatting, and clear CTA.",
    }
  }
}

export async function generatePost(options: {
  topic: string
  role: string
  tone?: string
  voiceProfile?: VoiceProfile
  goal?: string
  format?: "short" | "medium" | "long"
}): Promise<GeneratedPost> {
  const format = options.format || "medium"
  const systemPrompt = getSystemPrompt(options.role, options.voiceProfile, options.goal)
  const userMessage = `Topic: ${options.topic}
Role: ${options.role}
Tone override: ${options.tone || "none"}
Format: ${format}
Return JSON with full_text, hook, body, cta, suggested_hashtags, engagement_prediction.`

  try {
    const first = await callAi(systemPrompt, userMessage, { json: false, temperature: 0.8 })
    const post = normalizePost(first)
    if (post.hook && post.full_text) return post
    const retry = await callAi(systemPrompt, `Write one ${format} LinkedIn post about ${options.topic}. Return only post text.`, { json: false, temperature: 0.7 })
    return normalizePost(retry)
  } catch {
    return fallbackPost(options.topic)
  }
}

export async function scoreContent(content: string, role: string): Promise<ScoreResult> {
  const prompt = `Score this LinkedIn post for role ${role}. Return strict JSON with total_score, hook_score, authenticity_score, specificity_score, engagement_score, formatting_score, feedback, is_good_enough.

Content:
${content}`

  try {
    const raw = await callAi("You are a strict LinkedIn content quality judge.", prompt, { json: true, temperature: 0.2 })
    const data = extractJson(raw)
    const scores = {
      hook_score: Number(data.hook_score || 0),
      authenticity_score: Number(data.authenticity_score || 0),
      specificity_score: Number(data.specificity_score || 0),
      engagement_score: Number(data.engagement_score || 0),
      formatting_score: Number(data.formatting_score || 0),
    }
    const total = Number(data.total_score || Math.round(Object.values(scores).reduce((sum, value) => sum + value, 0) / 5))
    return {
      total_score: total,
      ...scores,
      feedback: String(data.feedback || "Make the hook sharper and add more concrete details."),
      is_good_enough: Boolean(data.is_good_enough ?? total >= 80),
    }
  } catch {
    return fallbackScore()
  }
}

export async function rewriteWithFeedback(content: string, feedback: string, role: string, voiceProfile?: VoiceProfile) {
  try {
    return await callAi(
      getSystemPrompt(role, voiceProfile),
      `Rewrite this post using the feedback. Preserve the hook structure but improve it.

Feedback:
${feedback}

Post:
${content}`,
      { json: false, temperature: 0.75 }
    )
  } catch {
    return content
  }
}

export async function qualityControlDraft(content: string, role: string, voiceProfile?: VoiceProfile, maxRetries = 3) {
  let finalContent = content
  let finalScore = await scoreContent(finalContent, role)
  let attemptsUsed = 0

  while (finalScore.total_score < 80 && attemptsUsed < maxRetries) {
    attemptsUsed += 1
    const rewritten = await rewriteWithFeedback(finalContent, finalScore.feedback, role, voiceProfile)
    const nextScore = await scoreContent(rewritten, role)
    if (nextScore.total_score <= finalScore.total_score) break
    finalContent = rewritten
    finalScore = nextScore
  }

  return { finalContent, finalScore, attemptsUsed }
}

export async function generateHooks(topic: string, role: string, count = 3): Promise<HookOption[]> {
  try {
    const raw = await callAi(
      getSystemPrompt(role),
      `Generate ${count} LinkedIn hook options for topic: ${topic}. Use different styles: question, statement, statistic, story opener, contrarian take. Return JSON: {"hooks":[{"hook":"...","style":"..."}]}`,
      { json: true, temperature: 0.9 }
    )
    const data = extractJson(raw)
    const hooks = Array.isArray(data.hooks) ? data.hooks : []
    return hooks
      .map((item) => {
        const row = item as Record<string, unknown>
        return { hook: String(row.hook || ""), style: String(row.style || "Hook") }
      })
      .filter((item) => item.hook)
      .slice(0, count)
  } catch {
    return [
      { hook: `What if ${topic} is not the real problem?`, style: "Question" },
      { hook: `Most people get ${topic} backwards.`, style: "Contrarian" },
      { hook: `I learned this about ${topic} the hard way.`, style: "Story" },
    ].slice(0, count)
  }
}
