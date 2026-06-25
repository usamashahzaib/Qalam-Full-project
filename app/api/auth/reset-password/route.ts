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

  // Atomically mark token used — the conditional .eq("used", false) means only one
  // concurrent request wins; the loser gets null back and returns 400.
  const { data: record } = await supabase
    .from("password_resets")
    .update({ used: true })
    .eq("token_hash", tokenHash)
    .eq("used", false)
    .gt("expires_at", now)
    .select("id, user_id")
    .maybeSingle()

  if (!record) {
    return NextResponse.json({ error: "Invalid or expired reset link." }, { status: 400 })
  }

  const { error: updateErr } = await supabase
    .from("users")
    .update({ password_hash: hashPassword(password), updated_at: new Date().toISOString() })
    .eq("id", record.user_id)

  if (updateErr) {
    return NextResponse.json({ error: "Could not update password." }, { status: 500 })
  }

  // Invalidate all active sessions by bumping password_version.
  // Any JWT issued before this reset will fail the version check in requireAuthApi.
  try {
    const { data: current } = await supabase
      .from("users")
      .select("password_version")
      .eq("id", record.user_id)
      .maybeSingle()
    const currentVersion = (current as { password_version?: number } | null)?.password_version ?? 0
    await supabase
      .from("users")
      .update({ password_version: currentVersion + 1 })
      .eq("id", record.user_id)
  } catch { /* column not yet migrated — silently skip */ }

  return NextResponse.json({ success: true, message: "Password updated. You can now sign in." })
}
