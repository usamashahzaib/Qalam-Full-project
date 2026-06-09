import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/server/auth"
import { createServiceClient } from "@/lib/server/supabase-rest"

const isProOrAbove = (plan: string) => {
  const p = plan.toLowerCase()
  return p === "pro" || p === "agency" || p.startsWith("agency")
}

export async function POST(request: NextRequest) {
  return withAuth(async (req, user) => {
    if (!isProOrAbove(user.plan)) {
      return NextResponse.json({ error: "Voice training requires Pro plan." }, { status: 403 })
    }

    let body: Record<string, unknown>
    try { body = await req.json() } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
    }

    const profile = {
      user_id: user.id,
      name: String(body.name || "").trim(),
      title: String(body.title || "").trim(),
      industry: String(body.industry || "").trim(),
      linkedin_url: String(body.linkedinUrl || "").trim(),
      brand_tone: String(body.brandTone || "").trim(),
      goals: String(body.goals || "").trim(),
      example_posts: body.examplePosts || null,
      characteristics: body.characteristics || null,
      updated_at: new Date().toISOString(),
    }

    const supabase = createServiceClient()
    const { error } = await supabase
      .from("voice_profiles")
      .upsert(profile, { onConflict: "user_id" })

    if (error) {
      console.error("voice_save_failed", error)
      return NextResponse.json({ error: "Failed to save voice profile" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  })(request)
}
