// Synchronous AI generation - cap route duration so a slow provider chain fails fast instead of
// hitting the platform kill. Requires Vercel fluid compute (default on) for values over 60s.
export const maxDuration = 120

import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/server/auth"
import { requirePlan } from "@/lib/server/require-plan"
import { callAi, safeParseJson } from "@/lib/server/ai-router-v2"
import { createServiceClient } from "@/lib/server/supabase-rest"
import { parseProfessionalContext } from "@/lib/professional-context"
import { authorizeRole } from "@/lib/server/roles"

type Characteristics = {
  tone: string
  sentenceLength: string
  vocabulary: string
  commonPhrases: string[]
  transitions: string[]
  ctaStyle: string
}

export async function POST(request: NextRequest) {
  return withAuth(async (req, user) => {
    const planCheck = await requirePlan(req, "Pro")
    if (!planCheck.ok) return planCheck.response
    const roleError = await authorizeRole(req, planCheck.workspaceId, "editor")
    if (roleError) return roleError

    let body: Record<string, unknown>
    try { body = await req.json() } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
    }

    const examplePosts = String(body.examplePosts || "").trim()
    if (examplePosts.length < 100) {
      return NextResponse.json({ error: "Paste at least 3-5 example posts (100+ characters)" }, { status: 400 })
    }

    const system = `You are a voice analysis expert for LinkedIn content. Return only valid JSON. No markdown.`
    const userMsg = `Analyze the writing voice from these LinkedIn post examples and extract characteristics.

POSTS:
${examplePosts.slice(0, 3000)}

Return JSON:
{
  "tone": "one adjective (e.g. Direct, Empathetic, Technical, Bold)",
  "sentenceLength": "short | medium | long",
  "vocabulary": "simple | moderate | advanced",
  "commonPhrases": ["phrase 1", "phrase 2", "phrase 3", "phrase 4", "phrase 5"],
  "transitions": ["transition 1", "transition 2", "transition 3"],
  "ctaStyle": "question | direct | soft"
}`

    let raw: string
    try {
      raw = await callAi("voice-profile", system, userMsg, {
        json: true, temperature: 0.3, maxTokens: 600,
        userId: user.id, plan: planCheck.plan, cache: false,
      })
    } catch {
      return NextResponse.json({ error: "Voice analysis failed. Please try again." }, { status: 503 })
    }

    const characteristics = safeParseJson<Characteristics>(raw)
    if (!characteristics) {
      return NextResponse.json({ error: "Voice analysis returned an unexpected response. Please try again." }, { status: 500 })
    }

    // Persist to voice_profiles so generation routes pick it up automatically
    if (user.workspaceId) {
      const supabase = createServiceClient()
      const { data: existing } = await supabase
        .from("voice_profiles")
        .select("id, characteristics")
        .eq("workspace_id", user.workspaceId)
        .limit(1)
        .maybeSingle()
      const savedProfessionalContext = parseProfessionalContext(
        (existing?.characteristics as { professionalContext?: unknown } | null)?.professionalContext
      )

      const profilePayload = {
        user_id: user.id,
        workspace_id: user.workspaceId,
        characteristics: {
          ...characteristics,
          ...(savedProfessionalContext ? { professionalContext: savedProfessionalContext } : {}),
        },
        brand_tone: characteristics.tone,
        example_posts: examplePosts.slice(0, 5000),
        updated_at: new Date().toISOString(),
      }

      if (existing?.id) {
        await supabase.from("voice_profiles").update(profilePayload).eq("id", existing.id)
      } else {
        await supabase.from("voice_profiles").insert(profilePayload)
      }
    }

    return NextResponse.json({ characteristics, saved: Boolean(user.workspaceId) })
  })(request)
}
