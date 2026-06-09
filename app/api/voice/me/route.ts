import { NextResponse } from "next/server"
import { withAuth } from "@/lib/server/auth"
import { createServiceClient } from "@/lib/server/supabase-rest"
import type { NextRequest } from "next/server"

export async function GET(request: NextRequest) {
  return withAuth(async (_req, user) => {
    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from("voice_profiles")
      .select("name, title, industry, linkedin_url, brand_tone, goals, example_posts, characteristics, updated_at")
      .eq("user_id", user.id)
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: "Failed to load voice profile" }, { status: 500 })
    }

    return NextResponse.json({ profile: data || null })
  })(request)
}
