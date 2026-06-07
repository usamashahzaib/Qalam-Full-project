import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { requireAuth } from "@/lib/server/auth-helpers"
import { createServiceClient } from "@/lib/server/supabase-rest"

const corsHeaders = {
  "Access-Control-Allow-Origin": process.env.FRONTEND_ORIGIN || "*",
  "Access-Control-Allow-Methods": "GET,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
}

type LinkedInMe = {
  id?: string
  localizedFirstName?: string
  localizedLastName?: string
  vanityName?: string
  profilePicture?: { displayImage?: string }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders })
}

export async function GET(_request: NextRequest) {
  try {
    const userId = await requireAuth()
    const session = await auth()
    const email = session?.user?.email || ""
    const supabase = createServiceClient()

    const { data: user } = await supabase.from("users").select("email").eq("id", userId).single()
    const ownerEmail = String(user?.email || email).trim().toLowerCase()

    const { data: account } = await supabase
      .from("publishing_accounts")
      .select("access_token, expires_at, provider_account_id")
      .eq("provider", "linkedin")
      .or(`user_id.eq.${userId},owner_email.eq.${ownerEmail}`)
      .maybeSingle()

    let accessToken = account?.access_token || ""
    if (!accessToken && ownerEmail) {
      const { data: legacy } = await supabase
        .from("linkedin_credentials")
        .select("access_token, token_expires_at, member_id")
        .eq("owner_email", ownerEmail)
        .maybeSingle()
      accessToken = legacy?.access_token || ""
    }

    if (!accessToken) return NextResponse.json({ connected: false, error: "LinkedIn token not found" }, { status: 404, headers: corsHeaders })

    const res = await fetch("https://api.linkedin.com/v2/me", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "LinkedIn-Version": process.env.LINKEDIN_VERSION || "202602",
      },
      cache: "no-store",
    })

    if (res.status === 401) return NextResponse.json({ error: "LinkedIn token expired" }, { status: 401, headers: corsHeaders })
    if (!res.ok) return NextResponse.json({ error: "LinkedIn profile fetch failed" }, { status: 502, headers: corsHeaders })

    const profile = (await res.json()) as LinkedInMe
    return NextResponse.json(
      {
        id: profile.id || account?.provider_account_id || null,
        firstName: profile.localizedFirstName || "",
        lastName: profile.localizedLastName || "",
        headline: "",
        profilePicture: profile.profilePicture?.displayImage || null,
        vanityName: profile.vanityName || null,
      },
      { headers: corsHeaders }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : "profile_failed"
    return NextResponse.json({ error: message }, { status: message === "Unauthorized" ? 401 : 500, headers: corsHeaders })
  }
}
