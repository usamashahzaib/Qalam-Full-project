import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { withAuth } from "@/lib/server/auth"
import { requirePlan } from "@/lib/server/require-plan"
import { requireRole } from "@/lib/server/roles"
import { createServiceClient, supabaseSelect } from "@/lib/server/supabase-rest"
import { getCanonicalPlan } from "@/lib/server/plan-limits-v2"
import { getPlanLimits } from "@/lib/entitlements"
import { POOL_RPC_ARGS } from "@/lib/server/agency/pool"

const schema = z.object({ archived: z.boolean() })
const paramsSchema = z.object({ id: z.string().uuid() })

type Params = { params: Promise<{ id: string }> }

export async function PATCH(request: NextRequest, { params }: Params) {
  return withAuth(async (req) => {
    const parsedParams = paramsSchema.safeParse(await params)
    if (!parsedParams.success) return NextResponse.json({ error: "invalid_workspace" }, { status: 400 })
    const workspaceId = parsedParams.data.id
    const planCheck = await requirePlan(req, "Agency", workspaceId)
    if (!planCheck.ok) return planCheck.response

    try {
      await requireRole(req, workspaceId, "admin")
    } catch {
      return NextResponse.json({ error: "forbidden" }, { status: 403 })
    }

    let body: unknown
    try { body = await req.json() } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
    }

    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 })
    }

    const supabase = createServiceClient()

    // Restoring an archived client re-occupies a slot and a share of the pool.
    // Both are re-checked in one locked database call, so a restore cannot race
    // a concurrent create or restore past the plan's client-workspace cap, and
    // the restored workspace is fitted into whatever share of the pool is free.
    if (!parsed.data.archived) {
      const rows = await supabaseSelect<{ owner_id: string | null }>(
        "workspaces",
        `id=eq.${encodeURIComponent(workspaceId)}&workspace_type=eq.client&select=owner_id&limit=1`
      )
      const ownerId = rows?.[0]?.owner_id
      if (!ownerId) return NextResponse.json({ error: "workspace_not_found" }, { status: 404 })

      const limit = getPlanLimits(await getCanonicalPlan(ownerId)).clientWorkspaces
      const { error } = await supabase.rpc("restore_client_workspace", {
        p_workspace_id: workspaceId,
        p_max_clients: limit === "unlimited" ? null : limit,
        ...POOL_RPC_ARGS,
      })
      if (error) {
        const message = error.message || ""
        if (message.includes("client_workspace_limit_reached")) {
          return NextResponse.json(
            { error: "workspace_limit_reached", featureName: "clientWorkspaces", limit },
            { status: 403 }
          )
        }
        if (message.includes("workspace_not_found")) return NextResponse.json({ error: "workspace_not_found" }, { status: 404 })
        return NextResponse.json({ error: message || "workspace_restore_failed" }, { status: 500 })
      }
      return NextResponse.json({ ok: true, archived: false })
    }

    const { data, error } = await supabase
      .from("workspaces")
      .update({ archived_at: parsed.data.archived ? new Date().toISOString() : null })
      .eq("id", workspaceId)
      .eq("workspace_type", "client")
      .select("id")
      .maybeSingle()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!data) return NextResponse.json({ error: "workspace_not_found" }, { status: 404 })
    return NextResponse.json({ ok: true, archived: parsed.data.archived })
  })(request)
}
