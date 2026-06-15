import "server-only"

import { callAi, safeParseJson } from "@/lib/server/ai-router-v2"
import { ok, err } from "@/lib/errors"
import type { Result } from "@/lib/errors"

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AnalyzeCompetitorInput {
  postText: string
  userId: string
  plan: string
}

export interface AnalyzeCompetitorOutput {
  hookStructure: { pattern: string; length: string; type: string }
  engagementFactors: string[]
  contentPattern: { framework: string; structure: string; estimatedReadTime: string }
  improvements: string[]
}

// ─── Use case ─────────────────────────────────────────────────────────────────

export async function analyzeCompetitor(
  input: AnalyzeCompetitorInput
): Promise<Result<AnalyzeCompetitorOutput>> {
  const { postText, userId, plan } = input

  const trimmed = postText.trim()
  if (trimmed.length < 50) {
    return err({ code: "VALIDATION_ERROR", message: "Post too short", userMessage: "Paste at least 50 characters of the competitor post" })
  }

  const system = `You are an expert LinkedIn content strategist. Analyze posts with surgical precision. Return only valid JSON. No markdown, no extra text.`

  const userMsg = `Analyze this LinkedIn post and return a structured breakdown.

POST TEXT:
${trimmed.slice(0, 3000)}

Return JSON with exactly this structure:
{
  "hookStructure": {
    "pattern": "e.g. Bold claim, Question, Story opener, Data-led, Contrarian",
    "length": "short | medium | long",
    "type": "e.g. Contrarian, Curiosity, Authority, Personal, Data"
  },
  "engagementFactors": [
    "specific factor 1 (e.g. personal vulnerability with concrete numbers)",
    "specific factor 2",
    "specific factor 3",
    "specific factor 4"
  ],
  "contentPattern": {
    "framework": "e.g. Problem-Agitate-Solve, Listicle, Narrative, Data-Story, Before-After-Bridge",
    "structure": "e.g. Hook -> Context -> 3 key insights -> CTA",
    "estimatedReadTime": "e.g. 45 seconds"
  },
  "improvements": [
    "specific actionable tip 1",
    "specific actionable tip 2",
    "specific actionable tip 3"
  ]
}`

  const raw = await callAi(system, userMsg, {
    json: true, temperature: 0.3, maxTokens: 900,
    userId, plan, cache: false,
  })

  const analysis = safeParseJson<AnalyzeCompetitorOutput>(raw)
  if (!analysis) {
    return err({ code: "AI_UNAVAILABLE", message: "Analysis returned invalid JSON" })
  }

  return ok(analysis)
}
