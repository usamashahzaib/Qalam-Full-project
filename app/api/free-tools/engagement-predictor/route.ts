import { NextRequest, NextResponse } from "next/server"
import { callAi } from "@/lib/server/ai-router"

export async function POST(req: NextRequest) {
  try {
    const { content } = await req.json()
    if (!String(content || "").trim()) return NextResponse.json({ error: "Content is required" }, { status: 400 })

    const result = await callAi(
      "Return strict JSON only.",
      `Predict LinkedIn engagement for this draft. Use content quality, audience fit, specificity, novelty, clarity, and likely discussion value. Do not use formulaic keyword checks.

POST:
${content}

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
      { json: true, temperature: 0.3, timeout: 10000 }
    )

    return NextResponse.json(JSON.parse(result))
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message || "Prediction failed" }, { status: 503 })
  }
}
