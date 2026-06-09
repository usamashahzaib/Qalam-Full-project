import { NextRequest, NextResponse } from "next/server"
import { requireAuthApi } from "@/lib/server/auth"
import { createServiceClient } from "@/lib/server/supabase-rest"

export async function DELETE(req: NextRequest) {
  const { userId, error } = await requireAuthApi(req)
  if (error) return error

  const supabase = createServiceClient()

  // Delete associated data (best effort, CASCADE handles some)
  await Promise.allSettled([
    supabase.from("plan_usage").delete().eq("user_id", userId!),
    supabase.from("posts").delete().eq("user_id", userId!),
    supabase.from("memberships").delete().eq("user_id", userId!),
    supabase.from("password_resets").delete().eq("user_id", userId!),
    supabase.from("email_verifications").delete().eq("user_id", userId!),
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
