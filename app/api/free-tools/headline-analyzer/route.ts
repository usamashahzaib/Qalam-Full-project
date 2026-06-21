import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { callAi, safeParseJson } from "@/lib/server/ai-router-v2"
import { getClientIp, checkRateLimit } from "@/lib/server/rate-limit"

const schema = z.object({
  headline: z.string().min(3).max(300),
})

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req)
    const rateLimit = await checkRateLimit("free-tools-headline", "free", ip)
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

    const result = await callAi("post-improvement",
      "Return strict JSON only.",
      `Analyze this LinkedIn profile headline as the hook for a profile visit. Score it for clarity, authority, differentiation, keyword strength, and buyer relevance.

HEADLINE:
${parsed.data.headline}

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
      { error: (error as Error).message || "Headline analysis failed" },
      { status: 503 }
    )
  }
}
