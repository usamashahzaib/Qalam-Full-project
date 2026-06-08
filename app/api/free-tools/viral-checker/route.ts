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
      "Return strict JSON only.",
      `Analyze this LinkedIn post for viral potential. Be specific and critical.

POST:
${parsed.data.content}

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
      { error: (error as Error).message || "Analysis failed" },
      { status: 503 }
    )
  }
}
