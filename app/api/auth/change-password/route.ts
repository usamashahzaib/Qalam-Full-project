import { NextRequest, NextResponse } from "next/server"
import { requireAuthApi } from "@/lib/server/auth"
import { createServiceClient } from "@/lib/server/supabase-rest"
import { verifyPassword, hashPassword } from "@/lib/server/password"
import { log } from "@/lib/server/logging"

export async function POST(req: NextRequest) {
  const { userId, error } = await requireAuthApi(req)
  if (error) return error

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 })
  }

  const currentPassword = String(body.currentPassword ?? "")
  const newPassword = String(body.newPassword ?? "")

  if (!currentPassword) {
    return NextResponse.json({ error: "Current password is required." }, { status: 400 })
  }
  if (newPassword.length < 8) {
    return NextResponse.json({ error: "New password must be at least 8 characters." }, { status: 400 })
  }

  const supabase = createServiceClient()
  const { data: user } = await supabase
    .from("users")
    .select("id, password_hash, auth_provider")
    .eq("id", userId!)
    .maybeSingle()

  if (!user) {
    return NextResponse.json({ error: "User not found." }, { status: 404 })
  }
  if (user.auth_provider !== "email") {
    return NextResponse.json(
      { error: "Password change is only available for email/password accounts." },
      { status: 400 }
    )
  }
  if (!user.password_hash) {
    return NextResponse.json({ error: "No password set on this account." }, { status: 400 })
  }

  const valid = verifyPassword(currentPassword, user.password_hash)
  if (!valid) {
    return NextResponse.json({ error: "Current password is incorrect." }, { status: 400 })
  }

  const newHash = hashPassword(newPassword)
  const { error: updateErr } = await supabase
    .from("users")
    .update({ password_hash: newHash, updated_at: new Date().toISOString() })
    .eq("id", userId!)

  if (updateErr) {
    log.error("change-password.update_failed", { userId: userId!, error: updateErr.message })
    return NextResponse.json({ error: "Failed to update password." }, { status: 500 })
  }

  // Increment password_version to invalidate all existing sessions.
  // Requires: ALTER TABLE users ADD COLUMN password_version INTEGER DEFAULT 0 NOT NULL
  try {
    const { data: current } = await supabase
      .from("users")
      .select("password_version")
      .eq("id", userId!)
      .maybeSingle()
    const currentVersion = (current as { password_version?: number } | null)?.password_version ?? 0
    await supabase
      .from("users")
      .update({ password_version: currentVersion + 1 })
      .eq("id", userId!)
  } catch { /* password_version column not yet migrated */ }

  return NextResponse.json({ success: true, message: "Password updated successfully." })
}
