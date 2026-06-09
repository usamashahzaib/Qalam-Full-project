import { NextRequest, NextResponse } from "next/server"
import { requireAuthApi } from "@/lib/server/auth"
import { createServiceClient } from "@/lib/server/supabase-rest"

export async function GET(req: NextRequest) {
  const { userId, error } = await requireAuthApi(req)
  if (error) return error

  const supabase = createServiceClient()
  const { data: user } = await supabase
    .from("users")
    .select("id, email, name, role, auth_provider, email_verified, avatar_url")
    .eq("id", userId!)
    .maybeSingle()

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  const { data: planUsage } = await supabase
    .from("plan_usage")
    .select("plan, cycle_end")
    .eq("user_id", userId!)
    .maybeSingle()

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      authProvider: user.auth_provider,
      emailVerified: user.email_verified,
      avatarUrl: user.avatar_url,
      plan: planUsage?.plan ?? "free",
      planCycleEnd: planUsage?.cycle_end ?? null,
    },
  })
}
