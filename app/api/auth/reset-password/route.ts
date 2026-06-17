import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/server/supabase-rest"
import { hashPassword, hashToken } from "@/lib/server/password"

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 })
  }

  const token = String(body.token ?? "").trim()
  const password = String(body.password ?? "")

  if (!token) {
    return NextResponse.json({ error: "Reset token is missing." }, { status: 400 })
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 })
  }

  const tokenHash = hashToken(token)
  const supabase = createServiceClient()
  const now = new Date().toISOString()

  // 1. Verify token is valid without consuming it yet
  const { data: record, error: tokenErr } = await supabase
    .from("password_resets")
    .select("id, user_id")
    .eq("token_hash", tokenHash)
    .eq("used", false)
    .gt("expires_at", now)
    .maybeSingle()

  if (tokenErr || !record) {
    return NextResponse.json({ error: "Invalid or expired reset link." }, { status: 400 })
  }

  // 2. Update password first
  const { error: updateErr } = await supabase
    .from("users")
    .update({ password_hash: hashPassword(password), updated_at: new Date().toISOString() })
    .eq("id", record.user_id)

  if (updateErr) {
    return NextResponse.json({ error: "Could not update password." }, { status: 500 })
  }

  // 3. Only mark token used after password was successfully changed
  await supabase
    .from("password_resets")
    .update({ used: true })
    .eq("id", record.id)

  return NextResponse.json({ success: true, message: "Password updated. You can now sign in." })
}
