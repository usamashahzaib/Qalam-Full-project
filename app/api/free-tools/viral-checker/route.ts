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

    const aiJson = safeParseJson(result)
    if (!aiJson) return NextResponse.json({ error: "Invalid AI response" }, { status: 503 })
    return NextResponse.json(aiJson)
  } catch (error) {
    console.error("[Free Tool Error]", error)
    return NextResponse.json(
      { error: (error as Error).message || "Analysis failed" },
      { status: 503 }
    )
  }
}
