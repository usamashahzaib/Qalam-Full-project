import { NextRequest, NextResponse } from "next/server"
import { getAuthenticatedSession } from "@/lib/server/auth-helpers"
import { supabaseDelete, supabaseInsert, supabaseSelect, supabaseUpsert } from "@/lib/server/supabase-rest"

type OverrideInput = {
  userId: string
  targetEmail: string
  planOverride: string | null
  draftLimitOverride: number | null
  workspaceLimitOverride: number | null
  featureFlags: Record<string, boolean>
  notes?: string | null
  expiresAt?: string | null
}

const notFound = () => NextResponse.json({ error: "not_found" }, { status: 404 })
const requireAdmin = async () => {
  const session = await getAuthenticatedSession()
  if (!session?.user?.id) throw new Error("Unauthorized")
  const adminEmails = (process.env.ADMIN_EMAILS || process.env.APP_ADMIN_EMAILS || "").split(",").map((v) => v.trim().toLowerCase())
  if (!adminEmails.includes(String(session.user.email || "").toLowerCase())) throw new Error("Forbidden")
  return { email: session.user.email || "", userId: session.user.id }
}

const getOldOverride = (userId: string) =>
  supabaseSelect("user_overrides", `user_id=eq.${encodeURIComponent(userId)}&select=*&limit=1`).then((rows) => rows?.[0] || null).catch(() => null)

const writeAudit = (adminEmail: string, targetEmail: string, action: string, oldValue: unknown, newValue: unknown) =>
  supabaseInsert("admin_audit_log", {
    admin_email: adminEmail,
    target_user_email: targetEmail,
    action,
    old_value: oldValue,
    new_value: newValue,
    created_at: new Date().toISOString(),
  }, "return=minimal").catch(() => undefined)

export async function POST(request: NextRequest) {
  let admin
  try {
    admin = await requireAdmin()
  } catch {
    return notFound()
  }

  const body = (await request.json()) as OverrideInput
  if (!body.userId || !body.targetEmail) return NextResponse.json({ error: "missing_user" }, { status: 400 })
  const oldValue = await getOldOverride(body.userId)
  const payload = {
    user_id: body.userId,
    plan_override: body.planOverride || null,
    draft_limit_override: body.draftLimitOverride ?? null,
    workspace_limit_override: body.workspaceLimitOverride ?? null,
    feature_flags: body.featureFlags || {},
    notes: body.notes || null,
    expires_at: body.expiresAt || null,
    updated_at: new Date().toISOString(),
  }
  const rows = await supabaseUpsert("user_overrides", payload, "user_id")
  await writeAudit(admin.email, body.targetEmail, "set_override", oldValue, payload)
  return NextResponse.json({ override: rows?.[0] || payload })
}

export async function PATCH(request: NextRequest) {
  let admin
  try {
    admin = await requireAdmin()
  } catch {
    return notFound()
  }

  const body = (await request.json()) as Pick<OverrideInput, "userId" | "targetEmail">
  if (!body.userId || !body.targetEmail) return NextResponse.json({ error: "missing_user" }, { status: 400 })
  const oldValue = await getOldOverride(body.userId)
  const payload = {
    user_id: body.userId,
    plan_override: null,
    draft_limit_override: null,
    workspace_limit_override: null,
    feature_flags: {},
    notes: null,
    expires_at: null,
    updated_at: new Date().toISOString(),
  }
  const rows = await supabaseUpsert("user_overrides", payload, "user_id")
  await writeAudit(admin.email, body.targetEmail, "reset_to_plan_defaults", oldValue, payload)
  return NextResponse.json({ override: rows?.[0] || payload })
}

export async function DELETE(request: NextRequest) {
  let admin
  try {
    admin = await requireAdmin()
  } catch {
    return notFound()
  }

  const body = (await request.json()) as Pick<OverrideInput, "userId" | "targetEmail">
  if (!body.userId || !body.targetEmail) return NextResponse.json({ error: "missing_user" }, { status: 400 })
  const oldValue = await getOldOverride(body.userId)
  await supabaseDelete("user_overrides", `user_id=eq.${encodeURIComponent(body.userId)}`)
  await writeAudit(admin.email, body.targetEmail, "delete_override", oldValue, null)
  return NextResponse.json({ deleted: true })
}
