import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { withAuth } from "@/lib/server/auth"
import { createServiceClient } from "@/lib/server/supabase-rest"
import { CAREER_PRODUCTS, getCareerProduct } from "@/lib/career-pricing"
import { isCareerAddonCheckoutConfigured } from "@/lib/server/lemonsqueezy-api"
import { requirePlan } from "@/lib/server/require-plan"
import { authorizeRole } from "@/lib/server/roles"

const keys = CAREER_PRODUCTS.map((item) => item.key)
const schema = z.object({
  workspaceKey: z.string().uuid().optional(),
  items: z.array(z.object({ key: z.string(), quantity: z.number().int().min(1).max(20) })).length(1),
})

export async function GET(request: NextRequest) {
  return withAuth(async (req, user) => {
    const supabase = createServiceClient()
    const [{ data }, { data: creditOrders }, { data: account }] = await Promise.all([
      supabase.from("career_addon_orders").select("*").eq("user_id", user.id).is("parent_order_id", null).order("created_at", { ascending: false }).limit(50),
      supabase.from("career_addon_orders").select("id, addon_key, product_key, quantity, credits_consumed, status, source_type, eligible_addons, expires_at, parent_order_id").eq("user_id", user.id).in("status", ["paid", "partially_consumed", "fulfilled"]).or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`).order("created_at", { ascending: true }).limit(100),
      supabase.from("users").select("plan, billing_cycle").eq("id", user.id).maybeSingle<{ plan: string; billing_cycle: string }>(),
    ])
    return NextResponse.json({ orders: data || [], creditOrders: creditOrders || [], plan: account?.plan || "Free", billingCycle: account?.billing_cycle || "monthly" })
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
    if (!isCareerAddonCheckoutConfigured()) {
      return NextResponse.json({ error: "Card checkout is not configured for one or more selected add-ons." }, { status: 503 })
    }
    const rows = parsed.data.items.map((item) => {
      const product = getCareerProduct(item.key)!
      return {
        workspace_id: planCheck.workspaceId,
        user_id: user.id,
        addon_key: product.key,
        product_key: product.key,
        amount_pkr: product.price * item.quantity,
        quantity: item.quantity,
        status: "pending",
        source_type: "purchase",
      }
    })
    const { data, error } = await createServiceClient().from("career_addon_orders").insert(rows).select("id, addon_key, amount_pkr, quantity, status")
    if (error) return NextResponse.json({ error: "Add-on order could not be created." }, { status: 500 })
    return NextResponse.json({ orders: data, total: rows.reduce((sum, row) => sum + row.amount_pkr, 0) }, { status: 201 })
  })(request)
}
