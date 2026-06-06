import { NextRequest, NextResponse } from "next/server"
import { callAi } from "@/lib/server/ai-router"

export async function POST(req: NextRequest) {
  try {
    const { content } = await req.json()
    if (!String(content || "").trim()) return NextResponse.json({ error: "Content is required" }, { status: 400 })

    const result = await callAi(
      "Return strict JSON only.",
      `Turn this LinkedIn post or outline into a 5-7 slide carousel. Avoid filler. Each slide should carry one clear idea.

SOURCE:
${content}

OUTPUT JSON:
{
  "slides": [
    { "type": "cover", "title": "max 8 words", "body": "" },
    { "type": "content", "title": "max 8 words", "body": "max 28 words" },
    { "type": "cta", "title": "max 8 words", "body": "max 20 words" }
  ]
}`,
      { json: true, temperature: 0.5, timeout: 12000 }
    )

    return NextResponse.json(JSON.parse(result))
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message || "Carousel build failed" }, { status: 503 })
  }
}
