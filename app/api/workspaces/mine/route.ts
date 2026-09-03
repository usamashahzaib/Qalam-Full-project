import { NextResponse } from "next/server"
import { getWorkspaceSessionContext } from "@/lib/server/workspace"
import { supabaseSelect } from "@/lib/server/supabase-rest"
import { getCanonicalPlan } from "@/lib/server/plan-limits-v2"
import { getPlanLimits } from "@/lib/entitlements"

/**
 * Lists every workspace the current user belongs to, regardless of their own
 * plan tier. This covers invited members too - an editor or client reviewer added to a client
 * workspace has no Agency plan of their own but still needs to see and
 * switch into the workspace they were invited to.
 */
export async function GET() {
  try {
    const ctx = await getWorkspaceSessionContext()

    const [memberships, accountPlan] = await Promise.all([
      supabaseSelect<{ workspace_id: string; role: string }>(
        "workspace_members",
        `user_id=eq.${encodeURIComponent(ctx.supabaseUserId)}&select=workspace_id,role`
      ),
      getCanonicalPlan(ctx.supabaseUserId),
    ])
    const canCreateClientWorkspaces = getPlanLimits(accountPlan).clientWorkspaces !== 0
    const workspaceIds = [...new Set((memberships || []).map((m) => m.workspace_id).filter(Boolean))]
    if (!workspaceIds.length) {
      return NextResponse.json({ workspaces: [], accountPlan, canCreateClientWorkspaces })
    }

    const workspaces = await supabaseSelect<{
      id: string
      name: string
      owner_id: string | null
      branding_color: string | null
      workspace_type: "personal" | "client"
      archived_at: string | null
    }>(
      "workspaces",
      `id=in.(${workspaceIds.map(encodeURIComponent).join(",")})&archived_at=is.null&select=id,name,owner_id,branding_color,workspace_type,archived_at`
    )

    const roleByWorkspace = new Map((memberships || []).map((m) => [m.workspace_id, m.role]))
    const list = (workspaces || []).map((ws) => {
      const role = roleByWorkspace.get(ws.id) ?? "viewer"
      return {
        id: ws.id,
        name: ws.name,
        role,
        isPersonal: ws.workspace_type === "personal",
        brandingColor: ws.branding_color ?? null,
      }
    })

    return NextResponse.json({ workspaces: list, accountPlan, canCreateClientWorkspaces })
  } catch (error) {
    const msg = (error as Error).message
    const status = msg === "auth_required" ? 401 : 500
    return NextResponse.json({ error: msg }, { status })
  }
}
