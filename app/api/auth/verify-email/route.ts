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
  const now = new Date().toISOString()

  const { data: record } = await supabase
    .from("email_verifications")
    .update({ used: true })
    .eq("token_hash", tokenHash)
    .eq("used", false)
    .gt("expires_at", now)
    .select("id, user_id")
    .maybeSingle()

  if (!record) {
    return NextResponse.redirect(new URL("/login?error=invalid_token", origin))
  }

  const { error } = await supabase
    .from("users")
    .update({ email_verified: true, updated_at: new Date().toISOString() })
    .eq("id", record.user_id)

  if (error) return NextResponse.redirect(new URL("/login?error=server_error", origin))

  return NextResponse.redirect(new URL("/login?verified=1", origin))
}
