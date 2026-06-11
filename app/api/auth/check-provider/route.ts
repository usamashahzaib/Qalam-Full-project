import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/server/supabase-rest"

// Returns which sign-in method an email uses, without revealing account existence.
// Used by login page to auto-redirect OAuth-only accounts to the right provider.
export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get("email")?.trim().toLowerCase()
  if (!email) return NextResponse.json({ provider: null })

  try {
    const supabase = createServiceClient()
    const { data } = await supabase
      .from("users")
      .select("password_hash, external_user_id")
      .eq("email", email)
      .maybeSingle()

    if (!data) return NextResponse.json({ provider: null })
    if (!data.password_hash && data.external_user_id) return NextResponse.json({ provider: "linkedin" })
    if (data.password_hash) return NextResponse.json({ provider: "email" })
    return NextResponse.json({ provider: null })
  } catch {
    return NextResponse.json({ provider: null })
  }
}
