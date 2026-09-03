// Synchronous AI generation - cap route duration so a slow provider chain fails fast instead of
// hitting the platform kill. Requires Vercel fluid compute (default on) for values over 60s.
export const maxDuration = 60

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { callAi, safeParseJson } from "@/lib/server/ai-router-v2"
import { getClientIp, checkRateLimit, checkFreeToolsGlobalBudget } from "@/lib/server/rate-limit"
import { normalizeScoredFreeToolResult } from "@/lib/free-tool-scores"

const schema = z.object({
  headline: z.string().min(3).max(300),
})

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req)
    const rateLimit = await checkRateLimit("free-tools-headline", "free", ip)
    if (!rateLimit.allowed || !(await checkFreeToolsGlobalBudget())) {
      return NextResponse.json({ error: "Rate limit exceeded. Please try again later." }, { status: 429 })
    }

    const body = await req.json().catch(() => ({}))
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const result = await callAi("post-improvement",
      "Return strict JSON only.",
      `Analyze this LinkedIn profile headline as the hook for a profile visit. Score it for clarity, authority, differentiation, keyword strength, and buyer relevance.

HEADLINE:
${parsed.data.headline}

Every score must be an integer from 0 to 100.

OUTPUT JSON:
{
  "headline_score": 0,
  "verdict": "Strong / Solid / Needs work / Weak",
  "breakdown": {
    "clarity": 0,
    "authority": 0,
    "differentiation": 0,
    "keywords": 0,
    "buyer_relevance": 0
  },
  "specific_feedback": ["specific issue or strength"],
  "rewritten_headlines": ["option 1", "option 2", "option 3"]
}`,
      {
        json: true,
        temperature: 0.3,
        timeout: 25000,
        userId: `free_${ip}`,
        plan: "free",
        cache: true,
        cacheTtl: 3600,
      }
    )

    const aiJson = safeParseJson(result)
    const response = normalizeScoredFreeToolResult(aiJson, "headline_score", "breakdown")
    if (!response) return NextResponse.json({ error: "Invalid AI response" }, { status: 503 })
    return NextResponse.json(response)
  } catch (error) {
    console.error("[Free Tool Error]", error)
    return NextResponse.json(
      { error: (error as Error).message || "Headline analysis failed" },
      { status: 503 }
    )
  }
}
