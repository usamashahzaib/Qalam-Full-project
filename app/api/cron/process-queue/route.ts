import { NextResponse } from "next/server"
import { env } from "@/lib/server/env"
import { processQueue } from "@/lib/server/queue-processor"

export const maxDuration = 30

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization")
  if (!env.cronSecret || authHeader !== `Bearer ${env.cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const result = await processQueue()
  return NextResponse.json(result)
}
