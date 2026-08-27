import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/server/supabase-rest"
import { hashToken } from "@/lib/server/password"
import { safeRedirectPath } from "@/lib/validation"

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token")?.trim()
  const origin = req.nextUrl.origin
  const callbackUrl = safeRedirectPath(req.nextUrl.searchParams.get("callbackUrl"))

  if (!token) {
    return NextResponse.redirect(new URL("/login?error=invalid_token", origin))
  }

  const tokenHash = hashToken(token)
  const supabase = createServiceClient()
  const now = new Date().toISOString()

  // Read without consuming first so the token survives a failed user update.
  const { data: record } = await supabase
    .from("email_verifications")
    .select("id, user_id")
    .eq("token_hash", tokenHash)
    .eq("used", false)
    .gt("expires_at", now)
    .maybeSingle()

  if (!record) {
    return NextResponse.redirect(new URL("/login?error=invalid_token", origin))
  }

  // Update the user FIRST - if this fails the token is still valid and the
  // user can click the link again.
  const { error } = await supabase
    .from("users")
    .update({ email_verified: true, updated_at: new Date().toISOString() })
    .eq("id", record.user_id)

  if (error) return NextResponse.redirect(new URL("/login?error=server_error", origin))

  // Mark token used only after the user row is confirmed updated.
  await supabase
    .from("email_verifications")
    .update({ used: true })
    .eq("id", record.id)

  const loginUrl = new URL("/login", origin)
  loginUrl.searchParams.set("verified", "1")
  loginUrl.searchParams.set("callbackUrl", callbackUrl)
  return NextResponse.redirect(loginUrl)
}
