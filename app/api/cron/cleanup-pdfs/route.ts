import { NextRequest, NextResponse } from "next/server"
import { cleanupOldPdfs } from "@/lib/use-cases/cleanup-old-pdfs"

// Vercel Cron: runs daily at 02:00 UTC
// Add to vercel.json: { "crons": [{ "path": "/api/cron/cleanup-pdfs", "schedule": "0 2 * * *" }] }
export const maxDuration = 30

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const result = await cleanupOldPdfs()

  if (!result.ok) {
    return NextResponse.json({ error: result.error.message }, { status: 500 })
  }

  return NextResponse.json({ cleared: result.data.cleared, ok: true })
}
