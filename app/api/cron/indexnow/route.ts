import { NextResponse } from "next/server"
import { submitIndexNow } from "@/lib/server/indexnow"
import { verifyCronAuth } from "@/lib/server/verify-cron"

export async function GET(request: Request) {
  if (!verifyCronAuth(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const result = await submitIndexNow()
  return NextResponse.json(result, { status: result.ok ? 200 : 503 })
}
