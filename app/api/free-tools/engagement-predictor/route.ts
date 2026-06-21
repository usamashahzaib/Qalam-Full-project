import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { callAi, safeParseJson } from "@/lib/server/ai-router-v2"
import { getClientIp, checkRateLimit } from "@/lib/server/rate-limit"

const schema = z.object({
  content: z.string().min(10).max(3000),
})

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req)
    const rateLimit = await checkRateLimit("free-tools-engagement", "free", ip)
    if (!rateLimit.allowed) {
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
      "Return strict JSON only. Be realistic - most LinkedIn posts get 10-50 reactions.",
      `Predict LinkedIn engagement for this draft. Use content quality, audience fit, specificity, novelty, clarity, and likely discussion value. Do not use formulaic keyword checks.

POST:
${parsed.data.content}

OUTPUT JSON:
{
  "engagement_score": number,
  "reach_prediction": "low / moderate / strong / breakout",
  "confidence": "low / medium / high",
  "score_breakdown": {
    "hook": number,
    "clarity": number,
    "specificity": number,
    "audience_relevance": number,
    "discussion_potential": number
  },
  "why_it_will_work": ["specific reason"],
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
