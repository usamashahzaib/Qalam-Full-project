import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireAdminRequest } from "@/lib/server/workspace"
import { createServiceClient } from "@/lib/server/supabase-rest"

const updateSchema = z.object({ id: z.string().uuid(), status: z.enum(["verified", "rejected", "suspended"]) })

export async function GET(request: NextRequest) {
  try { await requireAdminRequest(request) } catch { return NextResponse.json({ error: "not_found" }, { status: 404 }) }
  const { data, error } = await createServiceClient().from("career_organizations").select("*").order("created_at", { ascending: false }).limit(200)
  if (error) return NextResponse.json({ error: "Organizations could not be loaded." }, { status: 500 })
  return NextResponse.json({ organizations: data || [] })
}

export async function PATCH(request: NextRequest) {
  try { await requireAdminRequest(request) } catch { return NextResponse.json({ error: "not_found" }, { status: 404 }) }
  const parsed = updateSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "Check the verification request." }, { status: 400 })
  const verified = parsed.data.status === "verified"
  const { data, error } = await createServiceClient().from("career_organizations").update({ verification_status: parsed.data.status, verified_at: verified ? new Date().toISOString() : null, updated_at: new Date().toISOString() }).eq("id", parsed.data.id).select("*").single()
  if (error) return NextResponse.json({ error: "Organization could not be updated." }, { status: 500 })
  return NextResponse.json({ organization: data })
}
