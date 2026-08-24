// Synchronous AI generation - cap route duration so a slow provider chain fails fast instead of
// hitting the platform kill. Requires Vercel fluid compute (default on) for values over 60s.
export const maxDuration = 60

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { callAi, safeParseJson } from "@/lib/server/ai-router-v2"
import { getClientIp, checkRateLimit, checkFreeToolsGlobalBudget } from "@/lib/server/rate-limit"

const schema = z.object({
  content: z.string().min(10).max(3000),
})

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req)
    const rateLimit = await checkRateLimit("free-tools-engagement", "free", ip)
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
      "Return strict JSON only. Do not predict impressions, reactions, or reach.",
      `Review this LinkedIn draft for pre-publish readiness. Use content quality, audience fit, specificity, novelty, clarity, and discussion value. Do not use formulaic keyword checks.

POST:
${parsed.data.content}

OUTPUT JSON:
{
  "content_readiness_score": number,
  "assessment": "ready / strong with edits / needs focus / rewrite",
  "score_breakdown": {
    "hook": number,
    "clarity": number,
    "specificity": number,
    "audience_relevance": number,
    "discussion_potential": number
  },
  "strengths": ["specific strength"],
  "risks": ["specific risk"],
  "recommended_edits": ["specific edit"],
  "stronger_opening": "rewrite the first 1-2 lines"
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
    if (!aiJson) return NextResponse.json({ error: "Invalid AI response" }, { status: 503 })
    return NextResponse.json(aiJson)
  } catch (error) {
    console.error("[Free Tool Error]", error)
    return NextResponse.json(
      { error: (error as Error).message || "Prediction failed" },
      { status: 503 }
    )
  }
}
