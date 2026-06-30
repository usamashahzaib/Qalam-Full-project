// Vercel Cron: every 5 minutes — see vercel.json
// AI generation runs synchronously in route handlers — there is no background job queue.
// This cron acts as a cleanup sweep: marks stale "queued" posts (older than 2 hours
// with no outcome) as "draft" so users can retry them.
export const maxDuration = 30

import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/server/supabase-rest"
import { env } from "@/lib/server/env"

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization")
  if (!env.cronSecret || authHeader !== `Bearer ${env.cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = createServiceClient()
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()

  // Mark any posts stuck in "queued" state for over 2 hours back to "draft"
  const { data, error } = await supabase
    .from("posts")
    .update({ status: "draft", updated_at: new Date().toISOString() })
    .eq("status", "queued")
    .lt("updated_at", twoHoursAgo)
    .select("id")

  if (error) {
    console.error("[cron/process-queue] cleanup error:", error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const recovered = data?.length ?? 0
  return NextResponse.json({ recovered, note: "Generation is synchronous. This cron recovers stale queued posts." })
}
