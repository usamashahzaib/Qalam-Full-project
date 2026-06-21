import { NextResponse } from "next/server"
import { sendExpiryReminders } from "@/lib/server/plan-expiry"
import { env } from "@/lib/server/env"

export async function GET(request: Request) {
  const authHeader = request.headers.get("Authorization")
  if (!env.cronSecret || authHeader !== `Bearer ${env.cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const result = await sendExpiryReminders()
  return NextResponse.json(result)
}
