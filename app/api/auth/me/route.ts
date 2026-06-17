import { NextRequest, NextResponse } from "next/server"
import { requireAuthApi } from "@/lib/server/auth"
import { createServiceClient } from "@/lib/server/supabase-rest"
import { log } from "@/lib/server/logging"
import { resolvePlanExpiry } from "@/lib/plan-expiry"

export async function GET(req: NextRequest) {
  const { userId, externalUserId, error } = await requireAuthApi(req)
  if (error) return error

  const supabase = createServiceClient()
  const { data: user } = await supabase
    .from("users")
    .select("id, email, full_name, role, auth_provider, email_verified, image_url, plan_expires_at, created_at")
    .eq("id", userId!)
    .maybeSingle()

  if (!user) {
    log.warn("auth.me.user_not_found", { userId })
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  const { data: planUsage } = await supabase
    .from("plan_usage")
    .select("plan, cycle_start, cycle_end")
    .eq("user_id", externalUserId!)
    .maybeSingle()

  const { data: payment } = await supabase
    .from("payments")
    .select("created_at, processed_at")
    .eq("user_id", userId!)
    .eq("status", "paid")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  const boughtAt = payment?.processed_at || payment?.created_at || planUsage?.cycle_start || (user as { created_at?: string | null }).created_at || null
  const planExpiresAt = resolvePlanExpiry((user as { plan_expires_at?: string | null }).plan_expires_at || planUsage?.cycle_end, boughtAt)

  log.info("auth.me.ok", { userId, plan: planUsage?.plan ?? "free" })
  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.full_name,
      role: user.role,
      authProvider: user.auth_provider,
      emailVerified: user.email_verified,
      avatarUrl: user.image_url,
      plan: planUsage?.plan ?? "free",
      planCycleEnd: planUsage?.cycle_end ?? null,
      planExpiresAt,
    },
  })
}
