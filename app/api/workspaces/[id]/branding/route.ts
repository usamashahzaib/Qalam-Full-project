import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { withAuth } from "@/lib/server/auth"
import { requirePlan } from "@/lib/server/require-plan"
import { requireRole } from "@/lib/server/roles"
import { createServiceClient } from "@/lib/server/supabase-rest"

const schema = z.object({
  // null clears back to the default Qalam teal.
  brandingColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Must be a hex color like #0D4A45").nullable(),
})

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
      .update({ branding_color: parsed.data.brandingColor })
      .eq("id", workspaceId)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, brandingColor: parsed.data.brandingColor })
  })(request)
}
