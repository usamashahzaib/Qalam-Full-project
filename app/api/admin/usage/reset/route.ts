import { NextRequest, NextResponse } from "next/server"
import { requireAdminOps } from "@/lib/server/workspace"
import { supabaseInsert } from "@/lib/server/supabase-rest"
import { createServiceClient } from "@/lib/server/supabase-rest"

const USAGE_FIELDS = [
  "ai_drafts_used",
  "carousels_used",
  "hooks_used",
  "analyses_used",
  "competitor_runs_used",
  "comment_generations_used",
] as const

type UsageField = (typeof USAGE_FIELDS)[number]

type ResetInput = {
  userId: string
  targetEmail: string
  fields?: UsageField[]
}

const notFound = () => NextResponse.json({ error: "not_found" }, { status: 404 })

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
    admin = await requireAdminOps(request)
  } catch {
    return notFound()
  }

  const body = (await request.json()) as ResetInput
  if (!body.targetEmail) return NextResponse.json({ error: "missing_user" }, { status: 400 })

  const requestedFields = Array.isArray(body.fields) && body.fields.length
    ? body.fields.filter((field): field is UsageField => (USAGE_FIELDS as readonly string[]).includes(field))
    : [...USAGE_FIELDS]
  if (!requestedFields.length) return NextResponse.json({ error: "invalid_fields" }, { status: 400 })

  // Resolve to the canonical internal UUID (plus the external OAuth-sub key,
  // if any) the same way app/api/admin/overrides/route.ts does, since
  // plan_usage.user_id may be stored under either key.
  const supabase = createServiceClient()
  let canonicalUserId = body.userId
  let externalUserId: string | null = null
  try {
    const { data: resolvedUser } = await supabase
      .from("users")
      .select("id, external_user_id")
      .eq("email", body.targetEmail.trim().toLowerCase())
      .maybeSingle()
    if (resolvedUser?.id) {
      canonicalUserId = resolvedUser.id
      externalUserId = resolvedUser.external_user_id || null
    }
  } catch { /* fall back to provided userId */ }

  const targetIds = [...new Set([canonicalUserId, externalUserId].filter(Boolean))] as string[]
  if (!targetIds.length) return NextResponse.json({ error: "missing_user" }, { status: 400 })

  const { data: oldRows } = await supabase
    .from("plan_usage")
    .select(`user_id, ${requestedFields.join(", ")}`)
    .in("user_id", targetIds)

  const resetPayload = Object.fromEntries(requestedFields.map((field) => [field, 0]))
  const { error } = await supabase
    .from("plan_usage")
    .update({ ...resetPayload, updated_at: new Date().toISOString() })
    .in("user_id", targetIds)

  if (error) {
    return NextResponse.json({ error: "reset_failed" }, { status: 500 })
  }

  await writeAudit(admin.email, body.targetEmail, "reset_usage", oldRows || null, { fields: requestedFields })

  return NextResponse.json({ reset: true, fields: requestedFields })
}
