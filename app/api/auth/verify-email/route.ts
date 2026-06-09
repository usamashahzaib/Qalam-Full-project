import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/server/supabase-rest"
import { hashToken } from "@/lib/server/password"

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token")?.trim()
  const origin = req.nextUrl.origin

  if (!token) {
    return NextResponse.redirect(new URL("/login?error=invalid_token", origin))
  }

  const tokenHash = hashToken(token)
  const supabase = createServiceClient()

  const { data: record } = await supabase
    .from("email_verifications")
    .select("id, user_id, expires_at, used")
    .eq("token_hash", tokenHash)
    .maybeSingle()

  if (!record || record.used || new Date(record.expires_at) < new Date()) {
    return NextResponse.redirect(new URL("/login?error=invalid_token", origin))
  }

  await supabase
    .from("users")
    .update({ email_verified: true, updated_at: new Date().toISOString() })
    .eq("id", record.user_id)

  await supabase.from("email_verifications").update({ used: true }).eq("id", record.id)

  return NextResponse.redirect(new URL("/login?verified=1", origin))
}
