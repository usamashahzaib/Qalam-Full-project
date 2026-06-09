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

  const { data: record } = await supabase
    .from("password_resets")
    .select("id, user_id, expires_at, used")
    .eq("token_hash", tokenHash)
    .maybeSingle()

  if (!record) {
    return NextResponse.json({ error: "Invalid or expired reset link." }, { status: 400 })
  }
  if (record.used) {
    return NextResponse.json({ error: "This reset link has already been used." }, { status: 400 })
  }
  if (new Date(record.expires_at) < new Date()) {
    return NextResponse.json({ error: "This reset link has expired. Request a new one." }, { status: 400 })
  }

  await supabase
    .from("users")
    .update({ password_hash: hashPassword(password), updated_at: new Date().toISOString() })
    .eq("id", record.user_id)

  await supabase.from("password_resets").update({ used: true }).eq("id", record.id)

  return NextResponse.json({ success: true, message: "Password updated. You can now sign in." })
}
