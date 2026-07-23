import { NextRequest, NextResponse } from "next/server"
import { requireRole, errorToStatus } from "@/lib/server/roles"
import { supabaseSelect } from "@/lib/server/supabase-rest"

type Params = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { id: workspaceId } = await params
    // Any member of the workspace can see who else is on the team.
    await requireRole(request, workspaceId, "viewer")

    const memberships = await supabaseSelect<{ user_id: string; role: string; created_at: string }>(
      "workspace_members",
      `workspace_id=eq.${encodeURIComponent(workspaceId)}&select=user_id,role,created_at&order=created_at.asc`
    )

    const userIds = [...new Set((memberships || []).map((m) => m.user_id))]
    let users: { id: string; email: string; full_name: string | null }[] = []
    if (userIds.length) {
      users = (await supabaseSelect<{ id: string; email: string; full_name: string | null }>(
        "users",
        `id=in.(${userIds.map(encodeURIComponent).join(",")})&select=id,email,full_name`
      )) || []
    }
    const userById = new Map(users.map((u) => [u.id, u]))

    const members = (memberships || []).map((m) => ({
      userId: m.user_id,
      role: m.role,
      joinedAt: m.created_at,
      email: userById.get(m.user_id)?.email ?? null,
      fullName: userById.get(m.user_id)?.full_name ?? null,
    }))

    // Invites for people who don't have a Qalam account yet - they're stored
    // separately and redeemed automatically at signup, so surface them here
    // too or they're otherwise invisible until the invitee actually joins.
    const pendingInvites = (
      (await supabaseSelect<{ email: string; role: string; created_at: string; expires_at: string }>(
        "workspace_invites",
        `workspace_id=eq.${encodeURIComponent(workspaceId)}&select=email,role,created_at,expires_at&order=created_at.desc`
      ).catch(() => [])) || []
    ).map((invite) => ({
      email: invite.email,
      role: invite.role,
      invitedAt: invite.created_at,
      expiresAt: invite.expires_at,
      expired: new Date(invite.expires_at).getTime() < Date.now(),
    }))

    return NextResponse.json({ members, pendingInvites })
  } catch (error) {
    const msg = (error as Error).message
    return NextResponse.json({ error: msg }, { status: errorToStatus(msg) })
  }
}
