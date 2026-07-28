import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireAdminRequest } from "@/lib/server/workspace"
import { createServiceClient } from "@/lib/server/supabase-rest"

const schema = z.object({
  status: z.enum(["paid", "fulfilled", "cancelled", "refunded"]),
  paymentProvider: z.string().trim().max(80).optional(),
  providerReference: z.string().trim().max(200).optional(),
})

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    await requireAdminRequest(request)
  } catch {
    return NextResponse.json({ error: "not_found" }, { status: 404 })
  }
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "Invalid add-on status." }, { status: 400 })
  const { id } = await context.params
  const { data, error } = await createServiceClient().from("career_addon_orders").update({
    status: parsed.data.status,
    payment_provider: parsed.data.paymentProvider || null,
    provider_reference: parsed.data.providerReference || null,
    updated_at: new Date().toISOString(),
  }).eq("id", id).select("*").maybeSingle()
  if (error || !data) return NextResponse.json({ error: "Add-on order not found." }, { status: 404 })
  return NextResponse.json({ order: data })
}
