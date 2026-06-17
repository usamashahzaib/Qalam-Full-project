import { NextRequest, NextResponse } from "next/server"
import { requireAuthApi } from "@/lib/server/auth"
import { createServiceClient } from "@/lib/server/supabase-rest"

export async function DELETE(req: NextRequest) {
  const { userId, externalUserId, error } = await requireAuthApi(req)
  if (error) return error

  const supabase = createServiceClient()
  const userIds = Array.from(new Set([userId, externalUserId].filter(Boolean))) as string[]

  // Delete associated data (best effort, CASCADE handles some)
  await Promise.allSettled([
    supabase.from("plan_usage").delete().in("user_id", userIds),
    supabase.from("posts").delete().in("user_id", userIds),
    supabase.from("memberships").delete().in("user_id", userIds),
    supabase.from("workspace_members").delete().in("user_id", userIds),
    supabase.from("password_resets").delete().in("user_id", userIds),
    supabase.from("email_verifications").delete().in("user_id", userIds),
  ])

  const { error: deleteErr } = await supabase
    .from("users")
    .delete()
    .eq("id", userId!)

  if (deleteErr) {
    console.error("[delete-account] error:", deleteErr)
    return NextResponse.json({ error: "Failed to delete account." }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
