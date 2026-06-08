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

    return NextResponse.json(JSON.parse(result))
  } catch (error) {
    console.error("[Free Tool Error]", error)
    return NextResponse.json(
      { error: (error as Error).message || "Carousel build failed" },
      { status: 503 }
    )
  }
}
