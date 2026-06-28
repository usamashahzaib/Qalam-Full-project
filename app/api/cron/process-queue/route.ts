import { NextResponse } from "next/server"
import { env } from "@/lib/server/env"

export const maxDuration = 30

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization")
  if (!env.cronSecret || authHeader !== `Bearer ${env.cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Queue not yet implemented — all generation runs synchronously in route handlers.
  return NextResponse.json({ processed: 0, note: "queue not yet implemented" })
}
