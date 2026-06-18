import { NextRequest, NextResponse } from "next/server"
import { requireAuthApi } from "@/lib/server/auth"
import { createServiceClient } from "@/lib/server/supabase-rest"

export async function DELETE(req: NextRequest) {
  const { userId, externalUserId, error } = await requireAuthApi(req)
  if (error) return error

  const supabase = createServiceClient()
  const userIds = Array.from(new Set([userId, externalUserId].filter(Boolean))) as string[]

  // Get workspace IDs owned by this user for workspace-keyed table cleanup
  const { data: workspaceRows } = await supabase
    .from("workspaces")
    .select("id")
    .in("owner_id", userIds)
  const workspaceIds = (workspaceRows || []).map((r: { id: string }) => r.id)

  // Delete all user-associated data (best effort; DB CASCADE handles children of deleted rows)
  const userDeleteOps = [
    supabase.from("linkedin_credentials").delete().in("user_id", userIds),
    supabase.from("competitor_analyses").delete().in("user_id", userIds),
    supabase.from("ai_usage").delete().in("user_id", userIds),
    supabase.from("plan_usage").delete().in("user_id", userIds),
    supabase.from("password_resets").delete().in("user_id", userIds),
    supabase.from("email_verifications").delete().in("user_id", userIds),
    supabase.from("workspace_members").delete().in("user_id", userIds),
  ]

  const workspaceDeleteOps = workspaceIds.length > 0 ? [
    supabase.from("publishing_accounts").delete().in("workspace_id", workspaceIds),
    supabase.from("voice_profiles").delete().in("workspace_id", workspaceIds),
    supabase.from("approvals").delete().in("workspace_id", workspaceIds),
    supabase.from("posts").delete().in("workspace_id", workspaceIds),
  ] : []

  await Promise.allSettled([...userDeleteOps, ...workspaceDeleteOps])

  // Delete workspaces after their children are cleaned up
  if (workspaceIds.length > 0) {
    await supabase.from("workspaces").delete().in("id", workspaceIds)
  }

  const { error: deleteErr } = await supabase
    .from("users")
    .delete()
    .eq("id", userId!)

  if (deleteErr) {
    console.error("[delete-account] error:", deleteErr)
    return NextResponse.json({ error: "Failed to delete account." }, { status: 500 })
  }

  // BUG #19: Clear session cookie so the deleted user's JWT cannot be reused
  const response = NextResponse.json({ success: true })
  const cookieNames = ["next-auth.session-token", "__Secure-next-auth.session-token"]
  for (const name of cookieNames) {
    response.cookies.set(name, "", { expires: new Date(0), path: "/" })
  }
  return response
}
