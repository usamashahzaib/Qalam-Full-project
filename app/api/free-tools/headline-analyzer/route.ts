import { NextRequest, NextResponse } from "next/server"
import { callAi } from "@/lib/server/ai-router"

export async function POST(req: NextRequest) {
  try {
    const { headline } = await req.json()
    if (!String(headline || "").trim()) return NextResponse.json({ error: "Headline is required" }, { status: 400 })

    const result = await callAi(
      "Return strict JSON only.",
      `Analyze this LinkedIn profile headline as the hook for a profile visit. Score it for clarity, authority, differentiation, keyword strength, and buyer relevance.

HEADLINE:
${headline}

OUTPUT JSON:
{
  "headline_score": number,
  "verdict": "Strong / Solid / Needs work / Weak",
  "breakdown": {
    "clarity": number,
    "authority": number,
    "differentiation": number,
    "keywords": number,
    "buyer_relevance": number
  },
  "specific_feedback": ["specific issue or strength"],
  "rewritten_headlines": ["option 1", "option 2", "option 3"]
}`,
      { json: true, temperature: 0.3, timeout: 10000 }
    )

    return NextResponse.json(JSON.parse(result))
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message || "Headline analysis failed" }, { status: 503 })
  }
}
