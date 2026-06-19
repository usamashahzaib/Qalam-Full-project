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
    const rateLimit = await checkRateLimit("free-tools-carousel", "free", ip)
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

    const result = await callAi("carousel-outline",
      "Return strict JSON only.",
      `Turn this LinkedIn post or outline into a 5-7 slide carousel. Avoid filler. Each slide should carry one clear idea.

SOURCE:
${parsed.data.content}

OUTPUT JSON:
{
  "slides": [
    { "type": "cover", "title": "max 8 words", "body": "" },
    { "type": "content", "title": "max 8 words", "body": "max 28 words" },
    { "type": "cta", "title": "max 8 words", "body": "max 20 words" }
  ]
}`,
      {
        json: true,
        temperature: 0.5,
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
      { error: (error as Error).message || "Carousel build failed" },
      { status: 503 }
    )
  }
}
