import { NextRequest, NextResponse } from "next/server"
import { requireAdminOps } from "@/lib/server/workspace"
import { supabaseDelete, supabaseInsert, supabaseSelect, supabaseUpsert } from "@/lib/server/supabase-rest"
import { createServiceClient } from "@/lib/server/supabase-rest"

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
    admin = await requireAdminOps(request)
  } catch {
    return notFound()
  }

  const body = (await request.json()) as OverrideInput
  if (!body.targetEmail) return NextResponse.json({ error: "missing_user" }, { status: 400 })

  // Resolve body.userId to the canonical internal UUID using the target email.
  // The admin panel now sends the internal UUID, but older overrides may have been
  // stored under the OAuth sub (external_user_id). Canonicalizing here ensures all
  // operations use a stable key and cleans up any stale external-ID-based override.
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

  // Clean up any override stored under the external (OAuth sub) key so both IDs
  // don't exist simultaneously - keeps lookup deterministic.
  if (externalUserId && externalUserId !== canonicalUserId) {
    try { await supabase.from("user_overrides").delete().eq("user_id", externalUserId) } catch { /* non-fatal */ }
    try { await supabase.from("plan_usage").delete().eq("user_id", externalUserId) } catch { /* non-fatal */ }
  }

  const oldValue = await getOldOverride(canonicalUserId)
  const payload = {
    user_id: canonicalUserId,
    plan_override: body.planOverride ? body.planOverride.charAt(0).toUpperCase() + body.planOverride.slice(1).toLowerCase() : null,
    draft_limit_override: body.draftLimitOverride ?? null,
    workspace_limit_override: body.workspaceLimitOverride ?? null,
    feature_flags: body.featureFlags || {},
    notes: body.notes || null,
    expires_at: body.expiresAt || null,
    updated_at: new Date().toISOString(),
  }
  const rows = await supabaseUpsert("user_overrides", payload, "user_id")
  await writeAudit(admin.email, body.targetEmail, "set_override", oldValue, payload)

  // Sync plan_usage.plan and users.plan so all read paths see the override immediately.
  if (body.planOverride) {
    try {
      await Promise.all([
        supabase
          .from("plan_usage")
          .upsert({ user_id: canonicalUserId, plan: body.planOverride.toLowerCase() }, { onConflict: "user_id" }),
        supabase
          .from("users")
          .update({
            plan: body.planOverride,
            plan_expires_at: body.expiresAt || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", canonicalUserId),
      ])
    } catch { /* non-fatal */ }
  }

  return NextResponse.json({ override: rows?.[0] || payload })
}

export async function PATCH(request: NextRequest) {
  let admin
  try {
    admin = await requireAdminOps(request)
  } catch {
    return notFound()
  }

  const body = (await request.json()) as Pick<OverrideInput, "userId" | "targetEmail">
  if (!body.userId || !body.targetEmail) return NextResponse.json({ error: "missing_user" }, { status: 400 })

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

  const oldValue = await getOldOverride(canonicalUserId)
  const payload = {
    user_id: canonicalUserId,
    plan_override: null,
    draft_limit_override: null,
    workspace_limit_override: null,
    feature_flags: {},
    notes: null,
    expires_at: null,
    updated_at: new Date().toISOString(),
  }
  const rows = await supabaseUpsert("user_overrides", payload, "user_id")
  // Also wipe any override stored under the external ID
  if (externalUserId && externalUserId !== canonicalUserId) {
    try { await supabase.from("user_overrides").delete().eq("user_id", externalUserId) } catch { /* non-fatal */ }
  }
  await writeAudit(admin.email, body.targetEmail, "reset_to_plan_defaults", oldValue, payload)

  // Reset plan_usage.plan and users.plan to free when override is cleared
  try {
    const cleanIds = [canonicalUserId, externalUserId].filter(Boolean) as string[]
    await Promise.all([
      ...cleanIds.map((uid) => supabase.from("plan_usage").update({ plan: "free" }).eq("user_id", uid)),
      supabase
        .from("users")
        .update({ plan: "Free", plan_expires_at: null, updated_at: new Date().toISOString() })
        .eq("id", canonicalUserId),
    ])
  } catch { /* non-fatal */ }

  return NextResponse.json({ override: rows?.[0] || payload })
}

export async function DELETE(request: NextRequest) {
  let admin
  try {
    admin = await requireAdminOps(request)
  } catch {
    return notFound()
  }

  const body = (await request.json()) as Pick<OverrideInput, "userId" | "targetEmail">
  if (!body.userId || !body.targetEmail) return NextResponse.json({ error: "missing_user" }, { status: 400 })

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

  const oldValue = await getOldOverride(canonicalUserId)
  // Delete override under both possible keys
  const idsToDelete = [...new Set([canonicalUserId, externalUserId].filter(Boolean))] as string[]
  await Promise.all(
    idsToDelete.map((uid) => supabaseDelete("user_overrides", `user_id=eq.${encodeURIComponent(uid)}`).catch(() => undefined))
  )
  await writeAudit(admin.email, body.targetEmail, "delete_override", oldValue, null)

  // Reset plan_usage.plan and users.plan to free when override is deleted
  try {
    const cleanIds = [canonicalUserId, externalUserId].filter(Boolean) as string[]
    await Promise.all([
      ...cleanIds.map((uid) => supabase.from("plan_usage").update({ plan: "free" }).eq("user_id", uid)),
      supabase
        .from("users")
        .update({ plan: "Free", plan_expires_at: null, updated_at: new Date().toISOString() })
        .eq("id", canonicalUserId),
    ])
  } catch { /* non-fatal */ }

  return NextResponse.json({ deleted: true })
}
