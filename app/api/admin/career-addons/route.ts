import { NextRequest, NextResponse } from "next/server"
import { requireAdminRequest } from "@/lib/server/workspace"
import { createServiceClient } from "@/lib/server/supabase-rest"

export async function GET(request: NextRequest) {
  try {
    await requireAdminRequest(request)
  } catch {
    return NextResponse.json({ error: "not_found" }, { status: 404 })
  }
  const { data, error } = await createServiceClient()
    .from("career_addon_orders")
    .select("id, user_id, addon_key, product_key, source_type, parent_order_id, amount_pkr, quantity, credits_consumed, status, payment_provider, provider_reference, expires_at, consumed_at, created_at")
    .order("created_at", { ascending: false })
    .limit(200)
  if (error) return NextResponse.json({ error: "Orders could not be loaded." }, { status: 500 })
  return NextResponse.json({ orders: data || [] })
}
