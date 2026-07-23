import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { withAuth } from "@/lib/server/auth"
import { requirePlan } from "@/lib/server/require-plan"
import { requireRole } from "@/lib/server/roles"
import { createServiceClient } from "@/lib/server/supabase-rest"

const schema = z.object({ archived: z.boolean() })

type Params = { params: Promise<{ id: string }> }

export async function PATCH(request: NextRequest, { params }: Params) {
  return withAuth(async (req) => {
    const planCheck = await requirePlan(req, "Agency")
    if (!planCheck.ok) return planCheck.response

    const { id: workspaceId } = await params

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
    const { error } = await supabase
      .from("workspaces")
      .update({ archived_at: parsed.data.archived ? new Date().toISOString() : null })
      .eq("id", workspaceId)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, archived: parsed.data.archived })
  })(request)
}
