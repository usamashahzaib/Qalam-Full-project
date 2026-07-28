import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { withAuth } from "@/lib/server/auth"
import { createServiceClient } from "@/lib/server/supabase-rest"
import { CAREER_ADD_ONS } from "@/lib/career-pricing"
import { requirePlan } from "@/lib/server/plan-limits-v2"
import { authorizeRole } from "@/lib/server/roles"

const keys = CAREER_ADD_ONS.map((item) => item.key)
const schema = z.object({
  workspaceKey: z.string().uuid().optional(),
  items: z.array(z.object({ key: z.string(), quantity: z.number().int().min(1).max(20) })).min(1).max(6),
})

export async function GET(request: NextRequest) {
  return withAuth(async (req, user) => {
    const { data } = await createServiceClient().from("career_addon_orders").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(30)
    return NextResponse.json({ orders: data || [] })
  })(request)
}

export async function POST(request: NextRequest) {
  return withAuth(async (req, user) => {
    const planCheck = await requirePlan(req, "Free")
    if (!planCheck.ok) return planCheck.response
    const roleError = await authorizeRole(req, planCheck.workspaceId, "editor")
    if (roleError) return roleError
    const parsed = schema.safeParse(await req.json().catch(() => null))
    if (!parsed.success || parsed.data.items.some((item) => !keys.includes(item.key as typeof keys[number]))) {
      return NextResponse.json({ error: "Check the selected add-ons." }, { status: 400 })
    }
    const rows = parsed.data.items.map((item) => {
      const product = CAREER_ADD_ONS.find((entry) => entry.key === item.key)!
      return {
        workspace_id: planCheck.workspaceId,
        user_id: user.id,
        addon_key: product.key,
        amount_pkr: product.price * item.quantity,
        quantity: item.quantity,
        status: "pending",
      }
    })
    const { data, error } = await createServiceClient().from("career_addon_orders").insert(rows).select("id, addon_key, amount_pkr, quantity, status")
    if (error) return NextResponse.json({ error: "Add-on order could not be created." }, { status: 500 })
    return NextResponse.json({ orders: data, total: rows.reduce((sum, row) => sum + row.amount_pkr, 0) }, { status: 201 })
  })(request)
}
