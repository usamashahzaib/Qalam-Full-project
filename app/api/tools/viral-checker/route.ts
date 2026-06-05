import { NextResponse } from "next/server"
import { callAi } from "@/lib/server/ai-router"

const fallback = {
  engagementScore: 50,
  viralProbability: 30,
  estimatedReach: "100-500",
  strengths: ["Content is readable"],
  weaknesses: ["Analysis failed"],
  improvements: ["Try again with more specific content"],
}

export async function POST(request: Request) {
  let content = ""
  try {
    const body = await request.json()
    content = String(body?.content || "").trim()
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  if (!content) return NextResponse.json({ error: "Content is required" }, { status: 400 })

  const systemPrompt = `You are a LinkedIn engagement analyst. Analyze this post and predict its engagement potential.

Return JSON:
{
  "engagementScore": number (0-100),
  "viralProbability": number (0-100),
  "estimatedReach": "range like 500-1000",
  "strengths": ["string"],
  "weaknesses": ["string"],
  "improvements": ["string"]
}`

  try {
    return NextResponse.json(JSON.parse(await callAi(systemPrompt, content, { json: true, timeout: 10000 })))
  } catch {
    return NextResponse.json(fallback)
  }
}
