import { NextRequest, NextResponse } from "next/server"
import { requireAuthApi } from "@/lib/server/auth"
import { createServiceClient } from "@/lib/server/supabase-rest"

const VALID_ROLES = [
  "HR Professional",
  "Marketing Professional",
  "Founder / Entrepreneur",
  "Consultant",
  "Content Creator",
  "Other",
]

export async function PUT(req: NextRequest) {
  const { userId, error } = await requireAuthApi(req)
  if (error) return error

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 })
  }

  const name = String(body.name ?? "").trim()
  const role = body.role !== undefined ? String(body.role).trim() : undefined

  if (!name || name.length < 2) {
    return NextResponse.json({ error: "Name must be at least 2 characters." }, { status: 400 })
  }
  if (role !== undefined && role !== "" && !VALID_ROLES.includes(role)) {
    return NextResponse.json({ error: "Invalid role." }, { status: 400 })
  }

  const supabase = createServiceClient()
  const updateData: Record<string, string> = {
    full_name: name,
    updated_at: new Date().toISOString(),
  }
  if (role !== undefined) updateData.role = role

  const { error: updateErr } = await supabase
    .from("users")
    .update(updateData)
    .eq("id", userId!)

  if (updateErr) {
    console.error("[update-account] error:", updateErr)
    return NextResponse.json({ error: "Failed to update account." }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
