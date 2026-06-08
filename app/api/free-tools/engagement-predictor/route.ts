import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { callAi } from "@/lib/server/ai-router-v2"

const schema = z.object({
  content: z.string().min(10).max(3000),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"

    const result = await callAi(
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

    return NextResponse.json(JSON.parse(result))
  } catch (error) {
    console.error("[Free Tool Error]", error)
    return NextResponse.json(
      { error: (error as Error).message || "Prediction failed" },
      { status: 503 }
    )
  }
}
