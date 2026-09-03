// Synchronous AI generation - cap route duration so a slow provider chain fails fast instead of
// hitting the platform kill. Requires Vercel fluid compute (default on) for values over 60s.
export const maxDuration = 60

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { callAi, safeParseJson } from "@/lib/server/ai-router-v2"
import { getClientIp, checkRateLimit, checkFreeToolsGlobalBudget } from "@/lib/server/rate-limit"
import { toHundredPointScore } from "@/lib/free-tool-scores"

const schema = z.object({
  about: z.string().min(10).max(3000),
  headline: z.string().max(300).optional().default(""),
  audience: z.string().max(300).optional().default(""),
})

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req)
    const rateLimit = await checkRateLimit("free-tools-profile", "free", ip)
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

    const result = await callAi("voice-profile",
      "Return strict JSON only.",
      `Rewrite and optimize this LinkedIn About section. Preserve truth. Never invent credentials, employers, metrics, or experiences. Improve positioning, clarity, credibility, search relevance, and conversion. Align the headline and About section to one target audience and one defensible professional identity. Do not promise reach or claim access to LinkedIn's private ranking systems.

HEADLINE:
${parsed.data.headline}

TARGET AUDIENCE:
${parsed.data.audience}

ABOUT SECTION:
${parsed.data.about}

OUTPUT JSON:
Use profile_score as an integer from 0 to 100.
{
  "profile_score": 0,
  "positioning_diagnosis": "specific diagnosis",
  "optimized_about": "rewritten LinkedIn About section",
  "headline_suggestion": "stronger headline",
  "top_fixes": ["specific fix"],
  "keyword_suggestions": ["keyword"]
}`,
      {
        json: true,
        temperature: 0.4,
        timeout: 25000,
        userId: `free_${ip}`,
        plan: "free",
        cache: true,
        cacheTtl: 3600,
      }
    )

    const aiJson = safeParseJson(result)
    if (!aiJson || typeof aiJson !== "object") {
      return NextResponse.json({ error: "Invalid AI response" }, { status: 503 })
    }
    const data = aiJson as Record<string, unknown>
    data.profile_score = toHundredPointScore(data.profile_score)
    return NextResponse.json(data)
  } catch (error) {
    console.error("[Free Tool Error]", error)
    return NextResponse.json(
      { error: (error as Error).message || "Profile optimization failed" },
      { status: 503 }
    )
  }
}
