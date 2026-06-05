import { auth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import { callAi } from "@/lib/server/ai-router"
import { buildRoleAwareSystemPrompt } from "@/lib/prompts/role-aware-system"

export async function POST(request: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "auth_required" }, { status: 401 })

  const body = await request.json()
  const topic = String(body.topic || body.content || "").trim()
  const role = body.role || "ceo-founder"

  if (!topic) {
    return NextResponse.json({ error: "topic_required" }, { status: 400 })
  }

  const systemPrompt = `${buildRoleAwareSystemPrompt(role)}

Your ONLY job is to generate 5 opening hooks (first 1-2 sentences) for a LinkedIn post about the given topic.

RULES FOR HOOKS:
1. Each hook must be under 25 words.
2. Use specific numbers, surprising claims, or direct questions.
3. Never start with "In today's world..." or "As we navigate..."
4. Each hook should feel like it was written by a real person, not AI.
5. Hooks should be contrarian, vulnerable, or data-driven.

Return ONLY a JSON array of 5 hooks. Each hook is a string.`

  const userPrompt = `Generate 5 hooks for a LinkedIn post about: ${topic}`

  try {
    const result = await callAi(systemPrompt, userPrompt, { json: true, temperature: 0.9, timeout: 15000 })

    try {
      const parsed = JSON.parse(result)
      const hooks = Array.isArray(parsed)
        ? parsed.map((hook) => String(hook).trim()).filter(Boolean)
        : Array.isArray(parsed.hooks)
          ? parsed.hooks.map((hook: unknown) => String(hook).trim()).filter(Boolean)
          : []
      if (hooks.length) {
        return NextResponse.json({ hooks: hooks.slice(0, 5) })
      }
    } catch {
      // fall through to line extraction
    }

    const lines = result
      .split("\n")
      .map((line) => line.replace(/^\d+[\).\s-]+/, "").replace(/^["']|["']$/g, "").trim())
      .filter((line) => line && !line.includes("[") && !line.includes("]"))

    return NextResponse.json({ hooks: lines.slice(0, 5) })
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message || "hook_generation_failed" }, { status: 502 })
  }
}
