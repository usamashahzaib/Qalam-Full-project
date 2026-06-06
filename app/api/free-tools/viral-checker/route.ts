import { NextRequest, NextResponse } from "next/server"
import { callAi } from "@/lib/server/ai-router"

export async function POST(req: NextRequest) {
  try {
    const { content } = await req.json()
    if (!String(content || "").trim()) return NextResponse.json({ error: "Content is required" }, { status: 400 })

    const result = await callAi(
      "Return strict JSON only.",
      `Analyze this LinkedIn post for viral potential. Be specific and critical.

POST:
${content}

SCORE 0-100 on:
1. Hook strength
2. Emotional trigger
3. Shareability
4. Comment bait
5. Timing relevance

OUTPUT JSON:
{
  "viral_score": number,
  "breakdown": { "hook": number, "emotion": number, "share": number, "comment": number, "timing": number },
  "verdict": "Will go viral / Good reach / Average / Poor",
  "specific_feedback": "exactly what to fix",
  "improved_version": "rewritten hook if weak"
}`,
      { json: true, temperature: 0.3, timeout: 10000 }
    )

    return NextResponse.json(JSON.parse(result))
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message || "Analysis failed" }, { status: 503 })
  }
}
