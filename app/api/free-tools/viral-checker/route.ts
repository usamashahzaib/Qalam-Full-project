// Synchronous AI generation - cap route duration so a slow provider chain fails fast instead of
// hitting the platform kill. Requires Vercel fluid compute (default on) for values over 60s.
export const maxDuration = 60

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { callAi, safeParseJson } from "@/lib/server/ai-router-v2"
import { getClientIp, checkRateLimit, checkFreeToolsGlobalBudget } from "@/lib/server/rate-limit"
import { normalizeScoredFreeToolResult } from "@/lib/free-tool-scores"

const schema = z.object({
  content: z.string().min(10).max(3000),
})

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req)
    const rateLimit = await checkRateLimit("free-tools-viral", "free", ip)
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

    const result = await callAi("engagement-prediction",
      "Return strict JSON only.",
      `Analyze this LinkedIn post for content quality. Be specific and critical. Do not predict reach or claim the post will go viral.

POST:
${parsed.data.content}

SCORE 0-100 on:
1. Hook strength
2. Clarity
3. Specificity
4. Usefulness
5. Discussion potential

Every score must be an integer from 0 to 100.

OUTPUT JSON:
{
  "content_quality_score": 0,
  "breakdown": { "hook": 0, "clarity": 0, "specificity": 0, "usefulness": 0, "discussion": 0 },
  "verdict": "Ready / Strong with edits / Needs focus / Rewrite",
  "specific_feedback": "exactly what to fix",
  "improved_version": "rewritten hook if weak"
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
    const response = normalizeScoredFreeToolResult(aiJson, "content_quality_score", "breakdown")
    if (!response) return NextResponse.json({ error: "Invalid AI response" }, { status: 503 })
    return NextResponse.json(response)
  } catch (error) {
    console.error("[Free Tool Error]", error)
    return NextResponse.json(
      { error: (error as Error).message || "Analysis failed" },
      { status: 503 }
    )
  }
}
