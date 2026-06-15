import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/server/workspace"
import { SupabasePlanUsageRepository } from "@/lib/repositories/supabase/SupabasePlanUsageRepository"

const usageRepo = new SupabasePlanUsageRepository()

export async function GET() {
  try {
    const userId = await requireAuth()

    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

    const rows = await usageRepo.getDailyActivity(userId, monthStart)

    const today = now.getDate()
    const usage = Array.from({ length: today }, (_, i) => i + 1).map((day) => ({
      day,
      draftsUsed: rows.filter((r) => new Date(r.created_at).getDate() === day).length,
    }))

    return NextResponse.json(usage)
  } catch (err) {
    const msg = (err as Error).message
    return NextResponse.json(
      { error: msg },
      { status: msg === "auth_required" ? 401 : 500 }
    )
  }
}
