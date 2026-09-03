import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { withAuth } from "@/lib/server/auth"
import { requirePlan } from "@/lib/server/require-plan"
import { requireRole } from "@/lib/server/roles"
import { createServiceClient } from "@/lib/server/supabase-rest"

const paramsSchema = z.object({ id: z.string().uuid() })
const updateSchema = z.object({
  clientName: z.string().trim().min(2).max(100),
  primaryContactName: z.string().trim().max(100).nullable().optional(),
  primaryContactEmail: z.union([z.literal(""), z.string().trim().email().max(254), z.null()]).optional(),
})

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return withAuth(async (req) => {
    const parsedParams = paramsSchema.safeParse(await context.params)
    if (!parsedParams.success) {
      return NextResponse.json({ error: "invalid_workspace" }, { status: 400 })
    }
    const workspaceId = parsedParams.data.id
    const planCheck = await requirePlan(req, "Agency", workspaceId)
    if (!planCheck.ok) return planCheck.response

    try {
      await requireRole(req, workspaceId, "admin")
    } catch {
      return NextResponse.json({ error: "forbidden" }, { status: 403 })
    }

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
    }
    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 })
    }

    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from("workspaces")
      .update({
        name: parsed.data.clientName,
        client_contact_name: parsed.data.primaryContactName || null,
        client_contact_email: parsed.data.primaryContactEmail || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", workspaceId)
      .eq("workspace_type", "client")
      .select("id, name, client_contact_name, client_contact_email")
      .maybeSingle()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!data) return NextResponse.json({ error: "workspace_not_found" }, { status: 404 })
    return NextResponse.json({
      client: {
        id: data.id,
        client_name: data.name,
        clientContactName: data.client_contact_name,
        clientContactEmail: data.client_contact_email,
      },
    })
  })(request)
}
