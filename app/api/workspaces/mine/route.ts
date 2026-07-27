import { NextResponse } from "next/server"
import { getWorkspaceSessionContext } from "@/lib/server/workspace"
import { supabaseSelect } from "@/lib/server/supabase-rest"

/**
 * Lists every workspace the current user belongs to, regardless of their own
 * plan tier. Unlike /api/agency/clients (which requires the caller to be on
 * the Agency plan and only lists workspaces they created), this covers
 * invited members too - an editor or client_reviewer added to a client
 * workspace has no Agency plan of their own but still needs to see and
 * switch into the workspace they were invited to.
 */
export async function GET() {
  try {
    const ctx = await getWorkspaceSessionContext()

    const memberships = await supabaseSelect<{ workspace_id: string; role: string }>(
      "workspace_members",
      `user_id=eq.${encodeURIComponent(ctx.supabaseUserId)}&select=workspace_id,role`
    )
    const workspaceIds = [...new Set((memberships || []).map((m) => m.workspace_id).filter(Boolean))]
    if (!workspaceIds.length) return NextResponse.json({ workspaces: [] })

    // branding_color falls back gracefully if migration 0057 hasn't run yet in
    // this environment - the workspace switcher must not break because of it.
    const workspaces = await supabaseSelect<{ id: string; name: string; owner_id: string | null; branding_color: string | null }>(
      "workspaces",
      `id=in.(${workspaceIds.join(",")})&select=id,name,owner_id,branding_color`
    ).catch(async () =>
      (await supabaseSelect<{ id: string; name: string; owner_id: string | null }>(
        "workspaces",
        `id=in.(${workspaceIds.join(",")})&select=id,name,owner_id`
      )).map((ws) => ({ ...ws, branding_color: null }))
    )

    const roleByWorkspace = new Map((memberships || []).map((m) => [m.workspace_id, m.role]))
    const list = (workspaces || []).map((ws) => {
      const role = roleByWorkspace.get(ws.id) ?? "viewer"
      return {
        id: ws.id,
        name: ws.name,
        role,
        // Heuristic: the workspace created for a user at signup is always
        // "owner" role for them. Client workspaces created via Agency Hub
        // are "admin" for the creator; invited teammates get editor/viewer/
        // client_reviewer. So role === "owner" reliably means "this is my
        // own workspace", not a client's.
        isPersonal: role === "owner",
        brandingColor: ws.branding_color ?? null,
      }
    })

    return NextResponse.json({ workspaces: list })
  } catch (error) {
    const msg = (error as Error).message
    const status = msg === "auth_required" ? 401 : 500
    return NextResponse.json({ error: msg }, { status })
  }
}
